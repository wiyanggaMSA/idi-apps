<?php

namespace App\Services\Finance;

use App\Models\FinancePeriod;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FinancePeriodService
{
    public function ensureOpen(mixed $date, string $message = 'Periode keuangan sudah ditutup. Gunakan adjustment pada periode yang masih open.'): void
    {
        $period = $this->findForDate($date);

        if ($period?->isClosed()) {
            throw new \RuntimeException($message);
        }
    }

    public function findForDate(mixed $date): ?FinancePeriod
    {
        $carbon = $this->parseDate($date);

        return FinancePeriod::query()
            ->where('period_year', (int) $carbon->format('Y'))
            ->where('period_month', (int) $carbon->format('m'))
            ->first();
    }

    public function getOrCreateForPeriod(int $year, int $month): FinancePeriod
    {
        return FinancePeriod::query()->firstOrCreate(
            [
                'period_year' => $year,
                'period_month' => $month,
            ],
            [
                'status' => FinancePeriod::STATUS_OPEN,
            ]
        );
    }

    public function close(FinancePeriod $period, User $actor, string $notes): FinancePeriod
    {
        if ($period->isClosed()) {
            throw new \RuntimeException('Periode keuangan sudah closed.');
        }

        return DB::transaction(function () use ($period, $actor, $notes) {
            $period = FinancePeriod::query()
                ->whereKey($period->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($period->isClosed()) {
                throw new \RuntimeException('Periode keuangan sudah closed.');
            }

            $period->update([
                'status' => FinancePeriod::STATUS_CLOSED,
                'closed_at' => now(),
                'closed_by' => $actor->id,
                'notes' => $notes,
            ]);

            activity('finance')
                ->causedBy($actor)
                ->performedOn($period)
                ->withProperties([
                    'period' => $period->period_key,
                    'status' => $period->status,
                    'notes' => $notes,
                ])
                ->log('finance_period.closed');

            return $period;
        });
    }

    public function listRecentPeriods(int $months = 18): Collection
    {
        $end = now()->startOfMonth()->addMonth();
        $start = now()->startOfMonth()->subMonths($months - 2);
        $periods = FinancePeriod::query()
            ->with('closedBy')
            ->where(function ($query) use ($start, $end) {
                $query->where('period_year', '>', (int) $start->format('Y'))
                    ->orWhere(function ($sub) use ($start) {
                        $sub->where('period_year', (int) $start->format('Y'))
                            ->where('period_month', '>=', (int) $start->format('m'));
                    });
            })
            ->where(function ($query) use ($end) {
                $query->where('period_year', '<', (int) $end->format('Y'))
                    ->orWhere(function ($sub) use ($end) {
                        $sub->where('period_year', (int) $end->format('Y'))
                            ->where('period_month', '<=', (int) $end->format('m'));
                    });
            })
            ->get()
            ->keyBy(fn (FinancePeriod $period) => $period->period_key);

        $rows = collect();
        $cursor = $start->copy();

        while ($cursor <= $end) {
            $key = $cursor->format('Y-m');
            $period = $periods->get($key);

            $rows->push([
                'id' => $period?->id,
                'period' => $key,
                'period_year' => (int) $cursor->format('Y'),
                'period_month' => (int) $cursor->format('m'),
                'label' => $cursor->translatedFormat('F Y'),
                'status' => $period?->status ?? FinancePeriod::STATUS_OPEN,
                'closed_at' => optional($period?->closed_at)->format('Y-m-d H:i:s'),
                'closed_by' => $period?->closedBy?->name,
                'notes' => $period?->notes,
            ]);

            $cursor->addMonth();
        }

        return $rows->sortByDesc('period')->values();
    }

    public function statusForRange(?string $startDate, ?string $endDate): array
    {
        if (! $startDate || ! $endDate) {
            return [
                'status' => FinancePeriod::STATUS_OPEN,
                'is_closed' => false,
                'label' => 'Open',
            ];
        }

        $start = Carbon::parse($startDate)->startOfMonth();
        $end = Carbon::parse($endDate)->startOfMonth();
        $periods = [];
        $hasClosed = false;
        $cursor = $start->copy();

        while ($cursor <= $end) {
            $period = $this->findForDate($cursor);
            $isClosed = $period?->isClosed() ?? false;
            $hasClosed = $hasClosed || $isClosed;
            $periods[] = [
                'period' => $cursor->format('Y-m'),
                'status' => $isClosed ? FinancePeriod::STATUS_CLOSED : FinancePeriod::STATUS_OPEN,
                'closed_at' => optional($period?->closed_at)->format('Y-m-d H:i:s'),
            ];
            $cursor->addMonth();
        }

        return [
            'status' => $hasClosed ? FinancePeriod::STATUS_CLOSED : FinancePeriod::STATUS_OPEN,
            'is_closed' => $hasClosed,
            'label' => $hasClosed ? 'Closed' : 'Open',
            'periods' => $periods,
        ];
    }

    private function parseDate(mixed $date): CarbonInterface
    {
        if ($date instanceof CarbonInterface) {
            return $date;
        }

        return Carbon::parse($date);
    }
}
