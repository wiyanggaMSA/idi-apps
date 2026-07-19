<?php

namespace App\Policies;

use App\Models\FinancePeriod;
use App\Models\User;

class FinancePeriodPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('finance.period.view');
    }

    public function view(User $user, FinancePeriod $financePeriod): bool
    {
        return $this->viewAny($user);
    }

    public function close(User $user, FinancePeriod $financePeriod): bool
    {
        return $user->can('finance.period.close')
            && ! $financePeriod->isClosed();
    }

    public function reopen(User $user, FinancePeriod $financePeriod): bool
    {
        return $user->can('finance.period.reopen')
            && $financePeriod->isClosed();
    }
}
