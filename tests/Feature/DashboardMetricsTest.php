<?php

namespace Tests\Feature;

use App\Models\DuesPayment;
use App\Models\DuesPaymentAllocation;
use App\Models\DuesSetting;
use App\Models\Member;
use App\Models\User;
use App\Services\Dashboard\DashboardMetricsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardMetricsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dues_cards_use_ledger_allocations_for_billable_members(): void
    {
        DuesSetting::create([
            'dues_amount' => 1000,
            'dues_start_period' => '2026-01',
        ]);

        $user = User::factory()->create();
        $paidMember = Member::factory()->create(['status' => 'aktif']);
        Member::factory()->create(['status' => 'aktif']);

        $payment = DuesPayment::query()->create([
            'dues_invoice_id' => null,
            'member_id' => $paidMember->id,
            'paid_at' => '2026-06-10 09:00:00',
            'amount' => 1000,
            'method' => 'cash',
            'created_by' => $user->id,
        ]);

        DuesPaymentAllocation::query()->create([
            'dues_payment_id' => $payment->id,
            'member_id' => $paidMember->id,
            'period_ym' => '2026-06',
            'amount' => 1000,
        ]);

        $metrics = (new DashboardMetricsService())->build(
            Carbon::create(2026, 6, 1)->startOfMonth(),
            Carbon::create(2026, 6, 1)->endOfMonth(),
            '2026-06'
        );

        $this->assertSame(2000, $metrics['kpi']['dues_billed']);
        $this->assertSame(1000, $metrics['kpi']['dues_collected']);
        $this->assertSame(1000, $metrics['kpi']['dues_outstanding']);
        $this->assertSame(50.0, $metrics['kpi']['dues_collection_rate']);
        $this->assertSame(-1000, $metrics['kpi']['dues_net_month']);
    }
}
