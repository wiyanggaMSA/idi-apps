<?php

namespace App\Policies;

use App\Models\CashTransaction;
use App\Models\DuesPayment;
use App\Models\FinancialActionRequest;
use App\Models\User;

class FinancialActionRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('activity.view')
            || $user->can('dues.void.approve')
            || $user->can('transactions.void.approve');
    }

    public function review(User $user, FinancialActionRequest $request): bool
    {
        if ($request->status !== FinancialActionRequest::STATUS_PENDING) {
            return false;
        }

        if ((int) $request->requested_by === (int) $user->id) {
            return false;
        }

        $target = $request->actionable;

        if ($target instanceof DuesPayment) {
            return $user->can('dues.void.approve');
        }

        if ($target instanceof CashTransaction) {
            return $user->can('transactions.void.approve');
        }

        return false;
    }

    public function approve(User $user, FinancialActionRequest $request): bool
    {
        return $this->review($user, $request);
    }

    public function reject(User $user, FinancialActionRequest $request): bool
    {
        return $this->review($user, $request);
    }
}
