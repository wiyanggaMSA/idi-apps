<?php

namespace Tests\Feature\Finance;

use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\CashTransaction;
use App\Models\User;
use App\Services\Cash\CashReportService;
use App\Services\Cash\TransactionQueryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class FinanceReportingConsistencyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Permission::firstOrCreate(['name' => 'transactions.view', 'guard_name' => 'web']);
    }

    public function test_summary_total_matches_details_total(): void
    {
        [$inCategory, $outCategory, $method, $user] = $this->setupMasters();

        CashTransaction::factory()->create([
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'amount' => 150000,
            'category_id' => $inCategory->id,
            'method_id' => $method->id,
            'created_by' => $user->id,
        ]);

        CashTransaction::factory()->create([
            'tx_date' => '2026-07-08 10:00:00',
            'type' => 'out',
            'amount' => 50000,
            'category_id' => $outCategory->id,
            'method_id' => $method->id,
            'created_by' => $user->id,
        ]);

        $report = app(CashReportService::class)->build([
            'start_date' => '2026-07-08',
            'end_date' => '2026-07-08',
        ]);

        $summary = $report['totals'];
        $categories = $report['by_category'];

        $sumCategoryIn = collect($categories)->sum('total_in');
        $sumCategoryOut = collect($categories)->sum('total_out');

        $this->assertEquals($summary['total_in'], $sumCategoryIn);
        $this->assertEquals($summary['total_out'], $sumCategoryOut);
        $this->assertEquals($summary['net'], $summary['total_in'] - $summary['total_out']);
        $this->assertEquals($report['closing_balance'], $report['opening_balance'] + $summary['net']);
    }

    public function test_voided_transactions_are_not_calculated(): void
    {
        [$inCategory, , $method, $user] = $this->setupMasters();

        CashTransaction::factory()->create([
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'amount' => 100000,
            'category_id' => $inCategory->id,
            'method_id' => $method->id,
            'created_by' => $user->id,
            'voided_at' => now(),
            'voided_by' => $user->id,
        ]);

        $report = app(CashReportService::class)->build([
            'start_date' => '2026-07-08',
            'end_date' => '2026-07-08',
        ]);

        $this->assertEquals(0, $report['totals']['total_in']);
    }

    public function test_soft_deleted_transactions_are_not_calculated(): void
    {
        [$inCategory, , $method, $user] = $this->setupMasters();

        $tx = CashTransaction::factory()->create([
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'amount' => 100000,
            'category_id' => $inCategory->id,
            'method_id' => $method->id,
            'created_by' => $user->id,
        ]);

        $tx->delete();

        $report = app(CashReportService::class)->build([
            'start_date' => '2026-07-08',
            'end_date' => '2026-07-08',
        ]);

        $this->assertEquals(0, $report['totals']['total_in']);
    }

    public function test_export_query_is_consistent_with_report_query(): void
    {
        [$inCategory, $outCategory, $method, $user] = $this->setupMasters();

        $tx1 = CashTransaction::factory()->create([
            'tx_date' => '2026-07-08 09:00:00',
            'type' => 'in',
            'amount' => 200000,
            'category_id' => $inCategory->id,
            'method_id' => $method->id,
            'created_by' => $user->id,
        ]);

        $tx2 = CashTransaction::factory()->create([
            'tx_date' => '2026-07-08 10:00:00',
            'type' => 'out',
            'amount' => 50000,
            'category_id' => $outCategory->id,
            'method_id' => $method->id,
            'created_by' => $user->id,
        ]);

        $report = app(CashReportService::class)->build([
            'start_date' => '2026-07-08',
            'end_date' => '2026-07-08',
        ]);

        $exportQuery = CashTransaction::query()
            ->validForFinance()
            ->whereBetween('tx_date', [
                app(TransactionQueryService::class)->startOfReportDay('2026-07-08'),
                app(TransactionQueryService::class)->endOfReportDay('2026-07-08')
            ]);

        $exportTotalIn = (int) (clone $exportQuery)->where('type', 'in')->sum('amount');
        $exportTotalOut = (int) (clone $exportQuery)->where('type', 'out')->sum('amount');

        $this->assertEquals($report['totals']['total_in'], $exportTotalIn);
        $this->assertEquals($report['totals']['total_out'], $exportTotalOut);
    }

    public function test_date_filters_use_asia_jakarta_timezone(): void
    {
        [$inCategory, , $method, $user] = $this->setupMasters();

        $timezone = app(TransactionQueryService::class)->reportTimezone();
        $this->assertEquals('Asia/Jakarta', $timezone);

        $txTimeUTC = Carbon::parse('2026-07-08 23:30:00', 'Asia/Jakarta')->setTimezone('UTC');

        $tx = CashTransaction::factory()->create([
            'tx_date' => $txTimeUTC,
            'type' => 'in',
            'amount' => 100000,
            'category_id' => $inCategory->id,
            'method_id' => $method->id,
            'created_by' => $user->id,
        ]);

        $report = app(CashReportService::class)->build([
            'start_date' => '2026-07-08',
            'end_date' => '2026-07-08',
        ]);

        $this->assertEquals(100000, $report['totals']['total_in']);
    }

    private function setupMasters(): array
    {
        $inCategory = CashCategory::query()->create([
            'type' => 'in',
            'name' => 'Donasi',
            'code' => 'donation',
            'is_active' => true,
        ]);

        $outCategory = CashCategory::query()->create([
            'type' => 'out',
            'name' => 'Operasional',
            'code' => 'operational',
            'is_active' => true,
        ]);

        $method = CashMethod::query()->create([
            'name' => 'cash',
            'is_active' => true,
        ]);

        $user = User::factory()->create();

        return [$inCategory, $outCategory, $method, $user];
    }
}
