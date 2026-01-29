<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'members.view',
            'members.create',
            'members.update',
            'members.delete',
            'members.import',
            'members.export',
            'members.resolve_import',
            'settings.view',
            'users.view',
            'users.create',
            'users.update',
            'users.disable',
            'users.assign-role',
            'users.sync-permissions',
            'roles.view',
            'roles.create',
            'roles.update',
            'roles.delete',
            'roles.sync-permissions',
            'permissions.view',
            'permissions.create',
            'permissions.update',
            'permissions.delete',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $admin = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        $bendahara = Role::firstOrCreate(['name' => 'Bendahara', 'guard_name' => 'web']);
        $ketua = Role::firstOrCreate(['name' => 'Ketua', 'guard_name' => 'web']);
        $anggota = Role::firstOrCreate(['name' => 'Anggota', 'guard_name' => 'web']);

        $admin->syncPermissions($permissions);
        $bendahara->syncPermissions([
            'settings.view',
            'users.view',
            'users.update',
            'roles.view',
            'permissions.view',
        ]);
        $ketua->syncPermissions([
            'settings.view',
            'users.view',
            'roles.view',
            'permissions.view',
        ]);
        $anggota->syncPermissions([]);

        $firstUser = User::query()->orderBy('id')->first();
        if ($firstUser) {
            $firstUser->assignRole('Admin');
        }
    }
}
