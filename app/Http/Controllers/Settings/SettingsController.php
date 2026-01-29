<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class SettingsController extends Controller
{
    public function __invoke(): Response
    {
        $users = User::query()
            ->with(['roles', 'permissions'])
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_active' => $user->is_active,
                'roles' => $user->roles->pluck('name')->values(),
                'permissions' => $user->permissions->pluck('name')->values(),
            ]);

        $roles = Role::query()
            ->with('permissions')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name')->values(),
            ]);

        $permissions = Permission::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Settings/Index', [
            'profile' => [
                'name' => 'IDI Cabang Purwakarta',
                'address' => 'Sekretariat IDI Purwakarta',
                'phone' => '',
                'email' => '',
                'logo_url' => null,
            ],
            'counts' => [
                'divisions' => 0,
                'positions' => 0,
                'cash_categories' => 0,
                'payment_statuses' => 0,
            ],
            'backups' => [
                ['id' => 1, 'scope' => 'members', 'created_at' => '2026-01-12 10:11', 'file' => 'backups/members_20260112.sql'],
                ['id' => 2, 'scope' => 'finance', 'created_at' => '2026-01-12 10:15', 'file' => 'backups/finance_20260112.sql'],
            ],
            'access' => [
                'users' => $users,
                'roles' => $roles,
                'permissions' => $permissions,
            ],
        ]);
    }
}