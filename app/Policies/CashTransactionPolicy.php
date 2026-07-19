<?php

namespace App\Policies;

use App\Models\CashTransaction;
use App\Models\User;

class CashTransactionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('transactions.view');
    }

    public function view(User $user, CashTransaction $transaction): bool
    {
        return $user->can('transactions.view');
    }

    public function create(User $user): bool
    {
        return $user->can('transactions.create');
    }

    public function update(User $user, CashTransaction $transaction): bool
    {
        return $this->updateNonFinancialFields($user, $transaction);
    }

    public function updateNonFinancialFields(User $user, CashTransaction $transaction): bool
    {
        return $user->can('transactions.update')
            && $transaction->dues_payment_id === null
            && $transaction->voided_at === null;
    }

    public function requestVoid(User $user, CashTransaction $transaction): bool
    {
        return ($user->can('transactions.void.request') || $user->can('transactions.delete'))
            && $transaction->dues_payment_id === null
            && $transaction->voided_at === null;
    }

    public function approveVoid(User $user, CashTransaction $transaction): bool
    {
        return $user->can('transactions.void.approve');
    }

    public function viewReport(User $user): bool
    {
        return $user->can('reports.cash.view') || $user->can('transactions.view');
    }

    public function export(User $user): bool
    {
        return $user->can('reports.export');
    }
}
