<?php

namespace App\Services\Dues;

use App\Models\DuesInvoice;
use App\Models\DuesPaymentAllocation;
use App\Models\DuesPeriod;
use App\Models\DuesSetting;
use App\Models\Member;
use App\Models\MemberStatus;
use App\Models\PaymentStatus;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class DuesRecapService
{
    private array $statusCache = [];

    public function buildKpis(Collection $invoices): array
    {
        $totalDue = $invoices->sum('amount_due');
        $totalPaid = $invoices->sum('amount_paid');
        $outstanding = $totalDue - $totalPaid;
        $collectionRate = $totalDue > 0 ? round(($totalPaid / $totalDue) * 100, 2) : 0;

        $memberStatuses = $invoices->groupBy('member_id')->map(function (Collection $items) {
            $totalDueMember = $items->sum('amount_due');
            $totalPaidMember = $items->sum('amount_paid');
            $outstandingMember = $totalDueMember - $totalPaidMember;
            $overdue = $items->contains('payment_status_id', $this->statusIdByCode('OVERDUE'));

            if ($outstandingMember <= 0) {
                return 'PAID';
            }

            return $overdue ? 'OVERDUE' : 'UNPAID';
        });

        $statusMap = $memberStatuses->countBy();

        return [
            'total_due' => $totalDue,
            'total_paid' => $totalPaid,
            'outstanding' => $outstanding,
            'collection_rate' => $collectionRate,
            'counts' => [
                'paid' => $statusMap->get('PAID', 0),
                'unpaid' => $statusMap->get('UNPAID', 0),
                'overdue' => $statusMap->get('OVERDUE', 0),
            ],
        ];
    }

    public function buildMonthlyRecap(Collection $invoices): array
    {
         $grouped = $invoices->groupBy('period');
        $periodKeys = $grouped->keys()->filter()->sort()->values();
        $periodMap = $periodKeys->isEmpty()
            ? collect()
            : DuesPeriod::query()
                ->whereIn('period', $periodKeys)
                ->get()
                ->keyBy('period');

        return $periodKeys->map(function (string $periodKey) use ($grouped, $periodMap) {
            $items = $grouped->get($periodKey, collect());
            $totalDue = $items->sum('amount_due');
            $totalPaid = $items->sum('amount_paid');
            $outstanding = $totalDue - $totalPaid;
            $collectionRate = $totalDue > 0 ? round(($totalPaid / $totalDue) * 100, 2) : 0;
            $overdueCount = $items->where('payment_status_id', $this->statusIdByCode('OVERDUE'))->count();
            $periodRow = $periodMap->get($periodKey);
            $periodLabel = $periodRow?->name
                ?? $periodRow?->period
                ?? ($items->first()['period_label'] ?? $periodKey);

            return [
                'period' => $periodKey,
                'period_label' => $periodLabel,
                'total_due' => $totalDue,
                'total_paid' => $totalPaid,
                'outstanding' => $outstanding,
                'collection_rate' => $collectionRate,
                'overdue_count' => $overdueCount,
            ];
        })->values()->all();
    }

    public function buildMemberRecap(Collection $invoices): array
    {
        $grouped = $invoices->groupBy('member_id');

        return $grouped->map(function (Collection $items) {
            $first = $items->first() ?? [];
            $totalDue = $items->sum('amount_due');
            $totalPaid = $items->sum('amount_paid');
            $outstanding = $totalDue - $totalPaid;
            $overdue = $items->contains('payment_status_id', $this->statusIdByCode('OVERDUE'));
            $status = $outstanding <= 0 ? 'PAID' : ($overdue ? 'OVERDUE' : 'UNPAID');

            return [
                'member_id' => $first['member_id'] ?? null,
                'npa' => $first['member_npa'] ?? null,
                'name' => $first['member_name'] ?? null,
                'total_due' => $totalDue,
                'total_paid' => $totalPaid,
                'outstanding' => $outstanding,
                'status' => $status,
            ];
        })->sortByDesc('outstanding')->values()->all();
    }

    public function buildTrend(Collection $monthlyRecap): array
    {
        return $monthlyRecap->map(fn ($row) => [
            'period' => $row['period_label'],
            'total_due' => $row['total_due'],
            'total_paid' => $row['total_paid'],
        ])->values()->all();
    }

    public function filterInvoices(?string $startPeriod, ?string $endPeriod, ?int $divisionId = null): Collection
    {
        $query = DuesInvoice::query()
            ->with(['member.division', 'period'])
            ->when($divisionId, fn ($q) => $q->whereHas('member', fn ($m) => $m->where('division_id', $divisionId)));

        if ($startPeriod && $endPeriod) {
            $query->whereHas('period', function ($periodQuery) use ($startPeriod, $endPeriod) {
                $periodQuery->whereBetween('period', [$startPeriod, $endPeriod]);
            });
        }

        $invoices = $query->get();

        if ($invoices->isNotEmpty()) {
            return $invoices->map(function (DuesInvoice $invoice) {
                $period = $invoice->period;
                $member = $invoice->member;

                return [
                    'member_id' => $member?->id,
                    'member_npa' => $member?->npa,
                    'member_name' => $member?->full_name,
                    'period' => $period?->period,
                    'period_label' => $period?->name ?? $period?->period,
                    'amount_due' => $invoice->amount_due,
                    'amount_paid' => $invoice->amount_paid,
                    'payment_status_id' => $invoice->payment_status_id,
                ];
            });
        }

        return $this->fallbackFromAllocations($startPeriod, $endPeriod, $divisionId);
    }

    public function buildTopArrears(Collection $memberRecap, int $limit = 10): array
    {
        return $memberRecap->filter(fn ($row) => $row['outstanding'] > 0)
            ->sortByDesc('outstanding')
            ->take($limit)
            ->values()
            ->all();
    }

    public function buildTopPayers(Collection $memberRecap, int $limit = 10): array
    {
        return $memberRecap->filter(fn ($row) => $row['total_paid'] > 0)
            ->sortByDesc('total_paid')
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * @return array{0:string,1:string}
     */
    public function resolveAnalyticsWindow(int $months = 60): array
    {
        $months = max(1, $months);
        $configuredStart = $this->duesStartPeriod();
        $periodStarts = collect([
            DuesPeriod::query()->min('period'),
            DuesPaymentAllocation::query()->min('period_ym'),
        ])->filter();

        $periodEnds = collect([
            DuesPeriod::query()->max('period'),
            DuesPaymentAllocation::query()->max('period_ym'),
        ])->filter();

        $start = $periodStarts->isEmpty()
            ? $configuredStart
            : max((string) $periodStarts->min(), $configuredStart);

        $horizonEnd = Carbon::createFromFormat('Y-m', $start)
            ->addMonths($months - 1)
            ->format('Y-m');

        $dataEnd = $periodEnds->isEmpty()
            ? now()->format('Y-m')
            : (string) $periodEnds->max();

        $end = max($dataEnd, $horizonEnd);

        return [$start, $end];
    }

    public function duesStartPeriod(): string
    {
        $configured = (string) (DuesSetting::query()->value('dues_start_period') ?? '');
        if (preg_match('/^\d{4}-\d{2}$/', $configured) === 1) {
            return $configured;
        }

        $detectedStart = collect([
            DuesPeriod::query()->min('period'),
            DuesPaymentAllocation::query()->min('period_ym'),
        ])->filter()->min();

        if (is_string($detectedStart) && preg_match('/^\d{4}-\d{2}$/', $detectedStart) === 1) {
            return $detectedStart;
        }

        return now()->format('Y-m');
    }

    private function statusIdByCode(string $code): int
    {
        $normalized = strtolower($code);

        if (array_key_exists($normalized, $this->statusCache)) {
            return $this->statusCache[$normalized];
        }

        $status = PaymentStatus::withTrashed()
            ->whereRaw('LOWER(code) = ?', [$normalized])
            ->first();

        if (! $status) {
            $defaults = [
                'paid' => ['code' => 'PAID', 'name' => 'Lunas', 'color' => 'green'],
                'unpaid' => ['code' => 'UNPAID', 'name' => 'Belum Bayar', 'color' => 'gold'],
                'overdue' => ['code' => 'OVERDUE', 'name' => 'Menunggak', 'color' => 'red'],
                'partial' => ['code' => 'PARTIAL', 'name' => 'Parsial', 'color' => 'orange'],
                'waived' => ['code' => 'WAIVED', 'name' => 'Dibebaskan', 'color' => 'cyan'],
            ];

            $fallback = $defaults[$normalized] ?? [
                'code' => strtoupper($code),
                'name' => strtoupper($code),
                'color' => 'default',
            ];

            $status = PaymentStatus::query()->create([
                'code' => $fallback['code'],
                'name' => $fallback['name'],
                'color' => $fallback['color'],
                'is_active' => true,
            ]);
        } elseif (method_exists($status, 'trashed') && $status->trashed()) {
            $status->restore();
        }

        $statusId = (int) $status->id;

        $this->statusCache[$normalized] = (int) $statusId;

        return $this->statusCache[$normalized];
    }

    private function fallbackFromAllocations(?string $startPeriod, ?string $endPeriod, ?int $divisionId = null): Collection
    {
        $monthlyAmount = (int) (DuesSetting::query()->value('dues_amount') ?? 0);
        $paidStatusId = $this->statusIdByCode('PAID');
        $unpaidStatusId = $this->statusIdByCode('UNPAID');
        $overdueStatusId = $this->statusIdByCode('OVERDUE');

        $billableStatusCodes = MemberStatus::query()
            ->active()
            ->billable()
            ->pluck('code');

        $members = Member::query()
            ->when(
                $divisionId,
                fn ($query) => $query->where('division_id', $divisionId)
            )
            ->whereIn(
                'status',
                $billableStatusCodes->isNotEmpty() ? $billableStatusCodes : collect(['aktif'])
            )
            ->orderBy('full_name')
            ->get(['id', 'npa', 'full_name']);

        if ($members->isEmpty()) {
            return collect();
        }

        if (! $startPeriod || ! $endPeriod) {
            $minPeriod = DuesPaymentAllocation::query()->min('period_ym');
            $maxPeriod = DuesPaymentAllocation::query()->max('period_ym');
            $startPeriod = $startPeriod ?: ($minPeriod ?: $this->duesStartPeriod());
            $endPeriod = $endPeriod ?: ($maxPeriod ?: now()->format('Y-m'));
        }

        $startPeriod = max($startPeriod, $this->duesStartPeriod());

        $allocations = DuesPaymentAllocation::query()
            ->select(
                'dues_payment_allocations.member_id',
                'dues_payment_allocations.period_ym',
                'dues_payment_allocations.amount',
                'members.npa as member_npa',
                'members.full_name as member_name',
                'dues_periods.name as period_name'
            )
            ->join('dues_payments', 'dues_payments.id', '=', 'dues_payment_allocations.dues_payment_id')
            ->join('members', 'members.id', '=', 'dues_payment_allocations.member_id')
            ->leftJoin('dues_periods', 'dues_periods.period', '=', 'dues_payment_allocations.period_ym')
            ->whereNull('dues_payments.voided_at')
            ->when($divisionId, fn ($q) => $q->where('members.division_id', $divisionId))
            ->when($startPeriod && $endPeriod, fn ($q) => $q->whereBetween('dues_payment_allocations.period_ym', [$startPeriod, $endPeriod]))
            ->get();
        $paidByMemberPeriod = $allocations
            ->groupBy(fn ($row) => $row->member_id.'|'.$row->period_ym)
            ->map(fn (Collection $rows) => (int) $rows->sum('amount'));

        $periodNames = $allocations
            ->mapWithKeys(fn ($row) => [$row->period_ym => $row->period_name ?? $row->period_ym]);

        $periods = $this->periodRange($startPeriod, $endPeriod);
        $todayPeriod = now()->format('Y-m');

        return $members->flatMap(function (Member $member) use (
            $periods,
            $monthlyAmount,
            $paidByMemberPeriod,
            $periodNames,
            $todayPeriod,
            $paidStatusId,
            $unpaidStatusId,
            $overdueStatusId
        ) {
            return collect($periods)->map(function (string $period) use (
                $member,
                $monthlyAmount,
                $paidByMemberPeriod,
                $periodNames,
                $todayPeriod,
                $paidStatusId,
                $unpaidStatusId,
                $overdueStatusId
            ) {
                $key = $member->id.'|'.$period;
                $amountPaid = (int) ($paidByMemberPeriod->get($key, 0));
                $amountDue = max($monthlyAmount, 0);
                $statusId = $paidStatusId;

                if ($amountPaid < $amountDue) {
                    $statusId = $period < $todayPeriod ? $overdueStatusId : $unpaidStatusId;
                }

                return [
                    'member_id' => $member->id,
                    'member_npa' => $member->npa,
                    'member_name' => $member->full_name,
                    'period' => $period,
                    'period_label' => $periodNames->get($period, $period),
                    'amount_due' => $amountDue,
                    'amount_paid' => min($amountPaid, $amountDue),
                    'payment_status_id' => $statusId,
                ];
            });
        })->values();
    }

    /**
     * @return array<int, string>
     */
    private function periodRange(string $startPeriod, string $endPeriod): array
    {
        $start = Carbon::createFromFormat('Y-m', $startPeriod)->startOfMonth();
        $end = Carbon::createFromFormat('Y-m', $endPeriod)->startOfMonth();

        if ($start->gt($end)) {
            [$start, $end] = [$end, $start];
        }

        $periods = [];
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            $periods[] = $cursor->format('Y-m');
            $cursor->addMonth();
        }

        return $periods;
    }
}
