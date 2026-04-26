<?php

namespace App\Services\Dues;

use App\Models\DuesInvoice;
use App\Models\DuesPeriod;
use App\Models\DuesSetting;
use App\Models\Member;
use App\Models\MemberStatus;
use App\Models\PaymentStatus;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DuesInvoiceService
{
    public function generateMonthlyInvoices(int $year, int $month): DuesPeriod
    {
        $settings = DuesSetting::query()->first();
        $amount = $settings?->dues_amount ?? 0;
        $dueDay = $settings?->due_day ?? 10;

        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = (clone $startDate)->endOfMonth();
        $periodKey = $startDate->format('Y-m');
        $dueDate = Carbon::create($year, $month, min($dueDay, $endDate->day));

        return DB::transaction(function () use ($periodKey, $startDate, $endDate, $dueDate, $amount) {
            $period = DuesPeriod::query()->firstOrCreate(
                ['period' => $periodKey],
                [
                    'name' => $startDate->translatedFormat('F Y'),
                    'start_date' => $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                    'due_date' => $dueDate->toDateString(),
                    'default_amount' => $amount,
                ]
            );

            $unpaidStatusId = $this->statusIdByCode('UNPAID');

            $billableStatusCodes = MemberStatus::query()
                ->active()
                ->billable()
                ->pluck('code');

            $memberIds = Member::query()
                ->whereIn('status', $billableStatusCodes->isNotEmpty() ? $billableStatusCodes : collect(['aktif', 'active']))
                ->selectRaw('MIN(id) as id')
                ->groupBy('npa')
                ->pluck('id');

            Member::query()
                ->whereIn('id', $memberIds)
                ->orderBy('id')
                ->chunkById(100, function (Collection $members) use ($period, $amount, $dueDate, $unpaidStatusId) {
                    foreach ($members as $member) {
                        DuesInvoice::query()->firstOrCreate(
                            [
                                'dues_period_id' => $period->id,
                                'member_id' => $member->id,
                            ],
                            [
                                'amount_due' => $amount,
                                'amount_paid' => 0,
                                'payment_status_id' => $unpaidStatusId,
                                'due_date' => $dueDate->toDateString(),
                            ]
                        );
                    }
                });

            return $period;
        });
    }

    public function generateYearlyInvoices(int $year): array
    {
        $periods = [];
        for ($month = 1; $month <= 12; $month++) {
            $periods[] = $this->generateMonthlyInvoices($year, $month);
        }

        return $periods;
    }

    public function updateOverdueStatus(): void
    {
        $settings = DuesSetting::query()->first();
        if (! $settings?->auto_mark_arrears) {
            return;
        }

        $graceDays = $settings?->grace_days ?? 0;
        $overdueStatusId = $this->statusIdByCode('OVERDUE');
        $paidStatusId = $this->statusIdByCode('PAID');

        if (! $overdueStatusId) {
            return;
        }

        $cutoff = now()->subDays($graceDays)->startOfDay();

        DuesInvoice::query()
            ->whereColumn('amount_paid', '<', 'amount_due')
            ->whereNotNull('due_date')
            ->where('due_date', '<', $cutoff)
            ->where('payment_status_id', '!=', $paidStatusId)
            ->update(['payment_status_id' => $overdueStatusId]);
    }

    public function statusIdByCode(string $code): int
    {
        $normalized = strtolower($code);

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

        return $status->id;
    }
}
