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
use App\Services\Dues\DuesLedgerService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceDatabaseIntegrityPhase1Test extends TestCase
{
    use RefreshDatabase;

    public function test_cash_transactions_receive_unique_internal_transaction_numbers(): void
    {
        $user = User::factory()->create();
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

        $first = CashTransaction::query()->create([
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'category_id' => $category->id,
            'method_id' => $method->id,
            'amount' => 100000,
            'reference_no' => 'BANK-REF-001',
            'created_by' => $user->id,
        ]);

        $second = CashTransaction::query()->create([
            'tx_date' => '2026-07-08 10:00:00',
            'type' => 'in',
            'category_id' => $category->id,
            'method_id' => $method->id,
            'amount' => 150000,
            'reference_no' => 'BANK-REF-001',
            'created_by' => $user->id,
        ]);

        $this->assertSame('TRX/2026/07/000001', $first->transaction_number);
        $this->assertSame('TRX/2026/07/000002', $second->transaction_number);
        $this->assertNotSame($first->transaction_number, $second->transaction_number);
        $this->assertSame('BANK-REF-001', $second->reference_no);
    }

    public function test_dues_payment_cash_transaction_receives_internal_transaction_number(): void
    {
        $user = User::factory()->create();
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

        $payment = (new DuesLedgerService())->storePayment([
            'member_id' => $member->id,
            'start_period' => '2026-01',
            'duration' => 1,
            'method' => 'cash',
            'paid_at' => '2026-07-08 09:00:00',
            'reference_no' => 'EXT-DUES-001',
            'notes' => null,
        ], $user->id);

        $transaction = CashTransaction::query()
            ->where('dues_payment_id', $payment->id)
            ->first();

        $this->assertNotNull($transaction);
        $this->assertSame('TRX/2026/07/000001', $transaction->transaction_number);
        $this->assertSame('EXT-DUES-001', $transaction->reference_no);
    }

    public function test_dues_allocation_unique_constraint_rejects_duplicate_member_period(): void
    {
        $user = User::factory()->create();
        $member = Member::factory()->create();

        $firstPayment = DuesPayment::query()->create([
            'dues_invoice_id' => null,
            'member_id' => $member->id,
            'paid_at' => '2026-07-08 09:00:00',
            'amount' => 1000,
            'method' => 'cash',
            'created_by' => $user->id,
        ]);
        $secondPayment = DuesPayment::query()->create([
            'dues_invoice_id' => null,
            'member_id' => $member->id,
            'paid_at' => '2026-07-08 10:00:00',
            'amount' => 1000,
            'method' => 'transfer',
            'created_by' => $user->id,
        ]);

        DuesPaymentAllocation::query()->create([
            'dues_payment_id' => $firstPayment->id,
            'member_id' => $member->id,
            'period_ym' => '2026-07',
            'amount' => 1000,
        ]);

        $this->expectException(QueryException::class);

        DuesPaymentAllocation::query()->create([
            'dues_payment_id' => $secondPayment->id,
            'member_id' => $member->id,
            'period_ym' => '2026-07',
            'amount' => 1000,
        ]);
    }
}
