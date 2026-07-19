<?php

namespace App\Actions\Dues;

use App\Models\CashTransaction;
use App\Models\DuesPayment;
use App\Services\Finance\FinancePeriodService;

class VoidDuesPaymentAction
{
    public function __construct(private readonly FinancePeriodService $financePeriodService)
    {
    }

    public function execute(DuesPayment $payment, string $reason, int $userId): DuesPayment
    {
        if ($payment->voided_at) {
            throw new \RuntimeException('Pembayaran sudah dibatalkan.');
        }

        $this->financePeriodService->ensureOpen(
            $payment->paid_at,
            'Periode pembayaran sudah closed. Void hanya dapat dilakukan melalui adjustment pada periode open.'
        );

        $payment->update([
            'voided_at' => now(),
            'void_reason' => $reason,
            'updated_by' => $userId,
        ]);

        $transaction = CashTransaction::query()->where('dues_payment_id', $payment->id)->first();
        if ($transaction) {
            $transaction->update([
                'voided_at' => now(),
                'voided_by' => $userId,
            ]);
        }

        return $payment;
    }
}
