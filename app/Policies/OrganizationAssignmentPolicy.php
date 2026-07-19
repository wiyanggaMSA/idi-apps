<?php

namespace App\Policies;

use App\Models\OrganizationAssignment;
use App\Models\User;

class OrganizationAssignmentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('organization.view') || $user->can('organization.history.view');
    }

    public function view(User $user, OrganizationAssignment $assignment): bool
    {
        return $assignment->period?->isReadOnly()
            ? $user->can('organization.history.view')
            : $user->can('organization.view');
    }

    public function create(User $user): bool
    {
        return $user->can('organization.assignment.manage');
    }

    public function update(User $user, OrganizationAssignment $assignment): bool
    {
        return $user->can('organization.assignment.manage')
            && $assignment->isCurrent()
            && ! $assignment->period?->isReadOnly();
    }

    public function replace(User $user, OrganizationAssignment $assignment): bool
    {
        return $user->can('organization.assignment.replace')
            && $assignment->status === OrganizationAssignment::STATUS_ACTIVE
            && ! $assignment->period?->isReadOnly();
    }

    public function end(User $user, OrganizationAssignment $assignment): bool
    {
        return $this->update($user, $assignment);
    }
}
