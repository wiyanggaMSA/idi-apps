<?php

namespace App\Http\Controllers\Settings\Access;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\Access\StoreRoleRequest;
use App\Http\Requests\Settings\Access\SyncRolePermissionsRequest;
use App\Http\Requests\Settings\Access\UpdateRoleRequest;
use App\Services\Settings\Access\RoleAccessService;
use App\Support\RoleName;
use Illuminate\Http\RedirectResponse;
use Spatie\Permission\Models\Role;

class RolesController extends Controller
{
    public function store(StoreRoleRequest $request, RoleAccessService $service): RedirectResponse
    {
        $service->create($request->validated(), $request->user());

        return back()->with('success', 'Role berhasil ditambahkan.');
    }

    public function update(UpdateRoleRequest $request, Role $role, RoleAccessService $service): RedirectResponse
    {
        $service->update($role, $request->validated(), $request->user());

        return back()->with('success', 'Role berhasil diperbarui.');
    }

    public function destroy(Role $role, RoleAccessService $service): RedirectResponse
    {
        abort_unless(request()->user()->can('roles.delete'), 403);

        if (RoleName::normalize($role->name) === RoleName::ADMIN) {
            return back()->withErrors(['role' => 'Role Admin tidak boleh dihapus.']);
        }

        $service->delete($role, request()->user());

        return back()->with('success', 'Role berhasil dihapus.');
    }

    public function syncPermissions(SyncRolePermissionsRequest $request, Role $role, RoleAccessService $service): RedirectResponse
    {
        $service->syncPermissions($role, $request->validated()['permissions'] ?? [], $request->user());

        return back()->with('success', 'Permission role diperbarui.');
    }
}
