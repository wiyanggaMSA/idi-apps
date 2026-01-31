<?php

namespace App\Services\Dashboard;

use App\Models\Agenda;
use App\Models\CashTransaction;
use App\Models\DuesInvoice;
use App\Models\DuesPayment;
use App\Models\Letter;
use App\Models\Member;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class DashboardMetricsService
{
    public function build(Carbon $startDate, Carbon $endDate, string $period): array
    {
        $memberMetrics = $this->getMemberMetrics($startDate, $endDate);
        $duesMetrics = $this->getDuesMetrics($startDate, $endDate, $period);
        $cashMetrics = $this->getCashMetrics($startDate, $endDate);
        $secretariatMetrics = $this->getSecretariatMetrics($startDate, $endDate);
        $charts = $this->getCharts($startDate, $endDate);
        $tables = $this->getTables($startDate, $endDate, $period);

        return [
            'kpi' => [
                'members_total' => $memberMetrics['total'],
                'members_active' => $memberMetrics['active'],
                'members_new' => $memberMetrics['new'],
                'dues_billed' => $duesMetrics['billed'],
                'dues_collected' => $duesMetrics['collected'],
                'dues_outstanding' => $duesMetrics['outstanding'],
                'dues_collection_rate' => $duesMetrics['collection_rate'],
                'cash_in' => $cashMetrics['in'],
                'cash_out' => $cashMetrics['out'],
                'cash_net' => $cashMetrics['net'],
                'cash_balance' => $cashMetrics['balance'],
                'letters_archived' => $secretariatMetrics['letters_archived'],
                'agenda_upcoming' => $secretariatMetrics['agenda_upcoming'],
            ],
            'charts' => $charts,
            'tables' => $tables,
        ];
    }

    public function getMemberMetrics(Carbon $startDate, Carbon $endDate): array
    {
        $total = Member::query()->count();
        $active = Member::query()->where('status', 'active')->count();
        $new = Member::query()
            ->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('join_date', [$startDate->toDateString(), $endDate->toDateString()])
                    ->orWhere(function ($subQuery) use ($startDate, $endDate) {
                        $subQuery->whereNull('join_date')
                            ->whereBetween('created_at', [$startDate, $endDate]);
                    });
            })
            ->count();

        return [
            'total' => $total,
            'active' => $active,
            'new' => $new,
        ];
    }

    public function getDuesMetrics(Carbon $startDate, Carbon $endDate, string $period): array
    {
        $invoiceQuery = DuesInvoice::query()
            ->where(function ($query) use ($period, $startDate, $endDate) {
                $query->whereHas('period', function ($subQuery) use ($period) {
                    $subQuery->where('period', $period);
                })
                    ->orWhereBetween('due_date', [$startDate->toDateString(), $endDate->toDateString()]);
            });

        $billed = (int) (clone $invoiceQuery)->sum('amount_due');
        $collected = (int) DuesPayment::query()
            ->whereBetween('paid_at', [$startDate, $endDate])
            ->sum('amount');
        $outstanding = max(0, $billed - $collected);
        $collectionRate = $billed > 0 ? round(($collected / $billed) * 100, 1) : 0;

        return [
            'billed' => $billed,
            'collected' => $collected,
            'outstanding' => $outstanding,
            'collection_rate' => $collectionRate,
        ];
    }

    public function getCashMetrics(Carbon $startDate, Carbon $endDate): array
    {
        $monthTotals = CashTransaction::query()
            ->whereNull('voided_at')
            ->whereBetween('tx_date', [$startDate, $endDate])
            ->selectRaw("SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END) as total_in")
            ->selectRaw("SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END) as total_out")

            ->first();

        $allTimeTotals = CashTransaction::query()
            ->whereNull('voided_at')
            ->selectRaw("SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END) as total_in")
            ->selectRaw("SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END) as total_out")

            ->first();

        $cashIn = (int) ($monthTotals->total_in ?? 0);
        $cashOut = (int) ($monthTotals->total_out ?? 0);
        $allIn = (int) ($allTimeTotals->total_in ?? 0);
        $allOut = (int) ($allTimeTotals->total_out ?? 0);

        return [
            'in' => $cashIn,
            'out' => $cashOut,
            'net' => $cashIn - $cashOut,
            'balance' => $allIn - $allOut,
        ];
    }

    public function getSecretariatMetrics(Carbon $startDate, Carbon $endDate, int $upcomingWindowDays = 7): array
    {
        $lettersArchived = Letter::query()
            ->where('status', 'archived')
            ->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
                    ->orWhereBetween('letter_date', [$startDate->toDateString(), $endDate->toDateString()])
                    ->orWhereBetween('created_at', [$startDate, $endDate]);
            })
            ->count();

        $today = Carbon::now()->startOfDay();
        $upcomingEnd = (clone $today)->addDays($upcomingWindowDays)->endOfDay();

        $agendaUpcoming = Agenda::query()
            ->whereBetween('start_at', [$today, $upcomingEnd])
            ->count();

        return [
            'letters_archived' => $lettersArchived,
            'agenda_upcoming' => $agendaUpcoming,
        ];
    }

    public function getCharts(Carbon $startDate, Carbon $endDate): array
    {
        $cashRows = CashTransaction::query()
            ->whereNull('voided_at')
            ->whereBetween('tx_date', [$startDate, $endDate])
            ->selectRaw('DATE(tx_date) as date')
            ->selectRaw("SUM(CASE WHEN `type` = 'in' THEN amount ELSE 0 END) as cash_in")
->selectRaw("SUM(CASE WHEN `type` = 'out' THEN amount ELSE 0 END) as cash_out")

            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $duesRows = DuesPayment::query()
            ->whereBetween('paid_at', [$startDate, $endDate])
            ->selectRaw('DATE(paid_at) as date')
            ->selectRaw('SUM(amount) as collected')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $expenseCategories = CashTransaction::query()
    ->whereNull('cash_transactions.voided_at')
    ->whereBetween('cash_transactions.tx_date', [$startDate, $endDate])
    ->where('cash_transactions.type', 'out')
    ->join('cash_categories', 'cash_categories.id', '=', 'cash_transactions.category_id')
    ->select('cash_categories.name')
    ->selectRaw('SUM(cash_transactions.amount) as total')
    ->groupBy('cash_categories.name')
    ->orderByDesc('total')
    ->limit(5)
    ->get()
    ->map(fn ($row) => ['name' => $row->name, 'total' => (int) $row->total])
    ->values();

        $incomeCategories = CashTransaction::query()
    ->whereNull('cash_transactions.voided_at')
    ->whereBetween('cash_transactions.tx_date', [$startDate, $endDate])
    ->where('cash_transactions.type', 'in')
    ->join('cash_categories', 'cash_categories.id', '=', 'cash_transactions.category_id')
    ->select('cash_categories.name')
    ->selectRaw('SUM(cash_transactions.amount) as total')
    ->groupBy('cash_categories.name')
    ->orderByDesc('total')
    ->limit(5)
    ->get()
    ->map(fn ($row) => [
        'name' => $row->name,
        'total' => (int) $row->total,
    ])
    ->values();


        return [
            'cash_trend' => $this->buildDailySeries($startDate, $endDate, $cashRows, [
                'cash_in' => 'cash_in',
                'cash_out' => 'cash_out',
            ]),
            'dues_trend' => $this->buildDailySeries($startDate, $endDate, $duesRows, [
                'collected' => 'collected',
            ]),
            'expense_categories' => $expenseCategories,
            'income_categories' => $incomeCategories,
        ];
    }

    public function getTables(Carbon $startDate, Carbon $endDate, string $period): array
    {
        $recentTransactions = CashTransaction::query()
            ->with('category')
            ->whereNull('voided_at')
            ->whereBetween('tx_date', [$startDate, $endDate])
            ->orderByDesc('tx_date')
            ->limit(10)
            ->get()
            ->map(function (CashTransaction $transaction) {
                return [
                    'id' => $transaction->id,
                    'date' => optional($transaction->tx_date)->toDateString(),
                    'type' => $transaction->type,
                    'category' => $transaction->category?->name,
                    'description' => $transaction->description,
                    'amount' => (int) $transaction->amount,
                ];
            });

        $arrears = DuesInvoice::query()
            ->select('member_id')
            ->selectRaw('SUM(amount_due - amount_paid) as outstanding')
            ->whereRaw('amount_due > amount_paid')
            ->where(function ($query) use ($period, $startDate, $endDate) {
                $query->whereHas('period', function ($subQuery) use ($period) {
                    $subQuery->where('period', $period);
                })
                    ->orWhereBetween('due_date', [$startDate->toDateString(), $endDate->toDateString()]);
            })
            ->groupBy('member_id')
            ->orderByDesc('outstanding')
            ->limit(10)
            ->with('member')
            ->get()
            ->map(function (DuesInvoice $invoice) {
                return [
                    'member_id' => $invoice->member_id,
                    'member_name' => $invoice->member?->full_name,
                    'outstanding' => (int) $invoice->outstanding,
                ];
            });

        $today = Carbon::now()->startOfDay();
        $upcomingEnd = (clone $today)->addDays(7)->endOfDay();

        $upcomingAgenda = Agenda::query()
            ->whereBetween('start_at', [$today, $upcomingEnd])
            ->orderBy('start_at')
            ->limit(10)
            ->get(['id', 'title', 'start_at', 'location', 'type'])
            ->map(function (Agenda $agenda) {
                return [
                    'id' => $agenda->id,
                    'title' => $agenda->title,
                    'start_at' => optional($agenda->start_at)->toDateTimeString(),
                    'location' => $agenda->location,
                    'type' => $agenda->type,
                ];
            });

        $recentLetters = Letter::query()
            ->where('status', 'archived')
            ->orderByRaw('COALESCE(date, letter_date, created_at) desc')
            ->limit(5)
            ->get(['id', 'type', 'number', 'subject', 'date', 'letter_date', 'status', 'created_at'])
            ->map(function (Letter $letter) {
                $dateValue = $letter->date ?? $letter->letter_date ?? $letter->created_at;

                return [
                    'id' => $letter->id,
                    'type' => $letter->type,
                    'number' => $letter->number,
                    'subject' => $letter->subject,
                    'date' => optional($dateValue)->toDateString(),
                    'status' => $letter->status,
                ];
            });

        return [
            'recent_transactions' => $recentTransactions,
            'top_arrears' => $arrears,
            'upcoming_agenda' => $upcomingAgenda,
            'recent_letters' => $recentLetters,
        ];
    }

    private function buildDailySeries(Carbon $startDate, Carbon $endDate, $rows, array $fields): array
    {
        $series = [];

        foreach (CarbonPeriod::create($startDate, $endDate) as $date) {
            $key = $date->toDateString();
            $row = $rows[$key] ?? null;
            $entry = ['date' => $key];

            foreach ($fields as $field) {
                $entry[$field] = (int) ($row?->{$field} ?? 0);
            }

            $series[] = $entry;
        }

        return $series;
    }
}
