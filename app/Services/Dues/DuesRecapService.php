<?php

namespace App\Services\Dues;

use App\Models\DuesInvoice;
use App\Models\DuesPaymentAllocation;
use App\Models\DuesPeriod;
use App\Models\PaymentStatus;
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

    public function filterInvoices(?string $startPeriod, ?string $endPeriod, ?int $divisionId = null, ?int $memberId = null): Collection
    {
        $query = DuesInvoice::query()
            ->with(['member.division', 'period'])
            ->when($divisionId, fn ($q) => $q->whereHas('member', fn ($m) => $m->where('division_id', $divisionId)))
            ->when($memberId, fn ($q) => $q->where('member_id', $memberId));

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

        return $this->fallbackFromAllocations($startPeriod, $endPeriod, $divisionId, $memberId);
    }

    public function buildTopArrears(Collection $memberRecap, int $limit = 10): array
    {
        return $memberRecap->filter(fn ($row) => $row['outstanding'] > 0)
            ->sortByDesc('outstanding')
            ->take($limit)
            ->values()
            ->all();
    }

    private function statusIdByCode(string $code): int
    {
        $normalized = strtolower($code);

        if (array_key_exists($normalized, $this->statusCache)) {
            return $this->statusCache[$normalized];
        }

        $statusId  = PaymentStatus::query()
            ->whereRaw('LOWER(code) = ?', [$normalized])
            ->value('id');

            if (! $statusId) {
            throw new \RuntimeException('Status pembayaran tidak ditemukan.');
        }

        $this->statusCache[$normalized] = (int) $statusId;

        return $this->statusCache[$normalized];
    }

    private function fallbackFromAllocations(?string $startPeriod, ?string $endPeriod, ?int $divisionId = null, ?int $memberId = null): Collection
    {
        $paidStatusId = $this->statusIdByCode('PAID');

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
            ->when($memberId, fn ($q) => $q->where('dues_payment_allocations.member_id', $memberId))
            ->when($startPeriod && $endPeriod, fn ($q) => $q->whereBetween('dues_payment_allocations.period_ym', [$startPeriod, $endPeriod]))
            ->get();

        return $allocations->map(fn ($row) => [
            'member_id' => $row->member_id,
            'member_npa' => $row->member_npa,
            'member_name' => $row->member_name,
            'period' => $row->period_ym,
            'period_label' => $row->period_name ?? $row->period_ym,
            'amount_due' => (int) $row->amount,
            'amount_paid' => (int) $row->amount,
            'payment_status_id' => $paidStatusId,
        ]);
    }
}
