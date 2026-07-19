<?php

namespace Tests\Feature\Finance;

use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\CashTransaction;
use App\Models\FinancialActionRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class FinanceAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Permission::firstOrCreate(['name' => 'transactions.create', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'transactions.void.request', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'transactions.void.approve', 'guard_name' => 'web']);
    }

    public function test_user_without_permission_cannot_create_cash_transaction(): void
    {
        $user = User::factory()->create();
        [$category, $method] = $this->setupMasters();

        $payload = [
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'category_id' => $category->id,
            'method_id' => $method->id,
            'amount' => 100000,
            'description' => 'Mencoba membuat transaksi tanpa ijin',
        ];

        $response = $this->actingAs($user)
            ->post(route('transactions.store'), $payload);

        $response->assertForbidden();
        $this->assertEquals(0, CashTransaction::query()->count());
    }

    public function test_user_without_permission_cannot_request_void(): void
    {
        $user = User::factory()->create();
        [$category, $method] = $this->setupMasters();
        $transaction = CashTransaction::factory()->create([
            'category_id' => $category->id,
            'method_id' => $method->id,
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->delete(route('transactions.destroy', $transaction), [
                'reason' => 'Salah input',
            ]);

        $response->assertForbidden();
        $this->assertEquals(0, FinancialActionRequest::query()->count());
    }

    public function test_user_without_permission_cannot_approve_void(): void
    {
        $requester = $this->createUserWithPermission('transactions.void.request');
        $approver = User::factory()->create();
        [$category, $method] = $this->setupMasters();
        $transaction = CashTransaction::factory()->create([
            'category_id' => $category->id,
            'method_id' => $method->id,
            'created_by' => $requester->id,
        ]);

        $this->actingAs($requester)
            ->delete(route('transactions.destroy', $transaction), [
                'reason' => 'Salah input',
            ]);

        $request = FinancialActionRequest::query()->first();

        $response = $this->actingAs($approver)
            ->post(route('audit.action-requests.approve', $request), [
                'note' => 'Disetujui',
            ]);

        $response->assertForbidden();
        $this->assertEquals(FinancialActionRequest::STATUS_PENDING, $request->fresh()->status);
    }

    public function test_user_with_permission_can_perform_actions(): void
    {
        $creator = $this->createUserWithPermission('transactions.create');
        [$category, $method] = $this->setupMasters();

        $payload = [
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'category_id' => $category->id,
            'method_id' => $method->id,
            'amount' => 100000,
            'description' => 'Membuat transaksi dengan ijin',
        ];

        $this->actingAs($creator)
            ->post(route('transactions.store'), $payload)
            ->assertRedirect();

        $this->assertEquals(1, CashTransaction::query()->count());
        $transaction = CashTransaction::query()->first();

        $requester = $this->createUserWithPermission('transactions.void.request');
        $this->actingAs($requester)
            ->delete(route('transactions.destroy', $transaction), [
                'reason' => 'Batal',
            ])
            ->assertRedirect();

        $request = FinancialActionRequest::query()->first();
        $this->assertNotNull($request);

        $approver = $this->createUserWithPermission('transactions.void.approve');
        $this->actingAs($approver)
            ->post(route('audit.action-requests.approve', $request), [
                'note' => 'Ok',
            ])
            ->assertRedirect();

        $this->assertEquals(FinancialActionRequest::STATUS_APPROVED, $request->fresh()->status);
        $this->assertNotNull($transaction->fresh()->voided_at);
    }

    public function test_backend_endpoints_are_secured_regardless_of_frontend_buttons(): void
    {
        $user = User::factory()->create();
        [$category, $method] = $this->setupMasters();

        $this->actingAs($user)
            ->post(route('transactions.store'), [
                'tx_date' => '2026-07-08 09:00:00',
                'type' => 'in',
                'category_id' => $category->id,
                'method_id' => $method->id,
                'amount' => 100000,
            ])
            ->assertForbidden();

        $transaction = CashTransaction::factory()->create([
            'category_id' => $category->id,
            'method_id' => $method->id,
            'created_by' => $user->id,
        ]);

        $this->actingAs($user)
            ->delete(route('transactions.destroy', $transaction), ['reason' => 'batal'])
            ->assertForbidden();
    }

    private function createUserWithPermission(string $permissionName): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo($permissionName);
        return $user;
    }

    private function setupMasters(): array
    {
        $category = CashCategory::query()->create([
            'type' => 'in',
            'name' => 'Donasi',
            'code' => 'donation',
            'is_active' => true,
        ]);

        $method = CashMethod::query()->create([
            'name' => 'cash',
            'is_active' => true,
        ]);

        return [$category, $method];
    }
}
