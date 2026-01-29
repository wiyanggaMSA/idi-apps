<?php

namespace App\Services\Settings\Access;

use App\Models\User;
use Spatie\Permission\Models\Permission;

class PermissionAccessService
{
    public function create(array $data, User $actor): Permission
    {
        $permission = Permission::create(['name' => $data['name'], 'guard_name' => 'web']);

        activity()
            ->causedBy($actor)
            ->performedOn($permission)
            ->withProperties(['attributes' => ['name' => $permission->name]])
            ->log('permission.created');

        return $permission;
    }

    public function update(Permission $permission, array $data, User $actor): Permission
    {
        $before = ['name' => $permission->name];
        $permission->update(['name' => $data['name']]);

        activity()
            ->causedBy($actor)
            ->performedOn($permission)
            ->withProperties(['before' => $before, 'after' => ['name' => $permission->name]])
            ->log('permission.updated');

        return $permission;
    }

    public function delete(Permission $permission, User $actor): void
    {
        $name = $permission->name;
        $permission->delete();

        activity()
            ->causedBy($actor)
            ->withProperties(['attributes' => ['name' => $name]])
            ->log('permission.deleted');
    }
}
