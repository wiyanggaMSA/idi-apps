<?php

namespace App\Services\Cash;

use App\Models\CashTransaction;
use App\Models\DuesInvoice;
use App\Models\DuesPayment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class FinancialSummaryService
{
    public function __construct(private readonly TransactionQueryService $transactionQuery)
    {
    }

    public function build(array $filters): array
    {
        $startDate = $filters['start_date'] ?? null;
        $endDate = $filters['end_date'] ?? null;
        $divisionId = $filters['division_id'] ?? null;
        $includeDuesInCash = (bool) ($filters['include_dues_in_cash'] ?? true);

        $cashQuery = CashTransaction::query()->validForFinance();
        if (! $includeDuesInCash) {
            $cashQuery->whereNull('dues_payment_id');
        }

        if ($startDate) {
            $cashQuery->where('tx_date', '>=', $this->transactionQuery->startOfReportDay($startDate));
        }
        if ($endDate) {
            $cashQuery->where('tx_date', '<=', $this->transactionQuery->endOfReportDay($endDate));
        }

        $cashTotals = $this->cashTotals($cashQuery);
        $openingBalance = $this->openingBalance($filters);
        $closingBalance = $openingBalance + $cashTotals['net'];

        $dues = $this->duesTotals($startDate, $endDate, $divisionId);

        return [
            'cash' => [
                'total_in' => $cashTotals['total_in'],
                'total_out' => $cashTotals['total_out'],
                'net' => $cashTotals['net'],
                'opening_balance' => $openingBalance,
                'closing_balance' => $closingBalance,
                'include_dues_in_cash' => $includeDuesInCash,
            ],
            'dues' => $dues,
            'charts' => $this->monthlyCombined($startDate, $endDate, $divisionId),
            'top_expenses' => $this->topExpenses($startDate, $endDate),
            'top_arrears' => $this->topArrears($startDate, $endDate, $divisionId),
        ];
    }

    private function cashTotals($query): array
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

    private function openingBalance(array $filters): int
    {
        $startDate = $filters['start_date'] ?? null;
        $includeDues = (bool) ($filters['include_dues_in_cash'] ?? true);

        if (! $startDate) {
            return 0;
        }

        $query = CashTransaction::query()->validForFinance();
        if (! $includeDues) {
            $query->whereNull('dues_payment_id');
        }

        $summary = $query
            ->where('tx_date', '<', $this->transactionQuery->startOfReportDay($startDate))
            ->selectRaw('SUM(CASE WHEN type = "in" THEN amount ELSE 0 END) as total_in, SUM(CASE WHEN type = "out" THEN amount ELSE 0 END) as total_out')
            ->first();

        return (int) ($summary->total_in ?? 0) - (int) ($summary->total_out ?? 0);
    }

    private function duesTotals(?string $startDate, ?string $endDate, ?int $divisionId): array
    {
        $invoiceQuery = DuesInvoice::query()->with('member');

        if ($divisionId) {
            $invoiceQuery->whereHas('member', fn ($query) => $query->where('division_id', $divisionId));
        }

        if ($startDate) {
            $invoiceQuery->where('due_date', '>=', $this->transactionQuery->startOfReportDay($startDate));
        }
        if ($endDate) {
            $invoiceQuery->where('due_date', '<=', $this->transactionQuery->endOfReportDay($endDate));
        }

        $invoiceSummary = (clone $invoiceQuery)
            ->selectRaw('SUM(amount_due) as total_due, SUM(amount_paid) as total_paid')
            ->first();

        $paymentsQuery = DuesPayment::query()->whereNull('voided_at');
        if ($divisionId) {
            $paymentsQuery->whereHas('member', fn ($query) => $query->where('division_id', $divisionId));
        }
        if ($startDate) {
            $paymentsQuery->where('paid_at', '>=', $this->transactionQuery->startOfReportDay($startDate));
        }
        if ($endDate) {
            $paymentsQuery->where('paid_at', '<=', $this->transactionQuery->endOfReportDay($endDate));
        }

        $collected = (int) $paymentsQuery->sum('amount');

        $billed = (int) ($invoiceSummary->total_due ?? 0);
        $paid = (int) ($invoiceSummary->total_paid ?? 0);
        $outstanding = max($billed - $paid, 0);

        return [
            'billed' => $billed,
            'collected' => $collected,
            'outstanding' => $outstanding,
        ];
    }

    private function monthlyCombined(?string $startDate, ?string $endDate, ?int $divisionId): array
    {
        if (! $startDate || ! $endDate) {
            return [];
        }

        $start = Carbon::parse($startDate, $this->transactionQuery->reportTimezone())->startOfMonth();
        $end = Carbon::parse($endDate, $this->transactionQuery->reportTimezone())->endOfMonth();
        $months = collect();

        $cursor = $start->copy();
        while ($cursor <= $end) {
            $months->push($cursor->format('Y-m'));
            $cursor->addMonth();
        }

        $cashMonthly = CashTransaction::query()
            ->validForFinance()
            ->whereBetween('tx_date', [$start, $end])
            ->selectRaw($this->monthPeriodExpression('tx_date').' as period')
            ->selectRaw('SUM(CASE WHEN type = "in" THEN amount ELSE 0 END) as total_in')
            ->selectRaw('SUM(CASE WHEN type = "out" THEN amount ELSE 0 END) as total_out')
            ->groupBy('period')
            ->pluck('total_in', 'period');

        $cashOutMonthly = CashTransaction::query()
            ->validForFinance()
            ->whereBetween('tx_date', [$start, $end])
            ->selectRaw($this->monthPeriodExpression('tx_date').' as period')
            ->selectRaw('SUM(CASE WHEN type = "out" THEN amount ELSE 0 END) as total_out')
            ->groupBy('period')
            ->pluck('total_out', 'period');

        $invoiceQuery = DuesInvoice::query()
            ->whereBetween('due_date', [$start, $end]);
        if ($divisionId) {
            $invoiceQuery->whereHas('member', fn ($query) => $query->where('division_id', $divisionId));
        }
        $duesMonthly = $invoiceQuery
            ->selectRaw($this->monthPeriodExpression('due_date').' as period')
            ->selectRaw('SUM(amount_due) as total_due')
            ->groupBy('period')
            ->pluck('total_due', 'period');

        $paymentsQuery = DuesPayment::query()
            ->whereNull('voided_at')
            ->whereBetween('paid_at', [$start, $end]);
        if ($divisionId) {
            $paymentsQuery->whereHas('member', fn ($query) => $query->where('division_id', $divisionId));
        }
        $duesCollected = $paymentsQuery
            ->selectRaw($this->monthPeriodExpression('paid_at').' as period')
            ->selectRaw('SUM(amount) as total_paid')
            ->groupBy('period')
            ->pluck('total_paid', 'period');

        return $months->map(function ($period) use ($cashMonthly, $cashOutMonthly, $duesMonthly, $duesCollected) {
            $cashIn = (int) ($cashMonthly[$period] ?? 0);
            $cashOut = (int) ($cashOutMonthly[$period] ?? 0);
            $duesBilled = (int) ($duesMonthly[$period] ?? 0);
            $duesCollectedValue = (int) ($duesCollected[$period] ?? 0);

            return [
                'period' => $period,
                'cash_in' => $cashIn,
                'cash_out' => $cashOut,
                'net' => $cashIn - $cashOut,
                'dues_billed' => $duesBilled,
                'dues_collected' => $duesCollectedValue,
                'dues_outstanding' => max($duesBilled - $duesCollectedValue, 0),
            ];
        })->all();
    }

    private function topExpenses(?string $startDate, ?string $endDate): array
    {
        $query = CashTransaction::query()
            ->with('category')
            ->validForFinance()
            ->where('type', 'out');

        if ($startDate) {
            $query->where('tx_date', '>=', $this->transactionQuery->startOfReportDay($startDate));
        }
        if ($endDate) {
            $query->where('tx_date', '<=', $this->transactionQuery->endOfReportDay($endDate));
        }

        return $query->orderByDesc('amount')
            ->limit(10)
            ->get()
            ->map(fn ($tx) => [
                'id' => $tx->id,
                'date' => optional($tx->tx_date)->format('Y-m-d'),
                'category' => $tx->category?->name,
                'description' => $tx->description,
                'amount' => $tx->amount,
            ])
            ->all();
    }

    private function topArrears(?string $startDate, ?string $endDate, ?int $divisionId): array
    {
        $query = DuesInvoice::query()
            ->join('members', 'members.id', '=', 'dues_invoices.member_id')
            ->selectRaw('members.id, members.full_name, members.npa, members.division_id')
            ->selectRaw('SUM(dues_invoices.amount_due - dues_invoices.amount_paid) as outstanding')
            ->groupBy('members.id', 'members.full_name', 'members.npa', 'members.division_id')
            ->havingRaw('SUM(dues_invoices.amount_due - dues_invoices.amount_paid) > 0');

        if ($divisionId) {
            $query->where('members.division_id', $divisionId);
        }

        if ($startDate) {
            $query->where('dues_invoices.due_date', '>=', $this->transactionQuery->startOfReportDay($startDate));
        }
        if ($endDate) {
            $query->where('dues_invoices.due_date', '<=', $this->transactionQuery->endOfReportDay($endDate));
        }

        return $query->orderByDesc('outstanding')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'member_id' => $row->id,
                'name' => $row->full_name,
                'npa' => $row->npa,
                'division_id' => $row->division_id,
                'outstanding' => (int) $row->outstanding,
            ])
            ->all();
    }

    private function monthPeriodExpression(string $column): string
    {
        return DB::connection()->getDriverName() === 'sqlite'
            ? sprintf("strftime('%%Y-%%m', %s)", $column)
            : sprintf("DATE_FORMAT(%s, '%%Y-%%m')", $column);
    }
}
