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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class FinanceConcurrencyProtectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_dues_payment_normal_submit_succeeds(): void
    {
        [$user, $member] = $this->duesSetup();

        $payment = (new DuesLedgerService())->storePayment($this->duesPayload($member), $user->id);

        $this->assertSame(1000, $payment->amount);
        $this->assertSame(1, DuesPayment::query()->count());
        $this->assertSame(1, DuesPaymentAllocation::query()->count());
        $this->assertSame(1, CashTransaction::query()->where('dues_payment_id', $payment->id)->count());
    }

    public function test_dues_payment_lock_rejects_duplicate_submit_while_processing(): void
    {
        [$user, $member] = $this->duesSetup();
        $lock = Cache::lock("dues_payment_{$member->id}_2026-01", 10);

        $this->assertTrue($lock->get());

        try {
            try {
                (new DuesLedgerService())->storePayment($this->duesPayload($member), $user->id);
                $this->fail('Locked dues payment submit should fail.');
            } catch (\RuntimeException $exception) {
                $this->assertSame(
                    'Pembayaran sedang diproses. Mohon jangan submit berulang.',
                    $exception->getMessage()
                );
            }
        } finally {
            $lock->release();
        }

        $this->assertSame(0, DuesPayment::query()->count());
    }

    public function test_dues_payment_same_period_twice_only_persists_first_payment(): void
    {
        [$user, $member] = $this->duesSetup();
        $service = new DuesLedgerService();

        $service->storePayment($this->duesPayload($member), $user->id);

        try {
            $service->storePayment($this->duesPayload($member), $user->id);
            $this->fail('Second payment for the same member and period should fail.');
        } catch (\RuntimeException $exception) {
            $this->assertSame(
                'Periode mulai harus mengikuti bulan iuran saat ini (2026-02).',
                $exception->getMessage()
            );
        }

        $this->assertSame(1, DuesPayment::query()->count());
        $this->assertSame(1, DuesPaymentAllocation::query()->count());
    }

    public function test_cash_transaction_store_lock_rejects_duplicate_submit_while_processing(): void
    {
        $user = User::factory()->create();
        Permission::firstOrCreate(['name' => 'transactions.create', 'guard_name' => 'web']);
        $user->givePermissionTo('transactions.create');

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
        $payload = [
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'category_id' => $category->id,
            'method_id' => $method->id,
            'amount' => 100000,
            'description' => 'Transaksi kas',
            'reference_no' => 'REF-LOCK',
        ];
        $lockKey = 'cash_transaction_store_'.$user->id.'_'.sha1(json_encode([
            'tx_date' => $payload['tx_date'],
            'type' => $payload['type'],
            'category_id' => $payload['category_id'],
            'method_id' => $payload['method_id'],
            'amount' => $payload['amount'],
            'reference_no' => $payload['reference_no'],
        ]));
        $lock = Cache::lock($lockKey, 10);

        $this->assertTrue($lock->get());

        try {
            $this->actingAs($user)
                ->post(route('transactions.store'), $payload)
                ->assertRedirect()
                ->assertSessionHasErrors('transaction');
        } finally {
            $lock->release();
        }

        $this->assertSame(0, CashTransaction::query()->count());
    }

    public function test_cash_transaction_numbers_remain_unique_for_repeated_submits(): void
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
            'created_by' => $user->id,
        ]);
        $second = CashTransaction::query()->create([
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'category_id' => $category->id,
            'method_id' => $method->id,
            'amount' => 100000,
            'created_by' => $user->id,
        ]);

        $this->assertNotSame($first->transaction_number, $second->transaction_number);
    }

    /**
     * @return array{0: User, 1: Member}
     */
    private function duesSetup(): array
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

        return [$user, $member];
    }

    private function duesPayload(Member $member): array
    {
        return [
            'member_id' => $member->id,
            'start_period' => '2026-01',
            'duration' => 1,
            'method' => 'cash',
            'paid_at' => '2026-07-08',
            'reference_no' => 'DUES-LOCK',
            'notes' => null,
        ];
    }
}
