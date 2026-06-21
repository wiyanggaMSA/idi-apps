<?php

namespace Tests\Feature;

use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\DuesPayment;
use App\Models\DuesPaymentAllocation;
use App\Models\DuesSetting;
use App\Models\Member;
use App\Models\User;
use App\Services\Dues\DuesLedgerService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class DuesLedgerTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_payment_creates_allocations(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 2, 10));

        $user = User::factory()->create();
        Permission::firstOrCreate(['name' => 'dues.manage', 'guard_name' => 'web']);
        $user->givePermissionTo('dues.manage');

        DuesSetting::create(['dues_amount' => 1000, 'dues_start_period' => '2026-01']);
        CashCategory::create(['type' => 'in', 'name' => 'Iuran', 'code' => 'dues', 'is_active' => true]);
        CashMethod::create(['name' => 'cash', 'is_active' => true]);

        $member = Member::factory()->create();

        $this->actingAs($user)
            ->post(route('dues.payments.store'), [
                'member_id' => $member->id,
                'start_period' => '2026-01',
                'duration' => 24,
                'method' => 'cash',
                'paid_at' => '2026-02-10',
                'reference_no' => 'INV-001',
                'notes' => 'Test pembayaran',
            ])
            ->assertRedirect();

        $payment = DuesPayment::query()->first();
        $this->assertNotNull($payment);
        $this->assertSame(24000, $payment->amount);
        $this->assertCount(24, DuesPaymentAllocation::query()->where('dues_payment_id', $payment->id)->get());
    }

    public function test_creating_payment_accepts_duration_above_thirty_six_months(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 2, 10));

        $user = User::factory()->create();
        Permission::firstOrCreate(['name' => 'dues.manage', 'guard_name' => 'web']);
        $user->givePermissionTo('dues.manage');

        DuesSetting::create(['dues_amount' => 1000, 'dues_start_period' => '2026-01']);
        CashCategory::create(['type' => 'in', 'name' => 'Iuran', 'code' => 'dues', 'is_active' => true]);
        CashMethod::create(['name' => 'cash', 'is_active' => true]);

        $member = Member::factory()->create();

        $this->actingAs($user)
            ->post(route('dues.payments.store'), [
                'member_id' => $member->id,
                'start_period' => '2026-01',
                'duration' => 48,
                'method' => 'cash',
                'paid_at' => '2026-02-10',
                'reference_no' => 'INV-048',
                'notes' => 'Pembayaran empat tahun',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $payment = DuesPayment::query()->first();
        $this->assertNotNull($payment);
        $this->assertSame(48000, $payment->amount);
        $this->assertCount(48, DuesPaymentAllocation::query()->where('dues_payment_id', $payment->id)->get());

        Cache::flush();
        $payload = (new DuesLedgerService())->buildIndexPayload([
            'search' => null,
            'status' => 'ALL',
            'arrears_only' => false,
            'advance_only' => false,
        ], 1, 10);

        $row = collect($payload['dues']['data'])->firstWhere('member_id', $member->id);
        $this->assertSame('2029-12', $row['paid_through']);
        $this->assertSame(46, $row['advance_months']);
    }

    public function test_void_payment_excludes_allocations_from_metrics(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 3, 15));

        $user = User::factory()->create();
        Permission::firstOrCreate(['name' => 'dues.manage', 'guard_name' => 'web']);

        DuesSetting::create(['dues_amount' => 1000, 'dues_start_period' => '2026-01']);
        CashCategory::create(['type' => 'in', 'name' => 'Iuran', 'code' => 'dues', 'is_active' => true]);

        $member = Member::factory()->create();
        $service = new DuesLedgerService();

        $payment = $service->storePayment([
            'member_id' => $member->id,
            'start_period' => '2026-01',
            'duration' => 2,
            'method' => 'cash',
            'paid_at' => '2026-02-01',
            'reference_no' => null,
            'notes' => null,
        ], $user->id);

        Cache::flush();
        $payload = $service->buildIndexPayload([
            'search' => null,
            'status' => 'ALL',
            'arrears_only' => false,
            'advance_only' => false,
        ], 1, 10);

        $row = collect($payload['dues']['data'])->firstWhere('member_id', $member->id);
        $this->assertSame('2026-02', $row['paid_through']);
        $this->assertSame('2026-03', $row['due_now']);

        $service->voidPayment($payment, 'Pembayaran dibatalkan', $user->id);

        Cache::flush();
        $payload = $service->buildIndexPayload([
            'search' => null,
            'status' => 'ALL',
            'arrears_only' => false,
            'advance_only' => false,
        ], 1, 10);

        $row = collect($payload['dues']['data'])->firstWhere('member_id', $member->id);
        $this->assertNull($row['paid_through']);
        $this->assertSame('2026-01', $row['due_now']);
        $this->assertSame(2, $row['arrears_months']);
    }
}
