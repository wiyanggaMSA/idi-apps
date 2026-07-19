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
            'users.reset-password',
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
            'finance.period.view',
            'finance.period.close',
            'finance.period.reopen',
            'work_program.view',
            'work_program.view_own_field',
            'work_program.create',
            'work_program.update',
            'work_program.delete',
            'work_program.submit',
            'work_program.withdraw',
            'work_program.review',
            'work_program.approve',
            'work_program.reject',
            'work_program.request_revision',
            'work_program.manage_tasks',
            'work_program.update_progress',
            'work_program.manage_budget',
            'work_program.upload_document',
            'work_program.evaluate',
            'work_program.archive',
            'work_program.export',
            'work_program.view_audit_log',
            'reports.cash.view',
            'reports.financial.view',
            'reports.export',
            'reports.print',
            'organization.view',
            'organization.history.view',
            'organization.period.create',
            'organization.period.update',
            'organization.period.publish',
            'organization.period.activate',
            'organization.period.end',
            'organization.structure.manage',
            'organization.assignment.manage',
            'organization.assignment.replace',
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
            'work_program.view_own_field',
            'work_program.create',
            'work_program.update',
            'work_program.submit',
            'work_program.withdraw',
            'work_program.manage_tasks',
            'work_program.update_progress',
            'work_program.upload_document',
            'work_program.evaluate',
            'work_program.export',
            'organization.view',
            'organization.history.view',
            'organization.period.create',
            'organization.period.update',
            'organization.period.publish',
            'organization.period.activate',
            'organization.period.end',
            'organization.structure.manage',
            'organization.assignment.manage',
            'organization.assignment.replace',
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
            'finance.period.view',
            'work_program.view_own_field',
            'work_program.update_progress',
            'work_program.manage_budget',
            'work_program.upload_document',
            'work_program.export',
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
            'finance.period.view',
            'work_program.view',
            'work_program.view_own_field',
            'work_program.create',
            'work_program.update',
            'work_program.submit',
            'work_program.withdraw',
            'work_program.review',
            'work_program.approve',
            'work_program.reject',
            'work_program.request_revision',
            'work_program.manage_tasks',
            'work_program.update_progress',
            'work_program.manage_budget',
            'work_program.upload_document',
            'work_program.evaluate',
            'work_program.archive',
            'work_program.export',
            'work_program.view_audit_log',
            'organization.view',
            'organization.history.view',
            'organization.period.create',
            'organization.period.update',
            'organization.period.publish',
            'organization.period.activate',
            'organization.period.end',
            'organization.structure.manage',
            'organization.assignment.manage',
            'organization.assignment.replace',
        ]);
        $bendahara->givePermissionTo([
            'organization.view',
            'organization.history.view',
        ]);
        $anggota->syncPermissions([
            'work_program.view_own_field',
            'work_program.update_progress',
            'work_program.upload_document',
        ]);

        $firstUser = User::query()->orderBy('id')->first();
        if ($firstUser) {
            $firstUser->assignRole('superadmin');
        }
    }
}
