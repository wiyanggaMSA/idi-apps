<?php

namespace Tests\Feature\Finance;

use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\CashTransaction;
use App\Models\FinancialActionRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class FinancePolicyAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_without_permission_cannot_create_cash_transaction(): void
    {
        $user = User::factory()->create();
        [$category, $method] = $this->cashMasters();

        $this->actingAs($user)
            ->post(route('transactions.store'), $this->cashPayload($category, $method))
            ->assertForbidden();

        $this->assertSame(0, CashTransaction::query()->count());
    }

    public function test_user_with_permission_can_create_cash_transaction(): void
    {
        $user = $this->userWithPermissions('transactions.create');
        [$category, $method] = $this->cashMasters();

        $this->actingAs($user)
            ->post(route('transactions.store'), $this->cashPayload($category, $method))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(1, CashTransaction::query()->count());
    }

    public function test_user_without_permission_cannot_request_cash_transaction_void(): void
    {
        $owner = User::factory()->create();
        $user = User::factory()->create();
        [$category, $method] = $this->cashMasters();
        $transaction = $this->cashTransaction($owner, $category, $method);

        $this->actingAs($user)
            ->delete(route('transactions.destroy', $transaction), [
                'reason' => 'Salah input',
            ])
            ->assertForbidden();

        $this->assertSame(0, FinancialActionRequest::query()->count());
    }

    public function test_user_with_permission_can_request_cash_transaction_void(): void
    {
        $owner = User::factory()->create();
        $user = $this->userWithPermissions('transactions.void.request');
        [$category, $method] = $this->cashMasters();
        $transaction = $this->cashTransaction($owner, $category, $method);

        $this->actingAs($user)
            ->delete(route('transactions.destroy', $transaction), [
                'reason' => 'Salah input',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(1, FinancialActionRequest::query()->count());
    }

    public function test_user_without_permission_cannot_approve_void_request(): void
    {
        $requester = User::factory()->create();
        $reviewer = User::factory()->create();
        [$category, $method] = $this->cashMasters();
        $transaction = $this->cashTransaction($requester, $category, $method);
        $actionRequest = $this->voidRequest($transaction, $requester);

        $this->actingAs($reviewer)
            ->post(route('audit.action-requests.approve', $actionRequest))
            ->assertForbidden();

        $this->assertSame(FinancialActionRequest::STATUS_PENDING, $actionRequest->fresh()->status);
    }

    public function test_requester_cannot_approve_own_void_request_even_with_permission(): void
    {
        $requester = $this->userWithPermissions('transactions.void.approve');
        [$category, $method] = $this->cashMasters();
        $transaction = $this->cashTransaction($requester, $category, $method);
        $actionRequest = $this->voidRequest($transaction, $requester);

        $this->actingAs($requester)
            ->post(route('audit.action-requests.approve', $actionRequest))
            ->assertForbidden();

        $this->assertSame(FinancialActionRequest::STATUS_PENDING, $actionRequest->fresh()->status);
    }

    public function test_user_with_permission_can_approve_void_request(): void
    {
        $requester = User::factory()->create();
        $reviewer = $this->userWithPermissions('transactions.void.approve');
        [$category, $method] = $this->cashMasters();
        $transaction = $this->cashTransaction($requester, $category, $method);
        $actionRequest = $this->voidRequest($transaction, $requester);

        $this->actingAs($reviewer)
            ->post(route('audit.action-requests.approve', $actionRequest), [
                'note' => 'Disetujui',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(FinancialActionRequest::STATUS_APPROVED, $actionRequest->fresh()->status);
        $this->assertNotNull($transaction->fresh()->voided_at);
    }

    public function test_inertia_shared_props_include_backend_permissions_for_frontend_authorization(): void
    {
        $user = $this->userWithPermissions('transactions.view', 'transactions.create', 'transactions.void.request');

        $this->actingAs($user)
            ->get(route('transactions.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transactions/Index')
                ->where('auth.permissions', fn ($permissions) => collect($permissions)->contains('transactions.view')
                    && collect($permissions)->contains('transactions.create')
                    && collect($permissions)->contains('transactions.void.request'))
            );
    }

    private function userWithPermissions(string ...$permissions): User
    {
        $user = User::factory()->create();

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $user->givePermissionTo($permissions);

        return $user;
    }

    /**
     * @return array{0: CashCategory, 1: CashMethod}
     */
    private function cashMasters(): array
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

    private function cashPayload(CashCategory $category, CashMethod $method): array
    {
        return [
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'category_id' => $category->id,
            'method_id' => $method->id,
            'amount' => 100000,
            'description' => 'Transaksi kas',
            'reference_no' => 'AUTH-001',
        ];
    }

    private function cashTransaction(User $user, CashCategory $category, CashMethod $method): CashTransaction
    {
        return CashTransaction::query()->create(array_merge($this->cashPayload($category, $method), [
            'created_by' => $user->id,
        ]));
    }

    private function voidRequest(CashTransaction $transaction, User $requester): FinancialActionRequest
    {
        return FinancialActionRequest::query()->create([
            'actionable_type' => $transaction->getMorphClass(),
            'actionable_id' => $transaction->id,
            'action' => FinancialActionRequest::ACTION_VOID,
            'status' => FinancialActionRequest::STATUS_PENDING,
            'reason' => 'Salah input',
            'requested_by' => $requester->id,
        ]);
    }
}
