<?php

namespace App\Services\Cash;

use App\Models\CashMethod;
use App\Models\CashTransaction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class LedgerBalanceService
{
    public function openingBalance(Request $request, TransactionQueryService $queryService): int
    {
        $startDate = $request->input('start_date');
        if (! $startDate) {
            return 0;
        }

        $query = CashTransaction::query();
        $queryService->applyFilters($query, $request, false);

        $start = Carbon::parse($startDate)->startOfDay();
        $query->where('tx_date', '<', $start);

        return $this->netFromQuery($query);
    }

    public function openingBalanceByMethod(Request $request, TransactionQueryService $queryService): array
    {
        $startDate = $request->input('start_date');
        if (! $startDate) {
            return [];
        }

        $query = CashTransaction::query();
        $queryService->applyFilters($query, $request, false);

        $start = Carbon::parse($startDate)->startOfDay();
        $query->where('tx_date', '<', $start);

        return $query
            ->selectRaw('method_id, SUM(CASE WHEN type = "in" THEN amount ELSE 0 END) as total_in, SUM(CASE WHEN type = "out" THEN amount ELSE 0 END) as total_out')
            ->groupBy('method_id')
            ->get()
            ->mapWithKeys(function ($row) {
                $net = (int) $row->total_in - (int) $row->total_out;
                return [$row->method_id => $net];
            })
            ->all();
    }

    public function offsetBalance(Builder $sortedQuery, int $page, int $perPage): int
    {
        $offset = max(($page - 1) * $perPage, 0);

        if ($offset === 0) {
            return 0;
        }

        $priorRows = (clone $sortedQuery)
            ->limit($offset)
            ->get(['type', 'amount']);

        return $priorRows->reduce(function ($carry, $row) {
            $delta = $row->type === 'in' ? $row->amount : -$row->amount;
            return $carry + $delta;
        }, 0);
    }

    public function totals(Request $request, TransactionQueryService $queryService): array
    {
        $query = CashTransaction::query();
        $queryService->applyFilters($query, $request, true);

        $totals = $query->selectRaw('SUM(CASE WHEN type = "in" THEN amount ELSE 0 END) as total_in, SUM(CASE WHEN type = "out" THEN amount ELSE 0 END) as total_out')
            ->first();

        $totalIn = (int) ($totals->total_in ?? 0);
        $totalOut = (int) ($totals->total_out ?? 0);
        $netCash = $this->netCashOnly($query);

        return [
            'total_in' => $totalIn,
            'total_out' => $totalOut,
            'net' => $totalIn - $totalOut,
            'net_cash' => $netCash,
        ];
    }

    private function netCashOnly(Builder $query): int
    {
        $cashMethodId = CashMethod::query()
            ->whereRaw('LOWER(name) in (?, ?)', ['cash', 'kas'])
            ->value('id');

        if (! $cashMethodId) {
            return 0;
        }

        $cashQuery = (clone $query)->where('method_id', $cashMethodId);

        return $this->netFromQuery($cashQuery);
    }

    private function netFromQuery(Builder $query): int
    {
        $totals = $query
            ->selectRaw('SUM(CASE WHEN type = "in" THEN amount ELSE 0 END) as total_in, SUM(CASE WHEN type = "out" THEN amount ELSE 0 END) as total_out')
            ->first();

        return (int) ($totals->total_in ?? 0) - (int) ($totals->total_out ?? 0);
    }
}
