<?php

namespace App\Services\Dues;

use App\Models\DuesInvoice;
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

        $statusMap = $invoices->groupBy('payment_status_id')->map->count();

        return [
            'total_due' => $totalDue,
            'total_paid' => $totalPaid,
            'outstanding' => $outstanding,
            'collection_rate' => $collectionRate,
            'counts' => [
                'paid' => $statusMap->get($this->statusIdByCode('PAID'), 0),
                'unpaid' => $statusMap->get($this->statusIdByCode('UNPAID'), 0),
                'overdue' => $statusMap->get($this->statusIdByCode('OVERDUE'), 0),
            ],
        ];
    }

    public function buildMonthlyRecap(Collection $invoices): array
    {
        $grouped = $invoices->groupBy('dues_period_id');

        $periods = DuesPeriod::query()
            ->whereIn('id', $grouped->keys())
            ->orderBy('period')
            ->get();

        return $periods->map(function (DuesPeriod $period) use ($grouped) {
            $items = $grouped->get($period->id, collect());
            $totalDue = $items->sum('amount_due');
            $totalPaid = $items->sum('amount_paid');
            $outstanding = $totalDue - $totalPaid;
            $collectionRate = $totalDue > 0 ? round(($totalPaid / $totalDue) * 100, 2) : 0;
            $overdueCount = $items->where('payment_status_id', $this->statusIdByCode('OVERDUE'))->count();

            return [
                'period' => $period->period,
                'period_label' => $period->name ?? $period->period,
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
            $member = $items->first()?->member;
            $totalDue = $items->sum('amount_due');
            $totalPaid = $items->sum('amount_paid');
            $outstanding = $totalDue - $totalPaid;
            $overdue = $items->contains('payment_status_id', $this->statusIdByCode('OVERDUE'));
            $status = $outstanding <= 0 ? 'PAID' : ($overdue ? 'OVERDUE' : 'UNPAID');

            return [
                'member_id' => $member?->id,
                'npa' => $member?->npa,
                'name' => $member?->full_name,
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

        return $query->get();
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

        $this->statusCache[$normalized] = (int) PaymentStatus::query()
            ->whereRaw('LOWER(code) = ?', [$normalized])
            ->value('id');

        return $this->statusCache[$normalized];
    }
}
