<?php

namespace App\Services\Cash;

use App\Models\CashTransaction;
use Illuminate\Support\Facades\DB;

class CashReportService
{
    public function __construct(private readonly TransactionQueryService $transactionQuery)
    {
    }

    public function build(array $filters): array
    {
        $startDate = $filters['start_date'] ?? null;
        $endDate = $filters['end_date'] ?? null;
        $categoryId = $filters['category_id'] ?? null;
        $methodId = $filters['method_id'] ?? null;
        $includeDues = (bool) ($filters['include_dues'] ?? true);

        $baseQuery = CashTransaction::query()->validForFinance();

        if (! $includeDues) {
            $baseQuery->whereNull('dues_payment_id');
        }

        if ($categoryId) {
            $baseQuery->where('category_id', $categoryId);
        }

        if ($methodId) {
            $baseQuery->where('method_id', $methodId);
        }

        $rangeQuery = clone $baseQuery;
        if ($startDate) {
            $rangeQuery->where('tx_date', '>=', $this->transactionQuery->startOfReportDay($startDate));
        }
        if ($endDate) {
            $rangeQuery->where('tx_date', '<=', $this->transactionQuery->endOfReportDay($endDate));
        }

        $totals = $this->totals($rangeQuery);
        $openingBalance = $this->openingBalance($baseQuery, $startDate);
        $closingBalance = $openingBalance + $totals['net'];

        $monthly = $this->monthly($rangeQuery, $openingBalance);
        $byCategory = $this->byCategory($rangeQuery);
        $byMethod = $this->byMethod($rangeQuery);

        return [
            'totals' => $totals,
            'opening_balance' => $openingBalance,
            'closing_balance' => $closingBalance,
            'monthly' => $monthly,
            'by_category' => $byCategory,
            'by_method' => $byMethod,
        ];
    }

    private function totals($query): array
    {
        $summary = (clone $query)
            ->selectRaw('SUM(CASE WHEN type = "in" THEN amount ELSE 0 END) as total_in, SUM(CASE WHEN type = "out" THEN amount ELSE 0 END) as total_out')
            ->first();

        $totalIn = (int) ($summary->total_in ?? 0);
        $totalOut = (int) ($summary->total_out ?? 0);

        return [
            'total_in' => $totalIn,
            'total_out' => $totalOut,
            'net' => $totalIn - $totalOut,
        ];
    }

    private function openingBalance($query, ?string $startDate): int
    {
        if (! $startDate) {
            return 0;
        }

        $summary = (clone $query)
            ->where('tx_date', '<', $this->transactionQuery->startOfReportDay($startDate))
            ->selectRaw('SUM(CASE WHEN type = "in" THEN amount ELSE 0 END) as total_in, SUM(CASE WHEN type = "out" THEN amount ELSE 0 END) as total_out')
            ->first();

        return (int) ($summary->total_in ?? 0) - (int) ($summary->total_out ?? 0);
    }

    private function monthly($query, int $openingBalance): array
    {
        $rows = (clone $query)
            ->selectRaw($this->monthPeriodExpression('tx_date').' as period')
            ->selectRaw('SUM(CASE WHEN type = "in" THEN amount ELSE 0 END) as total_in')
            ->selectRaw('SUM(CASE WHEN type = "out" THEN amount ELSE 0 END) as total_out')
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        $running = $openingBalance;

        return $rows->map(function ($row) use (&$running) {
            $totalIn = (int) $row->total_in;
            $totalOut = (int) $row->total_out;
            $net = $totalIn - $totalOut;
            $running += $net;

            return [
                'period' => $row->period,
                'total_in' => $totalIn,
                'total_out' => $totalOut,
                'net' => $net,
                'closing_balance' => $running,
            ];
        })->all();
    }

    private function byCategory($query): array
    {
        return (clone $query)
            ->join('cash_categories', 'cash_categories.id', '=', 'cash_transactions.category_id')
            ->selectRaw('cash_categories.id, cash_categories.name')
            ->selectRaw('SUM(CASE WHEN cash_transactions.type = "in" THEN cash_transactions.amount ELSE 0 END) as total_in')
            ->selectRaw('SUM(CASE WHEN cash_transactions.type = "out" THEN cash_transactions.amount ELSE 0 END) as total_out')
            ->groupBy('cash_categories.id', 'cash_categories.name')
            ->orderBy('cash_categories.name')
            ->get()
            ->map(function ($row) {
                $totalIn = (int) $row->total_in;
                $totalOut = (int) $row->total_out;
                return [
                    'id' => $row->id,
                    'name' => $row->name,
                    'total_in' => $totalIn,
                    'total_out' => $totalOut,
                    'net' => $totalIn - $totalOut,
                ];
            })
            ->all();
    }

    private function byMethod($query): array
    {
        return (clone $query)
            ->leftJoin('cash_methods', 'cash_methods.id', '=', 'cash_transactions.method_id')
            ->selectRaw('cash_methods.id, cash_methods.name')
            ->selectRaw('SUM(CASE WHEN cash_transactions.type = "in" THEN cash_transactions.amount ELSE 0 END) as total_in')
            ->selectRaw('SUM(CASE WHEN cash_transactions.type = "out" THEN cash_transactions.amount ELSE 0 END) as total_out')
            ->groupBy('cash_methods.id', 'cash_methods.name')
            ->orderBy('cash_methods.name')
            ->get()
            ->map(function ($row) {
                $totalIn = (int) $row->total_in;
                $totalOut = (int) $row->total_out;
                return [
                    'id' => $row->id,
                    'name' => $row->name ?? 'Tanpa Metode',
                    'total_in' => $totalIn,
                    'total_out' => $totalOut,
                    'net' => $totalIn - $totalOut,
                ];
            })
            ->all();
    }

    private function monthPeriodExpression(string $column): string
    {
        return DB::connection()->getDriverName() === 'sqlite'
            ? sprintf("strftime('%%Y-%%m', %s)", $column)
            : sprintf("DATE_FORMAT(%s, '%%Y-%%m')", $column);
    }
}
