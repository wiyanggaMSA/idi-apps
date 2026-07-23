<?php

namespace Tests\Feature\Finance;

use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\CashTransaction;
use App\Models\DuesPaymentAllocation;
use App\Models\DuesSetting;
use App\Models\Member;
use App\Models\User;
use App\Services\Dues\DuesLedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class DuesLedgerActionsPhase6Test extends TestCase
{
    use RefreshDatabase;

    public function test_process_dues_payment_for_one_month_creates_payment_allocation_and_cash_transaction(): void
    {
        [$user, $member] = $this->duesSetup();

        $payment = app(DuesLedgerService::class)->storePayment($this->duesPayload($member, [
            'duration' => 1,
        ]), $user->id);

        $this->assertSame(1000, $payment->amount);
        $this->assertSame(1, DuesPaymentAllocation::query()->where('dues_payment_id', $payment->id)->count());
        $this->assertSame(1, CashTransaction::query()->where('dues_payment_id', $payment->id)->count());
    }

    public function test_process_dues_payment_for_three_months_creates_three_allocations_with_same_total_amount(): void
    {
        [$user, $member] = $this->duesSetup();

        $payment = app(DuesLedgerService::class)->storePayment($this->duesPayload($member, [
            'duration' => 3,
        ]), $user->id);

        $allocations = DuesPaymentAllocation::query()
            ->where('dues_payment_id', $payment->id)
            ->orderBy('period_ym')
            ->get();

        $this->assertSame(3000, $payment->amount);
        $this->assertSame(3000, (int) $allocations->sum('amount'));
        $this->assertSame(['2026-01', '2026-02', '2026-03'], $allocations->pluck('period_ym')->all());
    }

    public function test_overlap_period_still_fails_after_action_refactor(): void
    {
        [$user, $member] = $this->duesSetup();
        $service = app(DuesLedgerService::class);

        $service->storePayment($this->duesPayload($member, [
            'duration' => 1,
        ]), $user->id);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Periode mulai harus mengikuti bulan iuran saat ini (2026-02).');

        $service->storePayment($this->duesPayload($member, [
            'duration' => 1,
        ]), $user->id);
    }

    public function test_void_dues_payment_still_voids_related_cash_transaction(): void
    {
        [$user, $member] = $this->duesSetup();
        $service = app(DuesLedgerService::class);
        $payment = $service->storePayment($this->duesPayload($member), $user->id);

        $transaction = CashTransaction::query()->where('dues_payment_id', $payment->id)->first();
        $this->assertNotNull($transaction);

        $service->voidPayment($payment, 'Salah input', $user->id);

        $this->assertNotNull($payment->fresh()->voided_at);
        $this->assertSame('Salah input', $payment->fresh()->void_reason);
        $this->assertNotNull($transaction->fresh()->voided_at);
        $this->assertSame($user->id, $transaction->fresh()->voided_by);
    }

    public function test_dues_index_response_remains_compatible_with_frontend(): void
    {
        [$user] = $this->duesSetup();
        $user->givePermissionTo('dues.view');

        $this->actingAs($user)
            ->get(route('dues.index', ['perPage' => 100]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dues/Index')
                ->has('dues.data')
                ->has('dues.meta.current_page')
                ->where('dues.meta.per_page', 100)
                ->where('filters.perPage', 100)
                ->has('summary.total_members')
                ->has('members')
                ->has('active_period')
                ->has('monthly_amount')
            );
    }

    /**
     * @return array{0: User, 1: Member}
     */
    private function duesSetup(): array
    {
        $user = User::factory()->create();
        $member = Member::factory()->create();

        foreach (['dues.create', 'dues.view'] as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }
        $user->givePermissionTo('dues.create');

        DuesSetting::query()->create([
            'dues_amount' => 1000,
            'dues_start_period' => '2026-01',
        ]);
        CashCategory::query()->create([
            'type' => 'in',
            'name' => 'Iuran',
            'code' => 'dues',
            'is_active' => true,
        ]);
        CashMethod::query()->create([
            'name' => 'cash',
            'is_active' => true,
        ]);

        return [$user, $member];
    }

    private function duesPayload(Member $member, array $overrides = []): array
    {
        return array_merge([
            'member_id' => $member->id,
            'start_period' => '2026-01',
            'duration' => 1,
            'method' => 'cash',
            'paid_at' => '2026-07-08 09:00:00',
            'reference_no' => 'DUES-PHASE-6',
            'notes' => null,
        ], $overrides);
    }
}
