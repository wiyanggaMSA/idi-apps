<?php

namespace App\Policies;

use App\Models\OrganizationUnitPosition;
use App\Models\User;

class OrganizationUnitPositionPolicy
{
    public function create(User $user): bool
    {
        return $user->can('organization.structure.manage');
    }

    public function update(User $user, OrganizationUnitPosition $slot): bool
    {
        return $user->can('organization.structure.manage') && ! $slot->period?->isReadOnly();
    }

    public function deactivate(User $user, OrganizationUnitPosition $slot): bool
    {
        return $this->update($user, $slot);
    }
}
