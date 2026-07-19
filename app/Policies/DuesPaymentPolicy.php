<?php

namespace App\Policies;

use App\Models\DuesPayment;
use App\Models\User;

class DuesPaymentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('dues.view') || $user->can('dues.manage');
    }

    public function view(User $user, DuesPayment $payment): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->can('dues.create') || $user->can('dues.manage');
    }

    public function sync(User $user): bool
    {
        return $user->can('dues.sync') || $user->can('dues.manage');
    }

    public function update(User $user, DuesPayment $payment): bool
    {
        return ($user->can('dues.update') || $user->can('dues.manage'))
            && $payment->voided_at === null;
    }

    public function requestVoid(User $user, DuesPayment $payment): bool
    {
        return ($user->can('dues.void.request') || $user->can('dues.void'))
            && $payment->voided_at === null;
    }

    public function approveVoid(User $user, DuesPayment $payment): bool
    {
        return $user->can('dues.void.approve');
    }

    public function viewReport(User $user): bool
    {
        return $user->can('dues.recap.view');
    }

    public function export(User $user): bool
    {
        return $user->can('dues.export');
    }
}
