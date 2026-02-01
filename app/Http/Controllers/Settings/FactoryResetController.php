<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class FactoryResetController extends Controller
{
    public function hardReset(Request $request): RedirectResponse
    {
        $this->truncateTables($this->hardResetTables());

        User::query()->create([
            'name' => 'Admin',
            'email' => 'admin@idipwk.org',
            'password' => Hash::make('12345678'),
        ]);

        Artisan::call('db:seed', ['--class' => RolePermissionSeeder::class, '--force' => true]);

        return redirect()->back()->with('success', 'Hard reset selesai. Admin dibuat dengan email admin@local.test dan password admin123.');
    }

    public function financeReset(Request $request): RedirectResponse
    {
        $this->truncateTables($this->financeTables());

        return redirect()->back()->with('success', 'Data iuran & kas berhasil dikosongkan.');
    }

    public function customReset(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'tables' => ['array'],
            'tables.*' => ['string'],
        ]);

        $tables = $data['tables'] ?? [];
        $ordered = array_values(array_intersect($this->tableOrder(), $tables));

        if (empty($ordered)) {
            return redirect()->back()->withErrors(['tables' => 'Tidak ada tabel yang dipilih.']);
        }

        $this->truncateTables($ordered);

        return redirect()->back()->with('success', 'Tabel terpilih berhasil dikosongkan.');
    }

    private function financeTables(): array
    {
        return [
            'dues_payment_allocations',
            'dues_payments',
            'dues_invoices',
            'dues_periods',
            'cash_transactions',
        ];
    }

    private function hardResetTables(): array
    {
        return $this->tableOrder();
    }

    private function tableOrder(): array
    {
        $permissionTables = config('permission.table_names', []);
        $tables = [
            'document_links',
            'letter_versions',
            'letters',
            'letter_sequences',
            'letter_numbering_profiles',
            'letter_templates',
            'agenda',
            'events',
            'member_import_rows',
            'member_import_batches',
            'dues_payment_allocations',
            'dues_payments',
            'dues_invoices',
            'dues_periods',
            'cash_transactions',
            'documents',
            'backups',
            'activity_log',
            'members',
            'positions',
            'divisions',
            'payment_statuses',
            'cash_methods',
            'cash_categories',
            'dues_settings',
            'app_settings',
            $permissionTables['model_has_permissions'] ?? null,
            $permissionTables['model_has_roles'] ?? null,
            $permissionTables['role_has_permissions'] ?? null,
            $permissionTables['roles'] ?? null,
            $permissionTables['permissions'] ?? null,
            'sessions',
            'password_reset_tokens',
            'users',
        ];

        return array_values(array_filter($tables));
    }

    private function truncateTables(array $tables): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        }
        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF;');
        }

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->truncate();
            }
        }

        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        }
        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = ON;');
        }
    }
}
