<?php

namespace Tests\Feature\Finance;

use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\CashTransaction;
use App\Models\DuesPayment;
use App\Models\DuesPaymentAllocation;
use App\Models\DuesSetting;
use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class DuesPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Permission::firstOrCreate(['name' => 'dues.create', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'dues.update', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'transactions.update', 'guard_name' => 'web']);
    }

    public function test_pay_dues_for_one_month_succeeds(): void
    {
        $user = $this->createUserWithPermission('dues.create');
        $member = Member::factory()->create();
        $this->setupMasters();

        $payload = [
            'member_id' => $member->id,
            'start_period' => '2026-01',
            'duration' => 1,
            'method' => 'cash',
            'paid_at' => '2026-07-08',
            'reference_no' => 'DUES-001',
            'notes' => 'Pembayaran iuran 1 bulan',
        ];

        $response = $this->actingAs($user)
            ->post(route('dues.payments.store'), $payload);

        $response->assertRedirect();
        $this->assertDatabaseHas('dues_payments', [
            'member_id' => $member->id,
            'amount' => 100000,
        ]);
        $this->assertEquals(1, DuesPaymentAllocation::query()->count());
    }

    public function test_pay_dues_for_three_months_creates_three_allocations(): void
    {
        $user = $this->createUserWithPermission('dues.create');
        $member = Member::factory()->create();
        $this->setupMasters();

        $payload = [
            'member_id' => $member->id,
            'start_period' => '2026-01',
            'duration' => 3,
            'method' => 'cash',
            'paid_at' => '2026-07-08',
            'reference_no' => 'DUES-003',
            'notes' => 'Pembayaran iuran 3 bulan',
        ];

        $response = $this->actingAs($user)
            ->post(route('dues.payments.store'), $payload);

        $response->assertRedirect();
        $this->assertEquals(3, DuesPaymentAllocation::query()->count());
        $this->assertEquals(300000, DuesPayment::query()->first()->amount);
    }

    public function test_pay_same_period_twice_fails(): void
    {
        $user = $this->createUserWithPermission('dues.create');
        $member = Member::factory()->create();
        $this->setupMasters();

        $payload = [
            'member_id' => $member->id,
            'start_period' => '2026-01',
            'duration' => 1,
            'method' => 'cash',
            'paid_at' => '2026-07-08',
            'reference_no' => 'DUES-001',
        ];

        // First payment succeeds
        $this->actingAs($user)
            ->post(route('dues.payments.store'), $payload)
            ->assertRedirect();

        // Second payment for the same period fails
        $response = $this->actingAs($user)
            ->post(route('dues.payments.store'), $payload);

        $response->assertSessionHasErrors('payment');
        $this->assertEquals(1, DuesPayment::query()->count());
    }

    public function test_dues_payment_generates_cash_transaction(): void
    {
        $user = $this->createUserWithPermission('dues.create');
        $member = Member::factory()->create();
        $this->setupMasters();

        $payload = [
            'member_id' => $member->id,
            'start_period' => '2026-01',
            'duration' => 1,
            'method' => 'cash',
            'paid_at' => '2026-07-08',
            'reference_no' => 'DUES-001',
        ];

        $this->actingAs($user)
            ->post(route('dues.payments.store'), $payload)
            ->assertRedirect();

        $payment = DuesPayment::query()->first();
        $this->assertNotNull($payment);

        $this->assertDatabaseHas('cash_transactions', [
            'dues_payment_id' => $payment->id,
            'amount' => 100000,
            'type' => 'in',
        ]);
    }

    public function test_dues_generated_cash_transaction_cannot_be_edited_manually(): void
    {
        $user = $this->createUserWithPermission('transactions.update');
        $member = Member::factory()->create();
        [$category, $method] = $this->setupMasters();

        $payment = DuesPayment::factory()->create([
            'member_id' => $member->id,
            'amount' => 100000,
            'method' => 'cash',
        ]);

        $transaction = CashTransaction::factory()->create([
            'dues_payment_id' => $payment->id,
            'category_id' => $category->id,
            'method_id' => $method->id,
            'amount' => 100000,
            'created_by' => $user->id,
        ]);

        // Attempting to edit manual details of a dues-linked cash transaction
        $response = $this->actingAs($user)
            ->patch(route('transactions.update', $transaction), [
                'description' => 'Mencoba mengedit transaksi hasil iuran',
                'reason' => 'Testing manual edit',
            ]);

        $response->assertForbidden();
        $this->assertNotEquals('Mencoba mengedit transaksi hasil iuran', $transaction->fresh()->description);
    }

    public function test_transaction_number_is_filled_on_dues_generated_cash_transaction(): void
    {
        $user = $this->createUserWithPermission('dues.create');
        $member = Member::factory()->create();
        $this->setupMasters();

        $payload = [
            'member_id' => $member->id,
            'start_period' => '2026-01',
            'duration' => 1,
            'method' => 'cash',
            'paid_at' => '2026-07-08',
            'reference_no' => 'DUES-001',
        ];

        $this->actingAs($user)
            ->post(route('dues.payments.store'), $payload);

        $transaction = CashTransaction::query()->whereNotNull('dues_payment_id')->first();
        $this->assertNotNull($transaction);
        $this->assertNotEmpty($transaction->transaction_number);
    }

    private function createUserWithPermission(string $permissionName): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo($permissionName);
        return $user;
    }

    private function setupMasters(): array
    {
        DuesSetting::query()->create([
            'dues_amount' => 100000,
            'dues_start_period' => '2026-01',
        ]);

        $category = CashCategory::query()->create([
            'type' => 'in',
            'name' => 'Iuran',
            'code' => 'dues',
            'is_active' => true,
        ]);

        $method = CashMethod::query()->create([
            'name' => 'cash',
            'is_active' => true,
        ]);

        return [$category, $method];
    }
}
