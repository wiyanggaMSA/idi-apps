<?php

namespace App\Policies;

use App\Models\OrganizationPeriod;
use App\Models\User;

class OrganizationPeriodPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('organization.view') || $user->can('organization.history.view');
    }

    public function view(User $user, OrganizationPeriod $period): bool
    {
        if ($period->isReadOnly()) {
            return $user->can('organization.history.view');
        }

        return $user->can('organization.view');
    }

    public function create(User $user): bool
    {
        return $user->can('organization.period.create');
    }

    public function update(User $user, OrganizationPeriod $period): bool
    {
        return $user->can('organization.period.update') && ! $period->isReadOnly();
    }

    public function publish(User $user, OrganizationPeriod $period): bool
    {
        return $user->can('organization.period.publish') && $period->isDraft();
    }

    public function activate(User $user, OrganizationPeriod $period): bool
    {
        return $user->can('organization.period.activate')
            && in_array($period->status, [
                OrganizationPeriod::STATUS_DRAFT,
                OrganizationPeriod::STATUS_PUBLISHED,
            ], true);
    }

    public function end(User $user, OrganizationPeriod $period): bool
    {
        return $user->can('organization.period.end') && $period->isActive();
    }
}
