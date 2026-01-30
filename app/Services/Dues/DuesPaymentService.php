<?php

namespace App\Services\Dues;

use App\Models\CashCategory;
use App\Models\CashTransaction;
use App\Models\DuesInvoice;
use App\Models\DuesPayment;
use App\Models\DuesSetting;
use App\Models\PaymentStatus;
use Carbon\Carbon;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DuesPaymentService
{
    public function applyPayment(DuesInvoice $invoice, array $payload): array
    {
        $applyToYear = (bool) Arr::get($payload, 'apply_to_year', false);
        $year = Arr::get($payload, 'apply_year');

        return DB::transaction(function () use ($invoice, $payload, $applyToYear, $year) {
            $payments = [];

            if ($applyToYear && $year) {
                $invoices = $this->yearlyInvoices($invoice->member_id, (int) $year);
                $payments = $this->applyAmountToInvoices($invoices, $payload);
            } else {
                $payments[] = $this->applyAmountToInvoice($invoice, $payload);
            }

            return $payments;
        });
    }

    /**
     * @return Collection<int, DuesInvoice>
     */
    private function yearlyInvoices(int $memberId, int $year): Collection
    {
        return DuesInvoice::query()
            ->where('member_id', $memberId)
            ->whereHas('period', function ($query) use ($year) {
                $query->where('period', 'like', sprintf('%d-%%', $year));
            })
            ->orderBy('due_date')
            ->get();
    }

    /**
     * @param Collection<int, DuesInvoice> $invoices
     * @return array<int, DuesPayment>
     */
    private function applyAmountToInvoices(Collection $invoices, array $payload): array
    {
        $remaining = (int) $payload['amount'];
        $payments = [];

        foreach ($invoices as $invoice) {
            if ($remaining <= 0) {
                break;
            }

            $outstanding = max($invoice->amount_due - $invoice->amount_paid, 0);
            if ($outstanding <= 0) {
                continue;
            }

            $amount = min($remaining, $outstanding);
            $payload['amount'] = $amount;
            $payments[] = $this->applyAmountToInvoice($invoice, $payload, true);
            $remaining -= $amount;
        }

        return $payments;
    }

    private function applyAmountToInvoice(DuesInvoice $invoice, array $payload, bool $isYearly = false): DuesPayment
    {
        $settings = DuesSetting::query()->first();
        $allowPartial = $settings?->allow_partial ?? true;

        $outstanding = max($invoice->amount_due - $invoice->amount_paid, 0);
        if ($outstanding <= 0) {
            throw new \RuntimeException('Tagihan iuran sudah lunas.');
        }

        $amount = (int) $payload['amount'];
        if (! $allowPartial) {
            $amount = max($amount, $outstanding);
        }
        $amount = min($amount, $outstanding);

        $paidAt = Carbon::parse($payload['paid_at']);
        $methodLabel = $payload['method_label'] ?? null;
        $referenceNo = $payload['reference_no'] ?? null;
        $notes = $payload['notes'] ?? null;

        if ($isYearly) {
            $notes = trim(($notes ? $notes.' ' : '').'(Pembayaran tahunan)');
        }

        $payment = DuesPayment::query()->create([
            'dues_invoice_id' => $invoice->id,
            'member_id' => $invoice->member_id,
            'paid_at' => $paidAt,
            'amount' => $amount,
            'method' => $methodLabel,
            'reference_no' => $referenceNo,
            'notes' => $notes,
            'created_by' => $payload['created_by'],
        ]);

        $this->syncTransaction($invoice, $payment, $payload);
        $this->refreshInvoiceAggregate($invoice, $paidAt);

        return $payment;
    }

    private function syncTransaction(DuesInvoice $invoice, DuesPayment $payment, array $payload): void
    {
        $category = $this->resolveCashCategory();

        CashTransaction::query()->create([
            'tx_date' => $payment->paid_at,
            'type' => 'in',
            'category_id' => $category->id,
            'method_id' => $payload['cash_method_id'] ?? null,
            'amount' => $payment->amount,
            'description' => sprintf(
                'Pembayaran iuran %s - %s',
                $invoice->period?->name ?? $invoice->period?->period ?? '-',
                $invoice->member?->full_name ?? '-'
            ),
            'reference_no' => $payment->reference_no,
            'member_id' => $invoice->member_id,
            'dues_payment_id' => $payment->id,
            'created_by' => $payload['created_by'],
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

    private function refreshInvoiceAggregate(DuesInvoice $invoice, Carbon $paidAt): void
    {
        $invoice->refresh();
        $totalPaid = $invoice->payments()->sum('amount');
        $invoice->amount_paid = $totalPaid;
        $invoice->paid_at = $totalPaid >= $invoice->amount_due ? $paidAt : null;
        $invoice->payment_status_id = $this->resolveStatusId($invoice);
        $invoice->save();
    }

    private function resolveStatusId(DuesInvoice $invoice): int
    {
        if ($invoice->amount_paid >= $invoice->amount_due) {
            return $this->statusIdByCode('PAID');
        }

        $settings = DuesSetting::query()->first();
        $graceDays = $settings?->grace_days ?? 0;

        if ($invoice->due_date && now()->greaterThan($invoice->due_date->copy()->addDays($graceDays))) {
            return $this->statusIdByCode('OVERDUE');
        }

        return $this->statusIdByCode('UNPAID');
    }

    private function statusIdByCode(string $code): int
    {
        $status = PaymentStatus::query()
            ->whereRaw('LOWER(code) = ?', [strtolower($code)])
            ->first();

        if (! $status) {
            throw new \RuntimeException('Status pembayaran tidak ditemukan.');
        }

        return $status->id;
    }
}
