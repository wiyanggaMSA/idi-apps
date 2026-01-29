<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\CashCategory;
use App\Models\Division;
use App\Models\DuesSetting;
use App\Models\PaymentStatus;
use App\Models\Position;
use App\Models\CashMethod;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class SettingsController extends Controller
{
    public function __invoke(): Response
    {
        $divisions = Division::query()
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'is_active']);

        $positions = Position::query()
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'is_active']);

        $cashCategories = CashCategory::query()
            ->orderBy('type')
            ->orderBy('name')
            ->get(['id', 'type', 'name', 'code', 'is_active']);
        
        $cashMethods = CashMethod::query()
            ->orderBy('name')
            ->get(['id', 'name', 'is_active']);

        $paymentStatuses = PaymentStatus::query()
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'color', 'is_active']);

        $duesSettings = DuesSetting::query()->first();
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
                'divisions' => $divisions->count(),
                'positions' => $positions->count(),
                'cash_categories' => $cashCategories->count(),
                'cash_methods' => $cashMethods->count(),
                'payment_statuses' => $paymentStatuses->count(),
            ],
            'masterData' => [
                'divisions' => $divisions,
                'positions' => $positions,
                'cash_categories' => $cashCategories,
                'cash_methods' => $cashMethods,
                'payment_statuses' => $paymentStatuses,
            ],
            'duesSettings' => [
                'dues_amount' => $duesSettings?->dues_amount ?? 100000,
                'due_day' => $duesSettings?->due_day ?? 10,
                'grace_days' => $duesSettings?->grace_days ?? 7,
                'auto_mark_arrears' => $duesSettings?->auto_mark_arrears ?? true,
                'allow_partial' => $duesSettings?->allow_partial ?? false,
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