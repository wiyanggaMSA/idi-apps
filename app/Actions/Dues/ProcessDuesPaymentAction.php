<?php

namespace App\Actions\Dues;

use App\Models\CashTransaction;
use App\Models\DuesPayment;
use App\Models\DuesPaymentAllocation;
use App\Models\DuesPeriod;
use App\Models\DuesSetting;
use App\Services\Finance\FinancePeriodService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ProcessDuesPaymentAction
{
    public function __construct(
        private readonly CalculateMemberDuesAction $calculateMemberDues,
        private readonly SyncDuesPaymentToCashTransactionAction $syncCashTransaction,
        private readonly FinancePeriodService $financePeriodService
    ) {
    }

    public function execute(array $payload, int $userId): DuesPayment
    {
        $this->financePeriodService->ensureOpen(
            $payload['paid_at'],
            'Periode pembayaran sudah closed. Gunakan adjustment pada periode yang masih open.'
        );

        $memberId = (int) $payload['member_id'];
        $startPeriod = $payload['start_period'];
        $lock = Cache::lock($this->lockKey($memberId, $startPeriod), 10);

        if (! $lock->get()) {
            throw new \RuntimeException('Pembayaran sedang diproses. Mohon jangan submit berulang.');
        }

        try {
            return $this->storePaymentWhileLocked($payload, $userId, $memberId, $startPeriod);
        } finally {
            $lock->release();
        }
    }

    private function storePaymentWhileLocked(array $payload, int $userId, int $memberId, string $startPeriod): DuesPayment
    {
        $duesStartPeriod = $this->duesStartPeriod();
        $duration = (int) $payload['duration'];
        $monthlyAmount = $this->monthlyAmount();
        $endPeriod = Carbon::createFromFormat('Y-m', $startPeriod)->addMonths($duration - 1)->format('Y-m');
        $activePeriod = $this->activePeriod();

        $existingPeriods = DuesPaymentAllocation::query()
            ->select('dues_payment_allocations.period_ym')
            ->join('dues_payments', 'dues_payments.id', '=', 'dues_payment_allocations.dues_payment_id')
            ->whereNull('dues_payments.voided_at')
            ->where('dues_payment_allocations.member_id', $memberId)
            ->pluck('dues_payment_allocations.period_ym')
            ->unique()
            ->values();

        $dueNow = $this->calculateMemberDues->dueNow($existingPeriods, $duesStartPeriod, $activePeriod);
        if ($dueNow && $startPeriod !== $dueNow) {
            throw new \RuntimeException(sprintf(
                'Periode mulai harus mengikuti bulan iuran saat ini (%s).',
                $dueNow
            ));
        }

        $hasOverlap = DuesPaymentAllocation::query()
            ->join('dues_payments', 'dues_payments.id', '=', 'dues_payment_allocations.dues_payment_id')
            ->whereNull('dues_payments.voided_at')
            ->where('dues_payment_allocations.member_id', $memberId)
            ->whereBetween('dues_payment_allocations.period_ym', [$startPeriod, $endPeriod])
            ->exists();

        if ($hasOverlap) {
            throw new \RuntimeException('Periode yang dipilih sudah pernah dibayarkan. Pilih bulan yang belum terbayar.');
        }

        return DB::transaction(function () use ($payload, $memberId, $startPeriod, $duration, $monthlyAmount, $userId) {
            $payment = DuesPayment::query()->create([
                'dues_invoice_id' => null,
                'member_id' => $memberId,
                'paid_at' => $payload['paid_at'],
                'amount' => $monthlyAmount * $duration,
                'method' => $payload['method'],
                'reference_no' => $payload['reference_no'] ?? null,
                'notes' => $payload['notes'] ?? null,
                'created_by' => $userId,
            ]);

            $allocations = [];
            $cursor = Carbon::createFromFormat('Y-m', $startPeriod)->startOfMonth();
            for ($i = 0; $i < $duration; $i++) {
                $allocations[] = [
                    'dues_payment_id' => $payment->id,
                    'member_id' => $memberId,
                    'period_ym' => $cursor->format('Y-m'),
                    'amount' => $monthlyAmount,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                $cursor->addMonth();
            }

            DuesPaymentAllocation::query()->insert($allocations);
            $this->syncCashTransaction->execute($payment, $userId);

            activity('finance')
                ->causedBy($userId)
                ->performedOn($payment)
                ->withProperties([
                    'attributes' => $this->paymentSnapshot($payment->fresh(['member', 'allocations'])),
                    'periods' => collect($allocations)->pluck('period_ym')->values(),
                ])
                ->log('dues_payment.created');

            return $payment;
        });
    }

    private function activePeriod(): string
    {
        return max(now()->format('Y-m'), $this->duesStartPeriod());
    }

    private function duesStartPeriod(): string
    {
        $configured = (string) (DuesSetting::query()->value('dues_start_period') ?? '');
        if (preg_match('/^\d{4}-\d{2}$/', $configured) === 1) {
            return $configured;
        }

        $detectedStart = collect([
            DuesPeriod::query()->min('period'),
            DuesPaymentAllocation::query()->min('period_ym'),
        ])->filter()->min();

        if (is_string($detectedStart) && preg_match('/^\d{4}-\d{2}$/', $detectedStart) === 1) {
            return $detectedStart;
        }

        return now()->format('Y-m');
    }

    private function monthlyAmount(): int
    {
        return (int) (DuesSetting::query()->value('dues_amount') ?? 0);
    }

    private function lockKey(int $memberId, string $startPeriod): string
    {
        return sprintf('dues_payment_%d_%s', $memberId, $startPeriod);
    }

    private function paymentSnapshot(?DuesPayment $payment): array
    {
        if (! $payment) {
            return [];
        }

        $cashTransaction = CashTransaction::query()
            ->where('dues_payment_id', $payment->id)
            ->first(['id', 'transaction_number', 'voided_at']);

        return [
            'id' => $payment->id,
            'member_id' => $payment->member_id,
            'member_name' => $payment->member?->full_name,
            'paid_at' => optional($payment->paid_at)->format('Y-m-d H:i:s'),
            'amount' => $payment->amount,
            'method' => $payment->method,
            'reference_no' => $payment->reference_no,
            'notes' => $payment->notes,
            'periods' => $payment->allocations?->pluck('period_ym')->values(),
            'voided_at' => optional($payment->voided_at)->format('Y-m-d H:i:s'),
            'void_reason' => $payment->void_reason,
            'cash_transaction_id' => $cashTransaction?->id,
            'cash_transaction_number' => $cashTransaction?->transaction_number,
            'cash_transaction_voided_at' => optional($cashTransaction?->voided_at)->format('Y-m-d H:i:s'),
        ];
    }
}
