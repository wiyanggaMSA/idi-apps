<?php

namespace App\Actions\Dues;

use App\Models\DuesPaymentAllocation;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class CalculateMemberDuesAction
{
    /**
     * @param Collection<int, Member> $members
     * @return Collection<int, array<string, mixed>>
     */
    public function execute(
        Collection $members,
        Collection $latestPayments,
        string $duesStartPeriod,
        string $activePeriod,
        int $monthlyAmount
    ): Collection {
        $allocationRows = DuesPaymentAllocation::query()
            ->select('dues_payment_allocations.member_id', 'dues_payment_allocations.period_ym')
            ->join('dues_payments', 'dues_payments.id', '=', 'dues_payment_allocations.dues_payment_id')
            ->whereNull('dues_payments.voided_at')
            ->where('dues_payment_allocations.period_ym', '>=', $duesStartPeriod)
            ->orderBy('dues_payment_allocations.member_id')
            ->orderBy('dues_payment_allocations.period_ym')
            ->get()
            ->groupBy('member_id');

        return $members->map(function (Member $member) use ($allocationRows, $latestPayments, $duesStartPeriod, $activePeriod, $monthlyAmount) {
            $periods = $allocationRows->get($member->id, collect())
                ->pluck('period_ym')
                ->unique()
                ->values();

            $lastPaidPeriod = $periods->max();
            $paidThrough = $this->paidThrough($periods, $duesStartPeriod);
            $dueNow = $this->dueNow($periods, $duesStartPeriod, $activePeriod);
            $arrears = $this->arrearsMonths($periods, $duesStartPeriod, $activePeriod);
            $advance = $this->advanceMonths($periods, $activePeriod);
            $status = $this->status($arrears, $advance, $dueNow, $activePeriod);
            $latestPayment = $latestPayments->get($member->id);

            return [
                'member_id' => $member->id,
                'npa' => $member->npa,
                'full_name' => $member->full_name,
                'member_status' => $member->status,
                'member_status_name' => $member->memberStatus?->name ?? $member->status,
                'member_status_is_active' => $member->memberStatus?->is_active_member ?? ($member->status === 'aktif'),
                'last_payment_method' => $latestPayment['method_name'] ?? $latestPayment['method'] ?? null,
                'last_payment_method_raw' => $latestPayment['method'] ?? null,
                'last_paid_period' => $lastPaidPeriod,
                'paid_through' => $paidThrough,
                'paid_through_label' => $paidThrough ?? '—',
                'due_now' => $dueNow,
                'due_now_label' => $dueNow ?? '—',
                'arrears_months' => $arrears,
                'advance_months' => $advance,
                'status' => $status,
                'total_arrears_amount' => $arrears * $monthlyAmount,
            ];
        });
    }

    public function dueNow(Collection $periods, string $duesStartPeriod, string $activePeriod): ?string
    {
        $periodSet = array_fill_keys($periods->all(), true);
        $cursor = Carbon::createFromFormat('Y-m', $duesStartPeriod)->startOfMonth();
        $end = Carbon::createFromFormat('Y-m', $activePeriod)->startOfMonth();

        while ($cursor <= $end) {
            $key = $cursor->format('Y-m');
            if (! isset($periodSet[$key])) {
                return $key;
            }
            $cursor->addMonth();
        }

        if ($periods->isNotEmpty()) {
            return Carbon::createFromFormat('Y-m', $periods->max())
                ->addMonth()
                ->format('Y-m');
        }

        return $duesStartPeriod;
    }

    private function paidThrough(Collection $periods, string $duesStartPeriod): ?string
    {
        if ($periods->isEmpty()) {
            return null;
        }

        $periodSet = array_fill_keys($periods->all(), true);
        $cursor = Carbon::createFromFormat('Y-m', $duesStartPeriod)->startOfMonth();
        $end = Carbon::createFromFormat('Y-m', $periods->max())->startOfMonth();
        $last = null;

        while ($cursor <= $end) {
            $key = $cursor->format('Y-m');
            if (! isset($periodSet[$key])) {
                break;
            }
            $last = $key;
            $cursor->addMonth();
        }

        return $last;
    }

    private function arrearsMonths(Collection $periods, string $duesStartPeriod, string $activePeriod): int
    {
        $periodSet = array_fill_keys($periods->all(), true);
        $cursor = Carbon::createFromFormat('Y-m', $duesStartPeriod)->startOfMonth();
        $end = Carbon::createFromFormat('Y-m', $activePeriod)->startOfMonth()->subMonth();
        $count = 0;

        if ($end->lt($cursor)) {
            return 0;
        }

        while ($cursor <= $end) {
            $key = $cursor->format('Y-m');
            if (! isset($periodSet[$key])) {
                $count++;
            }
            $cursor->addMonth();
        }

        return $count;
    }

    private function advanceMonths(Collection $periods, string $activePeriod): int
    {
        return $periods->filter(fn (string $period) => $period > $activePeriod)->count();
    }

    private function status(int $arrears, int $advance, ?string $dueNow, string $activePeriod): string
    {
        if ($arrears > 0) {
            return 'MENUNGGAK';
        }

        if ($dueNow === $activePeriod) {
            return 'BELUM_BAYAR';
        }

        if ($advance > 0) {
            return 'ADVANCE';
        }

        return 'LUNAS';
    }
}
