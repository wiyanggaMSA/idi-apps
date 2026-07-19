<?php

namespace App\Services\Dashboard;

use App\Models\Agenda;
use App\Models\CashTransaction;
use App\Models\DuesPayment;
use App\Models\DuesPaymentAllocation;
use App\Models\DuesPeriod;
use App\Models\DuesSetting;
use App\Models\Letter;
use App\Models\Member;
use App\Models\MemberStatus;
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
                'dues_balance' => $duesMetrics['balance'],
                'dues_net_month' => $duesMetrics['net_month'],
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
        $activeCodes = MemberStatus::query()
            ->active()
            ->activeMember()
            ->pluck('code');
        $active = Member::query()
            ->whereIn('status', $activeCodes->isNotEmpty() ? $activeCodes : collect(['aktif']))
            ->count();
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
        $monthlyAmount = $this->monthlyDuesAmount($period);
        $billableMembers = $this->billableMemberQuery()->count();
        $billed = $this->isBillablePeriod($period) ? $billableMembers * $monthlyAmount : 0;

        $collected = (int) DuesPayment::query()
            ->whereNull('voided_at')
            ->whereBetween('paid_at', [$startDate, $endDate])
            ->sum('amount');
        $balance = (int) DuesPayment::query()
            ->whereNull('voided_at')
            ->where('paid_at', '<=', $endDate)
            ->sum('amount');
        $allocatedForPeriod = (int) DuesPaymentAllocation::query()
            ->join('dues_payments', 'dues_payments.id', '=', 'dues_payment_allocations.dues_payment_id')
            ->whereNull('dues_payments.voided_at')
            ->where('dues_payment_allocations.period_ym', $period)
            ->sum('dues_payment_allocations.amount');
        $outstanding = max(0, $billed - $allocatedForPeriod);
        $collectionRate = $billed > 0 ? round(($collected / $billed) * 100, 1) : 0;
        $netMonth = $collected - $billed;

        return [
            'billed' => $billed,
            'collected' => $collected,
            'balance' => $balance,
            'net_month' => $netMonth,
            'outstanding' => $outstanding,
            'collection_rate' => $collectionRate,
        ];
    }

    public function getCashMetrics(Carbon $startDate, Carbon $endDate): array
    {
        $monthTotals = CashTransaction::query()
            ->validForFinance()
            ->whereBetween('tx_date', [$startDate, $endDate])
            ->selectRaw("SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END) as total_in")
            ->selectRaw("SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END) as total_out")

            ->first();

        $allTimeTotals = CashTransaction::query()
            ->validForFinance()
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
            ->validForFinance()
            ->whereBetween('tx_date', [$startDate, $endDate])
            ->selectRaw('DATE(tx_date) as date')
            ->selectRaw("SUM(CASE WHEN `type` = 'in' THEN amount ELSE 0 END) as cash_in")
->selectRaw("SUM(CASE WHEN `type` = 'out' THEN amount ELSE 0 END) as cash_out")

            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $duesRows = DuesPayment::query()
            ->whereNull('voided_at')
            ->whereBetween('paid_at', [$startDate, $endDate])
            ->selectRaw('DATE(paid_at) as date')
            ->selectRaw('SUM(amount) as collected')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $expenseCategories = CashTransaction::query()
    ->validForFinance()
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
    ->validForFinance()
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
            ->validForFinance()
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

        $arrears = $this->getTopDuesArrears($period);

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

    public function cacheVersion(): string
    {
        return implode(':', [
            DuesPayment::query()->max('updated_at') ?? '0',
            DuesPaymentAllocation::query()->max('updated_at') ?? '0',
            DuesSetting::query()->max('updated_at') ?? '0',
            Member::query()->max('updated_at') ?? '0',
            CashTransaction::query()->max('updated_at') ?? '0',
            Agenda::query()->max('updated_at') ?? '0',
            Letter::query()->max('updated_at') ?? '0',
        ]);
    }

    private function monthlyDuesAmount(string $period): int
    {
        $configured = (int) (DuesSetting::query()->value('dues_amount') ?? 0);
        if ($configured > 0) {
            return $configured;
        }

        return (int) (DuesPeriod::query()
            ->where('period', $period)
            ->value('default_amount') ?? 0);
    }

    private function duesStartPeriod(): string
    {
        $configured = (string) (DuesSetting::query()->value('dues_start_period') ?? '');
        if (preg_match('/^\d{4}-\d{2}$/', $configured) === 1) {
            return $configured;
        }

        $detectedStart = collect([
            DuesPeriod::query()->min('period'),
            DuesPaymentAllocation::query()->min('period_ym'),
        ])->filter()->min();

        return is_string($detectedStart) && preg_match('/^\d{4}-\d{2}$/', $detectedStart) === 1
            ? $detectedStart
            : now()->format('Y-m');
    }

    private function isBillablePeriod(string $period): bool
    {
        return $period >= $this->duesStartPeriod();
    }

    private function billableMemberQuery()
    {
        $billableStatusCodes = MemberStatus::query()
            ->active()
            ->billable()
            ->pluck('code');

        return Member::query()
            ->whereIn('status', $billableStatusCodes->isNotEmpty() ? $billableStatusCodes : collect(['aktif']));
    }

    private function getTopDuesArrears(string $period)
    {
        $monthlyAmount = $this->monthlyDuesAmount($period);
        if ($monthlyAmount <= 0 || ! $this->isBillablePeriod($period)) {
            return collect();
        }

        $paidMemberIds = DuesPaymentAllocation::query()
            ->join('dues_payments', 'dues_payments.id', '=', 'dues_payment_allocations.dues_payment_id')
            ->whereNull('dues_payments.voided_at')
            ->where('dues_payment_allocations.period_ym', $period)
            ->pluck('dues_payment_allocations.member_id')
            ->unique();

        return $this->billableMemberQuery()
            ->whereNotIn('id', $paidMemberIds)
            ->orderBy('full_name')
            ->limit(10)
            ->get(['id', 'full_name'])
            ->map(fn (Member $member) => [
                'member_id' => $member->id,
                'member_name' => $member->full_name,
                'outstanding' => $monthlyAmount,
            ]);
    }
}
