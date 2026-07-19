<?php

namespace App\Services\Finance;

use App\Models\CashTransaction;
use App\Models\DuesPayment;
use App\Models\FinancialActionRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class FinancialActionRequestService
{
    public function __construct(private readonly FinancePeriodService $financePeriodService)
    {
    }

    public function requestVoid(Model $target, string $reason, User $actor): FinancialActionRequest
    {
        return DB::transaction(function () use ($target, $reason, $actor) {
            $target = $target->newQuery()
                ->whereKey($target->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($this->isVoided($target)) {
                throw new \RuntimeException('Data sudah dibatalkan.');
            }

            $this->ensureTargetPeriodOpen($target, 'Periode target sudah closed. Request void tidak dapat dibuat pada periode tutup buku.');

            $pending = FinancialActionRequest::query()
                ->whereMorphedTo('actionable', $target)
                ->where('action', FinancialActionRequest::ACTION_VOID)
                ->where('status', FinancialActionRequest::STATUS_PENDING)
                ->lockForUpdate()
                ->first();

            if ($pending) {
                throw new \RuntimeException('Request void masih menunggu approval.');
            }

            $request = FinancialActionRequest::query()->create([
                'actionable_type' => $target->getMorphClass(),
                'actionable_id' => $target->getKey(),
                'action' => FinancialActionRequest::ACTION_VOID,
                'status' => FinancialActionRequest::STATUS_PENDING,
                'reason' => $reason,
                'requested_by' => $actor->id,
            ]);

            activity('finance')
                ->causedBy($actor)
                ->performedOn($target)
                ->withProperties([
                    'action_request_id' => $request->id,
                    'reason' => $reason,
                    'status' => FinancialActionRequest::STATUS_PENDING,
                    'target' => $this->targetSnapshot($target),
                ])
                ->log($this->activityEvent($target, 'void_requested'));

            return $request;
        });
    }

    public function approve(FinancialActionRequest $request, User $actor, ?string $note = null): FinancialActionRequest
    {
        return DB::transaction(function () use ($request, $actor, $note) {
            $request = FinancialActionRequest::query()
                ->whereKey($request->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($request->status !== FinancialActionRequest::STATUS_PENDING) {
                throw new \RuntimeException('Request ini sudah direview.');
            }

            if ((int) $request->requested_by === (int) $actor->id) {
                throw new \RuntimeException('Pemohon tidak dapat menyetujui request sendiri.');
            }

            $target = $request->actionable;
            if (! $target) {
                throw new \RuntimeException('Data target tidak ditemukan.');
            }

            if ($this->isVoided($target)) {
                throw new \RuntimeException('Data target sudah dibatalkan.');
            }

            $this->ensureTargetPeriodOpen($target, 'Periode target sudah closed. Approval void tidak dapat dilakukan pada periode tutup buku.');

            $before = $this->targetSnapshot($target);
            $this->applyVoid($target, $request->reason, $actor);
            $target->refresh();

            $request->update([
                'status' => FinancialActionRequest::STATUS_APPROVED,
                'reviewed_by' => $actor->id,
                'reviewed_at' => now(),
                'review_note' => $note,
            ]);

            activity('finance')
                ->causedBy($actor)
                ->performedOn($target)
                ->withProperties([
                    'action_request_id' => $request->id,
                    'reason' => $request->reason,
                    'review_note' => $note,
                    'before' => $before,
                    'after' => $this->targetSnapshot($target),
                ])
                ->log($this->activityEvent($target, 'void_approved'));

            return $request;
        });
    }

    public function reject(FinancialActionRequest $request, User $actor, ?string $note = null): FinancialActionRequest
    {
        return DB::transaction(function () use ($request, $actor, $note) {
            $request = FinancialActionRequest::query()
                ->whereKey($request->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($request->status !== FinancialActionRequest::STATUS_PENDING) {
                throw new \RuntimeException('Request ini sudah direview.');
            }

            if ((int) $request->requested_by === (int) $actor->id) {
                throw new \RuntimeException('Pemohon tidak dapat mereject request sendiri.');
            }

            $target = $request->actionable;
            if (! $target) {
                throw new \RuntimeException('Data target tidak ditemukan.');
            }

            $request->update([
                'status' => FinancialActionRequest::STATUS_REJECTED,
                'reviewed_by' => $actor->id,
                'reviewed_at' => now(),
                'review_note' => $note,
            ]);

            activity('finance')
                ->causedBy($actor)
                ->performedOn($target)
                ->withProperties([
                    'action_request_id' => $request->id,
                    'reason' => $request->reason,
                    'review_note' => $note,
                    'target' => $this->targetSnapshot($target),
                ])
                ->log($this->activityEvent($target, 'void_rejected'));

            return $request;
        });
    }

    public function targetSnapshot(Model $target): array
    {
        if ($target instanceof DuesPayment) {
            $cashTransaction = CashTransaction::query()
                ->where('dues_payment_id', $target->id)
                ->first(['id', 'voided_at']);

            return [
                'id' => $target->id,
                'member_id' => $target->member_id,
                'member_name' => $target->member?->full_name,
                'paid_at' => optional($target->paid_at)->format('Y-m-d H:i:s'),
                'amount' => $target->amount,
                'method' => $target->method,
                'reference_no' => $target->reference_no,
                'notes' => $target->notes,
                'voided_at' => optional($target->voided_at)->format('Y-m-d H:i:s'),
                'void_reason' => $target->void_reason,
                'cash_transaction_id' => $cashTransaction?->id,
                'cash_transaction_voided_at' => optional($cashTransaction?->voided_at)->format('Y-m-d H:i:s'),
            ];
        }

        if ($target instanceof CashTransaction) {
            return [
                'id' => $target->id,
                'tx_date' => optional($target->tx_date)->format('Y-m-d H:i:s'),
                'type' => $target->type,
                'category_id' => $target->category_id,
                'method_id' => $target->method_id,
                'amount' => $target->amount,
                'description' => $target->description,
                'reference_no' => $target->reference_no,
                'dues_payment_id' => $target->dues_payment_id,
                'voided_at' => optional($target->voided_at)->format('Y-m-d H:i:s'),
            ];
        }

        return $target->attributesToArray();
    }

    private function isVoided(Model $target): bool
    {
        return $target instanceof DuesPayment || $target instanceof CashTransaction
            ? $target->voided_at !== null
            : false;
    }

    private function ensureTargetPeriodOpen(Model $target, string $message): void
    {
        if ($target instanceof DuesPayment) {
            $this->financePeriodService->ensureOpen($target->paid_at, $message);
        }

        if ($target instanceof CashTransaction) {
            $this->financePeriodService->ensureOpen($target->tx_date, $message);
        }
    }

    private function applyVoid(Model $target, string $reason, User $actor): void
    {
        if ($target instanceof DuesPayment) {
            $target->update([
                'voided_at' => now(),
                'void_reason' => $reason,
                'updated_by' => $actor->id,
            ]);

            CashTransaction::query()
                ->where('dues_payment_id', $target->id)
                ->whereNull('voided_at')
                ->update([
                    'voided_at' => now(),
                    'voided_by' => $actor->id,
                    'updated_by' => $actor->id,
                ]);

            return;
        }

        if ($target instanceof CashTransaction) {
            $target->update([
                'voided_at' => now(),
                'voided_by' => $actor->id,
                'updated_by' => $actor->id,
            ]);
        }
    }

    private function activityEvent(Model $target, string $suffix): string
    {
        if ($target instanceof DuesPayment) {
            return "dues_payment.{$suffix}";
        }

        if ($target instanceof CashTransaction) {
            return "cash_transaction.{$suffix}";
        }

        return "finance.{$suffix}";
    }
}
