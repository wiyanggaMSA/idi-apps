<?php

namespace Tests\Feature\Finance;

use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\CashTransaction;
use App\Models\DuesSetting;
use App\Models\FinancialActionRequest;
use App\Models\FinancePeriod;
use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class FinancePeriodLockingPhase7Test extends TestCase
{
    use RefreshDatabase;

    public function test_cash_transaction_can_be_created_in_open_period(): void
    {
        [$user, $category, $method] = $this->cashSetup('transactions.create');

        $this->actingAs($user)
            ->post(route('transactions.store'), $this->cashPayload($category, $method))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(1, CashTransaction::query()->count());
    }

    public function test_cash_transaction_cannot_be_created_in_closed_period(): void
    {
        [$user, $category, $method] = $this->cashSetup('transactions.create');
        $this->closedPeriod(2026, 7, $user);

        $this->actingAs($user)
            ->post(route('transactions.store'), $this->cashPayload($category, $method))
            ->assertRedirect()
            ->assertSessionHasErrors('transaction');

        $this->assertSame(0, CashTransaction::query()->count());
    }

    public function test_dues_payment_cannot_be_created_in_closed_period(): void
    {
        [$user, $member] = $this->duesSetup('dues.create');
        $this->closedPeriod(2026, 7, $user);

        $this->actingAs($user)
            ->post(route('dues.payments.store'), [
                'member_id' => $member->id,
                'start_period' => '2026-01',
                'duration' => 1,
                'method' => 'cash',
                'paid_at' => '2026-07-08 09:00:00',
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('payment');
    }

    public function test_void_request_fails_for_closed_period(): void
    {
        [$user, $category, $method] = $this->cashSetup('transactions.void.request');
        $transaction = $this->cashTransaction($user, $category, $method);
        $this->closedPeriod(2026, 7, $user);

        $this->actingAs($user)
            ->delete(route('transactions.destroy', $transaction), [
                'reason' => 'Salah input',
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('transaction');

        $this->assertNull($transaction->fresh()->voided_at);
    }

    public function test_transaction_metadata_update_fails_for_closed_period(): void
    {
        [$user, $category, $method] = $this->cashSetup('transactions.update');
        $transaction = $this->cashTransaction($user, $category, $method);
        $this->closedPeriod(2026, 7, $user);

        $this->actingAs($user)
            ->patch(route('transactions.update', $transaction), [
                'description' => 'Catatan baru',
                'reference_no' => 'REF-UPDATED',
                'reason' => 'Update metadata',
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('transaction');

        $this->assertSame('Transaksi periode', $transaction->fresh()->description);
    }

    public function test_pending_void_approval_fails_if_period_is_closed_before_review(): void
    {
        [$requester, $category, $method] = $this->cashSetup('transactions.void.request');
        $reviewer = $this->userWithPermissions('transactions.void.approve');
        $transaction = $this->cashTransaction($requester, $category, $method);

        $actionRequest = FinancialActionRequest::query()->create([
            'actionable_type' => $transaction->getMorphClass(),
            'actionable_id' => $transaction->id,
            'action' => FinancialActionRequest::ACTION_VOID,
            'status' => FinancialActionRequest::STATUS_PENDING,
            'reason' => 'Salah input',
            'requested_by' => $requester->id,
        ]);

        $this->closedPeriod(2026, 7, $requester);

        $this->actingAs($reviewer)
            ->post(route('audit.action-requests.approve', $actionRequest), [
                'note' => 'Approve',
            ])
            ->assertRedirect()
            ->assertSessionHasErrors('approval');

        $this->assertSame(FinancialActionRequest::STATUS_PENDING, $actionRequest->fresh()->status);
        $this->assertNull($transaction->fresh()->voided_at);
    }

    public function test_user_without_permission_cannot_close_period(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('finance.periods.close', ['year' => 2026, 'month' => 7]), [
                'notes' => 'Closing Juli',
            ])
            ->assertForbidden();

        $this->assertSame(0, FinancePeriod::query()->count());
    }

    public function test_user_with_permission_can_close_period_without_changing_existing_transactions(): void
    {
        [$user, $category, $method] = $this->cashSetup('finance.period.close');
        $transaction = $this->cashTransaction($user, $category, $method);

        $this->actingAs($user)
            ->post(route('finance.periods.close', ['year' => 2026, 'month' => 7]), [
                'notes' => 'Closing Juli 2026',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $period = FinancePeriod::query()->where('period_year', 2026)->where('period_month', 7)->first();
        $this->assertNotNull($period);
        $this->assertSame(FinancePeriod::STATUS_CLOSED, $period->status);
        $this->assertSame($user->id, $period->closed_by);
        $this->assertNotNull($period->closed_at);
        $this->assertSame(100000, $transaction->fresh()->amount);
        $this->assertNull($transaction->fresh()->voided_at);
    }

    public function test_cash_report_for_closed_period_remains_readable(): void
    {
        [$user, $category, $method] = $this->cashSetup('reports.cash.view');
        $this->cashTransaction($user, $category, $method);
        $this->closedPeriod(2026, 7, $user);

        $this->actingAs($user)
            ->get(route('reports.cash', [
                'start_date' => '2026-07-01',
                'end_date' => '2026-07-31',
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Reports/Cash')
                ->where('period_status.is_closed', true)
                ->where('summary.total_in', 100000)
            );
    }

    private function closedPeriod(int $year, int $month, User $user): FinancePeriod
    {
        return FinancePeriod::query()->create([
            'period_year' => $year,
            'period_month' => $month,
            'status' => FinancePeriod::STATUS_CLOSED,
            'closed_at' => now(),
            'closed_by' => $user->id,
            'notes' => 'Closed for test',
        ]);
    }

    /**
     * @return array{0: User, 1: CashCategory, 2: CashMethod}
     */
    private function cashSetup(string ...$permissions): array
    {
        $user = $this->userWithPermissions(...$permissions);
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

        return [$user, $category, $method];
    }

    /**
     * @return array{0: User, 1: Member}
     */
    private function duesSetup(string ...$permissions): array
    {
        $user = $this->userWithPermissions(...$permissions);
        $member = Member::factory()->create();

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

    private function cashPayload(CashCategory $category, CashMethod $method): array
    {
        return [
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'category_id' => $category->id,
            'method_id' => $method->id,
            'amount' => 100000,
            'description' => 'Transaksi periode',
        ];
    }

    private function cashTransaction(User $user, CashCategory $category, CashMethod $method): CashTransaction
    {
        return CashTransaction::query()->create(array_merge($this->cashPayload($category, $method), [
            'created_by' => $user->id,
        ]));
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
}
