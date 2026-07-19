<?php

namespace App\Actions\Dues;

use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\CashTransaction;
use App\Models\DuesPayment;

class SyncDuesPaymentToCashTransactionAction
{
    public function execute(DuesPayment $payment, int $userId): CashTransaction
    {
        $category = $this->resolveCashCategory();
        $methodId = $this->resolveCashMethodId($payment->method);
        $payment->loadMissing('member');
        $memberName = $payment->member?->full_name ?? 'Anggota';
        $memberNpa = $payment->member?->npa;
        $memberLabel = $memberNpa ? sprintf('%s (%s)', $memberName, $memberNpa) : $memberName;

        return CashTransaction::query()->create([
            'tx_date' => $payment->paid_at,
            'type' => 'in',
            'category_id' => $category->id,
            'method_id' => $methodId,
            'amount' => $payment->amount,
            'description' => sprintf('Pembayaran iuran anggota %s', $memberLabel),
            'reference_no' => $payment->reference_no,
            'member_id' => $payment->member_id,
            'dues_payment_id' => $payment->id,
            'created_by' => $userId,
        ]);
    }

    private function resolveCashCategory(): CashCategory
    {
        $category = CashCategory::query()
            ->where('is_active', true)
            ->where('type', 'in')
            ->where(function ($query) {
                $query->whereRaw('LOWER(code) = ?', ['dues'])
                    ->orWhereRaw('LOWER(name) = ?', ['iuran']);
            })
            ->first();

        if (! $category) {
            $category = CashCategory::query()
                ->where('is_active', true)
                ->where('type', 'in')
                ->orderBy('id')
                ->first();
        }

        if (! $category) {
            throw new \RuntimeException('Kategori kas untuk iuran belum tersedia.');
        }

        return $category;
    }

    private function resolveCashMethodId(?string $method): ?int
    {
        if (! $method) {
            return null;
        }

        $cashMethod = CashMethod::query()
            ->whereRaw('LOWER(name) = ?', [strtolower($method)])
            ->first();

        return $cashMethod?->id;
    }
}
