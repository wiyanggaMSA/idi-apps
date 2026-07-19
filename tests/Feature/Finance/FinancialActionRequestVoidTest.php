<?php

namespace Tests\Feature\Finance;

use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\CashTransaction;
use App\Models\DuesPayment;
use App\Models\DuesSetting;
use App\Models\FinancialActionRequest;
use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class FinancialActionRequestVoidTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Permission::firstOrCreate(['name' => 'transactions.create', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'transactions.void.request', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'transactions.void.approve', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'dues.create', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'dues.void.request', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'dues.void.approve', 'guard_name' => 'web']);
    }

    public function test_user_can_request_void(): void
    {
        $user = $this->createUserWithPermission('transactions.void.request');
        [$category, $method] = $this->setupMasters();
        $transaction = CashTransaction::factory()->create([
            'category_id' => $category->id,
            'method_id' => $method->id,
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->delete(route('transactions.destroy', $transaction), [
                'reason' => 'Salah nominal input',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('financial_action_requests', [
            'actionable_id' => $transaction->id,
            'actionable_type' => $transaction->getMorphClass(),
            'action' => FinancialActionRequest::ACTION_VOID,
        ]);
    }

    public function test_request_void_status_is_pending_by_default(): void
    {
        $user = $this->createUserWithPermission('transactions.void.request');
        [$category, $method] = $this->setupMasters();
        $transaction = CashTransaction::factory()->create([
            'category_id' => $category->id,
            'method_id' => $method->id,
            'created_by' => $user->id,
        ]);

        $this->actingAs($user)
            ->delete(route('transactions.destroy', $transaction), [
                'reason' => 'Salah nominal input',
            ]);

        $request = FinancialActionRequest::query()->first();
        $this->assertEquals(FinancialActionRequest::STATUS_PENDING, $request->status);
    }

    public function test_requester_cannot_approve_own_void_request(): void
    {
        $user = $this->createUserWithPermission('transactions.void.request', 'transactions.void.approve');
        [$category, $method] = $this->setupMasters();
        $transaction = CashTransaction::factory()->create([
            'category_id' => $category->id,
            'method_id' => $method->id,
            'created_by' => $user->id,
        ]);

        $this->actingAs($user)
            ->delete(route('transactions.destroy', $transaction), [
                'reason' => 'Salah input',
            ]);

        $request = FinancialActionRequest::query()->first();

        $response = $this->actingAs($user)
            ->post(route('audit.action-requests.approve', $request), [
                'note' => 'Approve sendiri',
            ]);

        $response->assertForbidden();
        $this->assertEquals(FinancialActionRequest::STATUS_PENDING, $request->fresh()->status);
    }

    public function test_authorized_approver_can_approve_void_request(): void
    {
        $requester = $this->createUserWithPermission('transactions.void.request');
        $approver = $this->createUserWithPermission('transactions.void.approve');
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
                'note' => 'Disetujui untuk dibatalkan',
            ]);

        $response->assertRedirect();
        $this->assertEquals(FinancialActionRequest::STATUS_APPROVED, $request->fresh()->status);
    }

    public function test_approve_void_fills_voided_at_and_voided_by(): void
    {
        $requester = $this->createUserWithPermission('transactions.void.request');
        $approver = $this->createUserWithPermission('transactions.void.approve');
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

        $this->actingAs($approver)
            ->post(route('audit.action-requests.approve', $request), [
                'note' => 'Disetujui',
            ]);

        $transaction->refresh();
        $this->assertNotNull($transaction->voided_at);
        $this->assertEquals($approver->id, $transaction->voided_by);
    }

    public function test_voiding_dues_payment_also_voids_related_cash_transaction(): void
    {
        $requester = $this->createUserWithPermission('dues.void.request', 'dues.create');
        $approver = $this->createUserWithPermission('dues.void.approve');
        $member = Member::factory()->create();
        [$category, $method] = $this->setupMasters();

        $this->actingAs($requester)
            ->post(route('dues.payments.store'), [
                'member_id' => $member->id,
                'start_period' => '2026-01',
                'duration' => 1,
                'method' => 'cash',
                'paid_at' => '2026-07-08',
                'reference_no' => 'DUES-VOID-TEST',
            ]);

        $payment = DuesPayment::query()->first();
        $transaction = CashTransaction::query()->where('dues_payment_id', $payment->id)->first();

        $this->assertNotNull($payment);
        $this->assertNotNull($transaction);

        $this->actingAs($requester)
            ->post(route('dues.payments.void', $payment), [
                'reason' => 'Salah hitung iuran',
            ]);

        $request = FinancialActionRequest::query()
            ->where('actionable_type', $payment->getMorphClass())
            ->where('actionable_id', $payment->id)
            ->first();

        $this->assertNotNull($request);

        $this->actingAs($approver)
            ->post(route('audit.action-requests.approve', $request), [
                'note' => 'Disetujui',
            ]);

        $payment->refresh();
        $transaction->refresh();

        $this->assertNotNull($payment->voided_at);
        $this->assertNotNull($transaction->voided_at);
        $this->assertEquals($approver->id, $transaction->voided_by);
    }

    public function test_reject_does_not_modify_transaction(): void
    {
        $requester = $this->createUserWithPermission('transactions.void.request');
        $approver = $this->createUserWithPermission('transactions.void.approve');
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
            ->post(route('audit.action-requests.reject', $request), [
                'note' => 'Ditolak',
            ]);

        $response->assertRedirect();
        $this->assertEquals(FinancialActionRequest::STATUS_REJECTED, $request->fresh()->status);
        $this->assertNull($transaction->fresh()->voided_at);
    }

    private function createUserWithPermission(string ...$permissions): User
    {
        $user = User::factory()->create();
        foreach ($permissions as $perm) {
            $user->givePermissionTo($perm);
        }
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
