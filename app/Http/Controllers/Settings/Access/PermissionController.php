<?php

namespace App\Http\Controllers\Settings\Access;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\Access\StorePermissionRequest;
use App\Http\Requests\Settings\Access\UpdatePermissionRequest;
use App\Services\Settings\Access\PermissionAccessService;
use Illuminate\Http\RedirectResponse;
use Spatie\Permission\Models\Permission;

class PermissionsController extends Controller
{
    public function store(StorePermissionRequest $request, PermissionAccessService $service): RedirectResponse
    {
        $service->create($request->validated(), $request->user());

        return back()->with('success', 'Permission berhasil ditambahkan.');
    }

    public function update(UpdatePermissionRequest $request, Permission $permission, PermissionAccessService $service): RedirectResponse
    {
        $service->update($permission, $request->validated(), $request->user());

        return back()->with('success', 'Permission berhasil diperbarui.');
    }

    public function destroy(Permission $permission, PermissionAccessService $service): RedirectResponse
    {
        abort_unless(request()->user()->can('permissions.delete'), 403);

        $service->delete($permission, request()->user());

        return back()->with('success', 'Permission berhasil dihapus.');
    }
}
