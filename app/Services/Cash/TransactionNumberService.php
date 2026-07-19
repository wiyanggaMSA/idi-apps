<?php

namespace App\Services\Cash;

use Carbon\CarbonInterface;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class TransactionNumberService
{
    public function generate(CarbonInterface|string|null $txDate = null): string
    {
        $yearMonth = $this->normalizeYearMonth($txDate);

        return DB::transaction(function () use ($yearMonth) {
            DB::table('cash_transaction_number_sequences')->insertOrIgnore([
                'year_month' => $yearMonth,
                'last_number' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $sequence = DB::table('cash_transaction_number_sequences')
                ->where('year_month', $yearMonth)
                ->lockForUpdate()
                ->first();

            $nextNumber = ((int) $sequence->last_number) + 1;

            DB::table('cash_transaction_number_sequences')
                ->where('year_month', $yearMonth)
                ->update([
                    'last_number' => $nextNumber,
                    'updated_at' => now(),
                ]);

            return sprintf(
                'TRX/%s/%s/%06d',
                substr($yearMonth, 0, 4),
                substr($yearMonth, 5, 2),
                $nextNumber
            );
        });
    }

    private function normalizeYearMonth(CarbonInterface|string|null $txDate): string
    {
        if ($txDate instanceof CarbonInterface) {
            return $txDate->format('Y-m');
        }

        if (is_string($txDate) && trim($txDate) !== '') {
            return CarbonImmutable::parse($txDate)->format('Y-m');
        }

        return now()->format('Y-m');
    }
}
