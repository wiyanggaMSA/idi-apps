<?php

use Carbon\CarbonImmutable;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $this->ensureNoDuplicateDuesAllocations();

        Schema::create('cash_transaction_number_sequences', function (Blueprint $table) {
            $table->id();
            $table->string('year_month', 7)->unique();
            $table->unsignedInteger('last_number')->default(0);
            $table->timestamps();
        });

        Schema::table('cash_transactions', function (Blueprint $table) {
            $table->string('transaction_number')->nullable()->after('id');
        });

        $this->backfillCashTransactionNumbers();

        Schema::table('cash_transactions', function (Blueprint $table) {
            $table->unique('transaction_number', 'cash_transactions_transaction_number_unique');
        });

        Schema::table('dues_payment_allocations', function (Blueprint $table) {
            $table->unique(['member_id', 'period_ym'], 'dues_allocations_member_period_unique');
        });
    }

    public function down(): void
    {
        Schema::table('dues_payment_allocations', function (Blueprint $table) {
            $table->dropUnique('dues_allocations_member_period_unique');
        });

        Schema::table('cash_transactions', function (Blueprint $table) {
            $table->dropUnique('cash_transactions_transaction_number_unique');
            $table->dropColumn('transaction_number');
        });

        Schema::dropIfExists('cash_transaction_number_sequences');
    }

    private function ensureNoDuplicateDuesAllocations(): void
    {
        /*
         * Manual preflight query:
         *
         * SELECT member_id, period_ym, COUNT(*) AS duplicate_count
         * FROM dues_payment_allocations
         * GROUP BY member_id, period_ym
         * HAVING COUNT(*) > 1;
         *
         * This migration intentionally refuses to continue when duplicates exist.
         * It never deletes or merges financial data automatically.
         */
        $duplicates = DB::table('dues_payment_allocations')
            ->select('member_id', 'period_ym', DB::raw('COUNT(*) as duplicate_count'))
            ->groupBy('member_id', 'period_ym')
            ->havingRaw('COUNT(*) > 1')
            ->limit(10)
            ->get();

        if ($duplicates->isNotEmpty()) {
            $sample = $duplicates
                ->map(fn ($row) => sprintf(
                    'member_id=%s period_ym=%s count=%s',
                    $row->member_id,
                    $row->period_ym,
                    $row->duplicate_count
                ))
                ->implode('; ');

            throw new RuntimeException(
                'Duplicate dues allocations detected. Resolve them manually before running this migration: '.$sample
            );
        }
    }

    private function backfillCashTransactionNumbers(): void
    {
        $lastNumbers = [];

        DB::table('cash_transactions')
            ->whereNull('transaction_number')
            ->orderBy('tx_date')
            ->orderBy('id')
            ->select(['id', 'tx_date'])
            ->lazy()
            ->each(function ($transaction) use (&$lastNumbers) {
                $yearMonth = CarbonImmutable::parse($transaction->tx_date)->format('Y-m');
                $nextNumber = ($lastNumbers[$yearMonth] ?? 0) + 1;
                $lastNumbers[$yearMonth] = $nextNumber;

                DB::table('cash_transactions')
                    ->where('id', $transaction->id)
                    ->update([
                        'transaction_number' => sprintf(
                            'TRX/%s/%s/%06d',
                            substr($yearMonth, 0, 4),
                            substr($yearMonth, 5, 2),
                            $nextNumber
                        ),
                    ]);
            });

        foreach ($lastNumbers as $yearMonth => $lastNumber) {
            DB::table('cash_transaction_number_sequences')->insert([
                'year_month' => $yearMonth,
                'last_number' => $lastNumber,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
};
