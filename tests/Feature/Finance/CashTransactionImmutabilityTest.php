<?php

namespace Tests\Feature\Finance;

use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\CashTransaction;
use App\Models\DuesPayment;
use App\Models\Member;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class CashTransactionImmutabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_financial_fields_cannot_be_changed_after_cash_transaction_is_posted(): void
    {
        $user = $this->financeUser();
        [$incomeCategory, $expenseCategory, $cashMethod, $transferMethod] = $this->financeMasters();
        $transaction = $this->cashTransaction($user, $incomeCategory, $cashMethod);

        $attempts = [
            'amount' => ['amount' => 999999],
            'type' => ['type' => 'out'],
            'tx_date' => ['tx_date' => '2026-07-09 09:00:00'],
            'category_id' => ['category_id' => $expenseCategory->id],
            'method_id' => ['method_id' => $transferMethod->id],
        ];

        foreach ($attempts as $field => $override) {
            $this->actingAs($user)
                ->patch(route('transactions.update', $transaction), array_merge(
                    $this->metadataPayload(),
                    $override,
                ))
                ->assertSessionHasErrors('transaction');

            $transaction->refresh();

            $this->assertSame(100000, $transaction->amount, "Amount changed during {$field} attempt.");
            $this->assertSame('in', $transaction->type, "Type changed during {$field} attempt.");
            $this->assertSame('2026-07-08 09:00:00', $transaction->tx_date->format('Y-m-d H:i:s'), "Date changed during {$field} attempt.");
            $this->assertSame($incomeCategory->id, $transaction->category_id, "Category changed during {$field} attempt.");
            $this->assertSame($cashMethod->id, $transaction->method_id, "Method changed during {$field} attempt.");
        }
    }

    public function test_non_financial_fields_can_be_changed_and_are_audited(): void
    {
        $user = $this->financeUser();
        [$category, , $method] = $this->financeMasters();
        $transaction = $this->cashTransaction($user, $category, $method);

        $this->actingAs($user)
            ->patch(route('transactions.update', $transaction), [
                'description' => 'Keterangan administratif diperbarui',
                'reference_no' => 'BANK-REF-UPDATED',
                'reason' => 'Melengkapi keterangan audit',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $transaction->refresh();
        $this->assertSame('Keterangan administratif diperbarui', $transaction->description);
        $this->assertSame('BANK-REF-UPDATED', $transaction->reference_no);
        $this->assertSame(100000, $transaction->amount);

        $activity = Activity::query()
            ->where('log_name', 'finance')
            ->where('description', 'cash_transaction.updated')
            ->latest('id')
            ->first();

        $this->assertNotNull($activity);
        $this->assertSame($user->id, (int) $activity->causer_id);
        $this->assertSame('Melengkapi keterangan audit', $activity->properties['reason']);
        $this->assertSame('Transaksi awal', $activity->properties['changes']['description']['before']);
        $this->assertSame('Keterangan administratif diperbarui', $activity->properties['changes']['description']['after']);
        $this->assertSame('BANK-REF-001', $activity->properties['changes']['reference_no']['before']);
        $this->assertSame('BANK-REF-UPDATED', $activity->properties['changes']['reference_no']['after']);
    }

    public function test_dues_generated_cash_transaction_still_cannot_be_edited_manually(): void
    {
        $user = $this->financeUser();
        [$category, , $method] = $this->financeMasters();
        $member = Member::factory()->create();
        $payment = DuesPayment::query()->create([
            'dues_invoice_id' => null,
            'member_id' => $member->id,
            'paid_at' => '2026-07-08 09:00:00',
            'amount' => 100000,
            'method' => 'cash',
            'created_by' => $user->id,
        ]);
        $transaction = $this->cashTransaction($user, $category, $method, [
            'dues_payment_id' => $payment->id,
        ]);

        $this->actingAs($user)
            ->patch(route('transactions.update', $transaction), [
                'description' => 'Percobaan edit iuran',
                'reference_no' => 'REF-DUES-EDIT',
                'reason' => 'Percobaan manual',
            ])
            ->assertForbidden();

        $this->assertSame('Transaksi awal', $transaction->fresh()->description);
    }

    private function financeUser(): User
    {
        $user = User::factory()->create();
        Permission::firstOrCreate(['name' => 'transactions.update', 'guard_name' => 'web']);
        $user->givePermissionTo('transactions.update');

        return $user;
    }

    /**
     * @return array{0: CashCategory, 1: CashCategory, 2: CashMethod, 3: CashMethod}
     */
    private function financeMasters(): array
    {
        $incomeCategory = CashCategory::query()->create([
            'type' => 'in',
            'name' => 'Donasi',
            'code' => 'donation',
            'is_active' => true,
        ]);
        $expenseCategory = CashCategory::query()->create([
            'type' => 'out',
            'name' => 'Operasional',
            'code' => 'ops',
            'is_active' => true,
        ]);
        $cashMethod = CashMethod::query()->create([
            'name' => 'cash',
            'is_active' => true,
        ]);
        $transferMethod = CashMethod::query()->create([
            'name' => 'transfer',
            'is_active' => true,
        ]);

        return [$incomeCategory, $expenseCategory, $cashMethod, $transferMethod];
    }

    private function cashTransaction(User $user, CashCategory $category, CashMethod $method, array $override = []): CashTransaction
    {
        return CashTransaction::query()->create(array_merge([
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'category_id' => $category->id,
            'method_id' => $method->id,
            'amount' => 100000,
            'description' => 'Transaksi awal',
            'reference_no' => 'BANK-REF-001',
            'created_by' => $user->id,
        ], $override));
    }

    private function metadataPayload(): array
    {
        return [
            'description' => 'Keterangan baru',
            'reference_no' => 'BANK-REF-002',
            'reason' => 'Percobaan mengubah field finansial',
        ];
    }
}
