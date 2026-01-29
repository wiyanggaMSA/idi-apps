<?php

namespace App\Http\Controllers\Settings\Access;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\Access\AssignRoleRequest;
use App\Http\Requests\Settings\Access\StoreUserRequest;
use App\Http\Requests\Settings\Access\SyncUserPermissionsRequest;
use App\Http\Requests\Settings\Access\UpdateUserRequest;
use App\Models\User;
use App\Services\Settings\Access\UserAccessService;
use Illuminate\Http\RedirectResponse;

class UsersController extends Controller
{
    public function store(StoreUserRequest $request, UserAccessService $service): RedirectResponse
    {
        $service->create($request->validated(), $request->user());

        return back()->with('success', 'User berhasil ditambahkan.');
    }

    public function update(UpdateUserRequest $request, User $user, UserAccessService $service): RedirectResponse
    {
        $service->update($user, $request->validated(), $request->user());

        return back()->with('success', 'User berhasil diperbarui.');
    }

    public function disable(User $user, UserAccessService $service): RedirectResponse
    {
        abort_unless(request()->user()->can('users.disable'), 403);

        if ($user->id === request()->user()->id) {
            return back()->withErrors(['user' => 'Tidak bisa menonaktifkan akun sendiri.']);
        }

        $service->disable($user, request()->user());

        return back()->with('success', 'User berhasil dinonaktifkan.');
    }

    public function assignRole(AssignRoleRequest $request, User $user, UserAccessService $service): RedirectResponse
    {
        if ($user->id === $request->user()->id && $request->validated()['role'] !== 'Admin') {
            return back()->withErrors(['role' => 'Tidak bisa menurunkan role Admin pada akun sendiri.']);
        }

        $service->assignRole($user, $request->validated()['role'], $request->user());

        return back()->with('success', 'Role user diperbarui.');
    }

    public function syncPermissions(SyncUserPermissionsRequest $request, User $user, UserAccessService $service): RedirectResponse
    {
        $service->syncPermissions($user, $request->validated()['permissions'] ?? [], $request->user());

        return back()->with('success', 'Permission user diperbarui.');
    }
}
