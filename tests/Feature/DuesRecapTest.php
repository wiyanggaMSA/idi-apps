<?php

namespace Tests\Feature;

use App\Models\DuesPayment;
use App\Models\DuesPaymentAllocation;
use App\Models\DuesSetting;
use App\Models\Member;
use App\Models\User;
use App\Services\Dues\DuesRecapService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DuesRecapTest extends TestCase
{
    use RefreshDatabase;

    public function test_recap_paid_uses_allocations_for_filtered_dues_periods(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 6, 21));

        DuesSetting::query()->create([
            'dues_amount' => 30000,
            'dues_start_period' => '2026-01',
        ]);

        $member = Member::factory()->create();
        Member::factory()->create();
        $user = User::factory()->create();

        $payment = DuesPayment::query()->create([
            'member_id' => $member->id,
            'paid_at' => '2026-06-20',
            'amount' => 1800000,
            'method' => 'transfer',
            'created_by' => $user->id,
        ]);

        $cursor = Carbon::create(2026, 1, 1);
        for ($i = 0; $i < 60; $i++) {
            DuesPaymentAllocation::query()->create([
                'dues_payment_id' => $payment->id,
                'member_id' => $member->id,
                'period_ym' => $cursor->copy()->addMonths($i)->format('Y-m'),
                'amount' => 30000,
            ]);
        }

        $service = new DuesRecapService();
        $invoices = $service->filterInvoices('2026-01', '2026-06');
        $kpis = $service->buildKpis($invoices);
        $realtimeReceived = $service->buildRealtimeReceived('2026-01', '2026-06');
        $monthlyRecap = collect($service->buildMonthlyRecap($invoices));

        $this->assertSame(360000, $kpis['total_due']);
        $this->assertSame(180000, $kpis['total_paid']);
        $this->assertSame(1800000, $realtimeReceived);
        $this->assertSame(180000, $kpis['outstanding']);
        $this->assertSame(30000, $monthlyRecap->firstWhere('period', '2026-06')['total_paid']);
        $this->assertSame(30000, $monthlyRecap->firstWhere('period', '2026-01')['total_paid']);
    }
}
