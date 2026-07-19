<?php

namespace Tests\Feature\Finance;

use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\CashTransaction;
use App\Models\User;
use App\Services\Cash\CashReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class CashTransactionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        Permission::firstOrCreate(['name' => 'transactions.create', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'transactions.update', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'transactions.view', 'guard_name' => 'web']);
    }

    public function test_user_with_permission_can_create_income_cash_transaction(): void
    {
        $user = $this->createUserWithPermission('transactions.create');
        [$incomeCategory, , $cashMethod] = $this->setupMasters();

        $payload = [
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'category_id' => $incomeCategory->id,
            'method_id' => $cashMethod->id,
            'amount' => 150000,
            'description' => 'Penerimaan donasi',
            'reference_no' => 'REF-INC-001',
        ];

        $response = $this->actingAs($user)
            ->post(route('transactions.store'), $payload);

        $response->assertRedirect();
        $this->assertDatabaseHas('cash_transactions', [
            'type' => 'in',
            'amount' => 150000,
            'description' => 'Penerimaan donasi',
            'category_id' => $incomeCategory->id,
            'method_id' => $cashMethod->id,
        ]);
    }

    public function test_user_with_permission_can_create_expense_cash_transaction(): void
    {
        $user = $this->createUserWithPermission('transactions.create');
        [, $expenseCategory, $cashMethod] = $this->setupMasters();

        $payload = [
            'tx_date' => '2026-07-08 10:00:00',
            'type' => 'out',
            'category_id' => $expenseCategory->id,
            'method_id' => $cashMethod->id,
            'amount' => 50000,
            'description' => 'Pembelian ATK',
            'reference_no' => 'REF-EXP-001',
        ];

        $response = $this->actingAs($user)
            ->post(route('transactions.store'), $payload);

        $response->assertRedirect();
        $this->assertDatabaseHas('cash_transactions', [
            'type' => 'out',
            'amount' => 50000,
            'description' => 'Pembelian ATK',
            'category_id' => $expenseCategory->id,
            'method_id' => $cashMethod->id,
        ]);
    }

    public function test_invalid_request_fails_validation(): void
    {
        $user = $this->createUserWithPermission('transactions.create');
        $this->actingAs($user)
            ->post(route('transactions.store'), [
                'amount' => -100,
            ])
            ->assertSessionHasErrors(['tx_date', 'type', 'category_id', 'method_id', 'amount']);
    }

    public function test_transaction_number_is_automatically_assigned(): void
    {
        $user = $this->createUserWithPermission('transactions.create');
        [$incomeCategory, , $cashMethod] = $this->setupMasters();

        $transaction = CashTransaction::factory()->create([
            'tx_date' => '2026-07-08 09:00:00',
            'category_id' => $incomeCategory->id,
            'method_id' => $cashMethod->id,
            'created_by' => $user->id,
        ]);

        $this->assertNotEmpty($transaction->transaction_number);
    }

    public function test_financial_fields_cannot_be_changed_after_posted(): void
    {
        $user = $this->createUserWithPermission('transactions.update');
        [$incomeCategory, , $cashMethod] = $this->setupMasters();

        $transaction = CashTransaction::factory()->create([
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'category_id' => $incomeCategory->id,
            'method_id' => $cashMethod->id,
            'amount' => 100000,
            'created_by' => $user->id,
        ]);

        $payload = [
            'amount' => 200000,
            'description' => 'Keterangan administratif baru',
            'reason' => 'Melakukan update administratif',
        ];

        $response = $this->actingAs($user)
            ->patch(route('transactions.update', $transaction), $payload);

        $response->assertSessionHasErrors('transaction');
        $this->assertEquals(100000, $transaction->fresh()->amount);
    }

    public function test_non_financial_fields_can_be_changed_if_policy_allows(): void
    {
        $user = $this->createUserWithPermission('transactions.update');
        [$incomeCategory, , $cashMethod] = $this->setupMasters();

        $transaction = CashTransaction::factory()->create([
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'category_id' => $incomeCategory->id,
            'method_id' => $cashMethod->id,
            'amount' => 100000,
            'description' => 'Original description',
            'reference_no' => 'REF-001',
            'created_by' => $user->id,
        ]);

        $payload = [
            'description' => 'Updated description',
            'reference_no' => 'REF-NEW-001',
            'reason' => 'Koreksi typo deskripsi',
        ];

        $response = $this->actingAs($user)
            ->patch(route('transactions.update', $transaction), $payload);

        $response->assertRedirect();
        $this->assertEquals('Updated description', $transaction->fresh()->description);
        $this->assertEquals('REF-NEW-001', $transaction->fresh()->reference_no);
    }

    public function test_void_transactions_are_excluded_from_cash_report(): void
    {
        $user = $this->createUserWithPermission('transactions.view');
        [$incomeCategory, , $cashMethod] = $this->setupMasters();

        $activeTx = CashTransaction::factory()->create([
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'category_id' => $incomeCategory->id,
            'method_id' => $cashMethod->id,
            'amount' => 100000,
            'created_by' => $user->id,
        ]);

        $voidedTx = CashTransaction::factory()->create([
            'tx_date' => '2026-07-08 10:00:00',
            'type' => 'in',
            'category_id' => $incomeCategory->id,
            'method_id' => $cashMethod->id,
            'amount' => 500000,
            'voided_at' => now(),
            'voided_by' => $user->id,
            'created_by' => $user->id,
        ]);

        $report = app(CashReportService::class)->build([
            'start_date' => '2026-07-08',
            'end_date' => '2026-07-08',
        ]);

        $this->assertEquals(100000, $report['totals']['total_in']);
    }

    private function createUserWithPermission(string $permissionName): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo($permissionName);
        return $user;
    }

    private function setupMasters(): array
    {
        $income = CashCategory::query()->create([
            'type' => 'in',
            'name' => 'Donasi',
            'code' => 'donation',
            'is_active' => true,
        ]);

        $expense = CashCategory::query()->create([
            'type' => 'out',
            'name' => 'Operasional',
            'code' => 'operational',
            'is_active' => true,
        ]);

        $cash = CashMethod::query()->create([
            'name' => 'cash',
            'is_active' => true,
        ]);

        $transfer = CashMethod::query()->create([
            'name' => 'transfer',
            'is_active' => true,
        ]);

        return [$income, $expense, $cash, $transfer];
    }
}
