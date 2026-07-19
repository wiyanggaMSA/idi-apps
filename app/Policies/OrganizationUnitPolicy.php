<?php

namespace App\Policies;

use App\Models\OrganizationUnit;
use App\Models\User;

class OrganizationUnitPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('organization.view') || $user->can('organization.history.view');
    }

    public function view(User $user, OrganizationUnit $unit): bool
    {
        return $unit->period?->isReadOnly()
            ? $user->can('organization.history.view')
            : $user->can('organization.view');
    }

    public function create(User $user): bool
    {
        return $user->can('organization.structure.manage');
    }

    public function update(User $user, OrganizationUnit $unit): bool
    {
        return $user->can('organization.structure.manage') && ! $unit->period?->isReadOnly();
    }

    public function deactivate(User $user, OrganizationUnit $unit): bool
    {
        return $this->update($user, $unit);
    }
}
