<?php

namespace Tests\Feature\Finance;

use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\DuesPayment;
use App\Models\DuesPaymentAllocation;
use App\Models\DuesSetting;
use App\Models\Member;
use App\Models\User;
use App\Services\Dues\DuesLedgerService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class FinanceIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Permission::firstOrCreate(['name' => 'dues.create', 'guard_name' => 'web']);
    }

    public function test_double_submit_dues_payment_only_produces_one_valid_payment(): void
    {
        [$user, $member] = $this->setupMasters();
        $payload = $this->payload($member);

        $this->actingAs($user)
            ->post(route('dues.payments.store'), $payload)
            ->assertRedirect();

        $response = $this->actingAs($user)
            ->post(route('dues.payments.store'), $payload);

        $response->assertSessionHasErrors('payment');

        $this->assertEquals(1, DuesPayment::query()->count());
        $this->assertEquals(1, DuesPaymentAllocation::query()->count());
    }

    public function test_unique_constraint_catches_duplicate_member_and_period(): void
    {
        [$user, $member] = $this->setupMasters();

        $payment1 = DuesPayment::factory()->create([
            'member_id' => $member->id,
            'amount' => 100000,
        ]);

        DuesPaymentAllocation::query()->create([
            'dues_payment_id' => $payment1->id,
            'member_id' => $member->id,
            'period_ym' => '2026-01',
            'amount' => 100000,
        ]);

        $payment2 = DuesPayment::factory()->create([
            'member_id' => $member->id,
            'amount' => 100000,
        ]);

        $this->expectException(QueryException::class);

        DuesPaymentAllocation::query()->create([
            'dues_payment_id' => $payment2->id,
            'member_id' => $member->id,
            'period_ym' => '2026-01',
            'amount' => 100000,
        ]);
    }

    public function test_lock_idempotency_returns_clear_error_on_concurrency(): void
    {
        [$user, $member] = $this->setupMasters();
        $service = new DuesLedgerService();

        $lock = Cache::lock("dues_payment_{$member->id}_2026-01", 10);
        $this->assertTrue($lock->get());

        try {
            $service->storePayment($this->payload($member), $user->id);
            $this->fail('Should have failed due to locked resource.');
        } catch (\RuntimeException $e) {
            $this->assertEquals('Pembayaran sedang diproses. Mohon jangan submit berulang.', $e->getMessage());
        } finally {
            $lock->release();
        }
    }

    private function setupMasters(): array
    {
        $user = User::factory()->create();
        $user->givePermissionTo('dues.create');
        $member = Member::factory()->create();

        DuesSetting::query()->create([
            'dues_amount' => 100000,
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

    private function payload(Member $member): array
    {
        return [
            'member_id' => $member->id,
            'start_period' => '2026-01',
            'duration' => 1,
            'method' => 'cash',
            'paid_at' => '2026-07-08',
            'reference_no' => 'DUES-LOCK-001',
        ];
    }
}
