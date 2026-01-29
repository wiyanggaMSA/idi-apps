<?php

namespace App\Services\Settings\Access;

use App\Models\User;
use Spatie\Permission\Models\Role;

class RoleAccessService
{
    public function create(array $data, User $actor): Role
    {
        $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);

        activity()
            ->causedBy($actor)
            ->performedOn($role)
            ->withProperties(['attributes' => ['name' => $role->name]])
            ->log('role.created');

        return $role;
    }

    public function update(Role $role, array $data, User $actor): Role
    {
        $before = ['name' => $role->name];
        $role->update(['name' => $data['name']]);

        activity()
            ->causedBy($actor)
            ->performedOn($role)
            ->withProperties(['before' => $before, 'after' => ['name' => $role->name]])
            ->log('role.updated');

        return $role;
    }

    public function delete(Role $role, User $actor): void
    {
        $name = $role->name;
        $role->delete();

        activity()
            ->causedBy($actor)
            ->withProperties(['attributes' => ['name' => $name]])
            ->log('role.deleted');
    }

    public function syncPermissions(Role $role, array $permissions, User $actor): void
    {
        $before = $role->permissions()->pluck('name')->toArray();
        $role->syncPermissions($permissions);

        activity()
            ->causedBy($actor)
            ->performedOn($role)
            ->withProperties(['before' => ['permissions' => $before], 'after' => ['permissions' => $permissions]])
            ->log('role.permissions_synced');
    }
}
