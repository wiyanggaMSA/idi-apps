<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('permissions') || ! Schema::hasTable('roles')) {
            return;
        }

        $now = now();
        $permissionIds = [];

        foreach (['portal.view', 'portal.manage'] as $permission) {
            DB::table('permissions')->insertOrIgnore([
                'name' => $permission,
                'guard_name' => 'web',
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('permissions')
                ->where('name', $permission)
                ->where('guard_name', 'web')
                ->update(['updated_at' => $now]);

            $permissionIds[$permission] = DB::table('permissions')
                ->where('name', $permission)
                ->where('guard_name', 'web')
                ->value('id');
        }

        if (! Schema::hasTable('role_has_permissions')) {
            return;
        }

        $rolePermissions = [
            'superadmin' => ['portal.view', 'portal.manage'],
            'admin' => ['portal.view', 'portal.manage'],
            'sekretaris' => ['portal.view', 'portal.manage'],
            'ketua' => ['portal.view'],
        ];

        $roles = DB::table('roles')
            ->whereIn(DB::raw('lower(name)'), array_keys($rolePermissions))
            ->where('guard_name', 'web')
            ->get(['id', 'name'])
            ->mapWithKeys(fn ($role) => [mb_strtolower($role->name) => $role->id]);

        foreach ($rolePermissions as $role => $permissions) {
            $roleId = $roles[$role] ?? null;

            if (! $roleId) {
                continue;
            }

            foreach ($permissions as $permission) {
                DB::table('role_has_permissions')->updateOrInsert([
                    'permission_id' => $permissionIds[$permission],
                    'role_id' => $roleId,
                ]);
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('permissions')) {
            return;
        }

        $permissionIds = DB::table('permissions')
            ->whereIn('name', ['portal.view', 'portal.manage'])
            ->where('guard_name', 'web')
            ->pluck('id');

        if (Schema::hasTable('role_has_permissions')) {
            DB::table('role_has_permissions')
                ->whereIn('permission_id', $permissionIds)
                ->delete();
        }

        DB::table('permissions')
            ->whereIn('id', $permissionIds)
            ->delete();
    }
};
