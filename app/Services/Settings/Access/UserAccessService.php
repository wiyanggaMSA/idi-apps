<?php

namespace App\Services\Settings\Access;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserAccessService
{
    public function create(array $data, User $actor): User
    {
        return DB::transaction(function () use ($data, $actor) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'is_active' => true,
            ]);

            if (!empty($data['role'])) {
                $user->assignRole($data['role']);
            }

            activity()
                ->causedBy($actor)
                ->performedOn($user)
                ->withProperties(['attributes' => $user->only(['name', 'email', 'is_active'])])
                ->log('user.created');

            return $user;
        });
    }

    public function update(User $user, array $data, User $actor): User
    {
        $before = $user->only(['name', 'email', 'is_active']);

        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
        ]);

        activity()
            ->causedBy($actor)
            ->performedOn($user)
            ->withProperties(['before' => $before, 'after' => $user->only(['name', 'email', 'is_active'])])
            ->log('user.updated');

        return $user;
    }

    public function disable(User $user, User $actor): User
    {
        $before = $user->is_active;
        $user->update(['is_active' => false]);

        activity()
            ->causedBy($actor)
            ->performedOn($user)
            ->withProperties(['before' => ['is_active' => $before], 'after' => ['is_active' => false]])
            ->log('user.disabled');

        return $user;
    }

    public function assignRole(User $user, string $role, User $actor): void
    {
        $before = $user->getRoleNames()->toArray();
        $user->syncRoles([$role]);

        activity()
            ->causedBy($actor)
            ->performedOn($user)
            ->withProperties(['before' => ['roles' => $before], 'after' => ['roles' => [$role]]])
            ->log('user.role_assigned');
    }

    public function syncPermissions(User $user, array $permissions, User $actor): void
    {
        $before = $user->getAllPermissions()->pluck('name')->toArray();
        $user->syncPermissions($permissions);

        activity()
            ->causedBy($actor)
            ->performedOn($user)
            ->withProperties(['before' => ['permissions' => $before], 'after' => ['permissions' => $permissions]])
            ->log('user.permissions_synced');
    }
}
