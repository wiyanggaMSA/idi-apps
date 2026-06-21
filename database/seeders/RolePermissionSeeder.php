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
            'secretariat.view',
            'letters.view',
            'letters.create',
            'letters.update',
            'letters.finalize',
            'letters.export_pdf',
            'letters.versions.view',
            'letters.revoke',
            'templates.manage',
            'numbering.manage',
            'agenda.view',
            'agenda.manage',
            'members.view',
            'members.create',
            'members.update',
            'members.delete',
            'members.import',
            'members.export',
            'members.resolve_import',
            'dues.view',
            'dues.create',
            'dues.update',
            'dues.sync',
            'dues.manage',
            'dues.void',
            'dues.void.request',
            'dues.void.approve',
            'dues.recap.view',
            'dues.export',
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
            'transactions.view',
            'transactions.create',
            'transactions.update',
            'transactions.update.metadata',
            'transactions.adjust.amount',
            'transactions.delete',
            'transactions.void.request',
            'transactions.void.approve',
            'transactions.attachments.upload',
            'activity.view',
            'reports.cash.view',
            'reports.financial.view',
            'reports.export',
            'reports.print',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $superadmin = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);
        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $sekretaris = Role::firstOrCreate(['name' => 'sekretaris', 'guard_name' => 'web']);
        $ketua = Role::firstOrCreate(['name' => 'ketua', 'guard_name' => 'web']);
        $bendahara = Role::firstOrCreate(['name' => 'bendahara', 'guard_name' => 'web']);
        $anggota = Role::firstOrCreate(['name' => 'anggota', 'guard_name' => 'web']);

        $superadmin->syncPermissions($permissions);
        $admin->syncPermissions($permissions);
        $sekretaris->syncPermissions([
            'secretariat.view',
            'letters.view',
            'letters.create',
            'letters.update',
            'letters.finalize',
            'letters.export_pdf',
            'letters.versions.view',
            'templates.manage',
            'numbering.manage',
            'agenda.view',
            'agenda.manage',
        ]);
        $bendahara->syncPermissions([
            'dues.view',
            'dues.create',
            'dues.update',
            'dues.manage',
            'dues.void',
            'dues.void.request',
            'settings.view',
            'users.view',
            'users.update',
            'roles.view',
            'permissions.view',
            'transactions.view',
            'transactions.create',
            'transactions.update',
            'transactions.void.request',
            'transactions.attachments.upload',
            'activity.view',
        ]);
        $ketua->syncPermissions([
            'secretariat.view',
            'letters.view',
            'letters.finalize',
            'letters.export_pdf',
            'letters.versions.view',
            'agenda.view',
            'settings.view',
            'users.view',
            'roles.view',
            'permissions.view',
            'dues.view',
            'dues.void.approve',
            'transactions.view',
            'transactions.void.approve',
            'activity.view',
        ]);
        $anggota->syncPermissions([]);

        $firstUser = User::query()->orderBy('id')->first();
        if ($firstUser) {
            $firstUser->assignRole('superadmin');
        }
    }
}
