<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

//Controllers
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\Secretariat\LettersController;
use App\Http\Controllers\Secretariat\AgendaController;
use App\Http\Controllers\Secretariat\ArchiveController;
use App\Http\Controllers\Members\MemberController;
use App\Http\Controllers\Members\MemberImportController;
use App\Http\Controllers\Dues\DuesController;
use App\Http\Controllers\Dues\DuesRecapController;
use App\Http\Controllers\Cash\CashController;
use App\Http\Controllers\Cash\CashReportsController;
use App\Http\Controllers\Cash\CashExportController;
use App\Http\Controllers\Reports\ReportsController;
use App\Http\Controllers\Reports\ReportsResumeController;
use App\Http\Controllers\Reports\ReportsExportController;
use App\Http\Controllers\Settings\SettingsController;
use App\Http\Controllers\Settings\Access\PermissionsController;
use App\Http\Controllers\Settings\Access\RolesController;
use App\Http\Controllers\Settings\Access\UsersController;
use App\Http\Controllers\Settings\DuesSettingsController;
use App\Http\Controllers\Settings\MasterData\CashCategoriesController;
use App\Http\Controllers\Settings\MasterData\CashMethodsController;
use App\Http\Controllers\Settings\MasterData\DivisionsController;
use App\Http\Controllers\Settings\MasterData\PaymentStatusesController;
use App\Http\Controllers\Settings\MasterData\PositionsController;


Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    // Secre
    Route::get('/secretariat', LettersController::class)->name('secretariat.index');
    Route::get('/secretariat/agenda', AgendaController::class)->name('secretariat.agenda');
    Route::get('/secretariat/archive', ArchiveController::class)->name('secretariat.archive');
    //MEMBERS
    Route::get('/members', MemberController::class)->name('members.index');
    Route::get('/members/import', MemberImportController::class)->name('members.import');
    //DUES
    Route::get('/dues', DuesController::class)->name('dues.index');
    Route::get('/dues/recap', DuesRecapController::class)->name('dues.recap');
    //CASH
    Route::get('/cash', CashController::class)->name('cash.index');
    Route::get('/cash/reports', CashReportsController::class)->name('cash.reports');
    Route::get('/cash/export', CashExportController::class)->name('cash.export');
    //REPORTS
    Route::get('/reports', ReportsController::class)->name('reports.index');
    Route::get('/reports/resume', ReportsResumeController::class)->name('reports.resume');
    Route::get('/reports/export', ReportsExportController::class)->name('reports.export');
    //SETTINGS
    Route::middleware(['role:Admin'])->group(function () {
        Route::get('/settings', SettingsController::class)->name('settings.index');
        Route::patch('/settings/dues', [DuesSettingsController::class, 'update'])->name('settings.dues.update');
        Route::prefix('settings/master-data')->name('settings.master-data.')->group(function () {
            Route::post('/divisions', [DivisionsController::class, 'store'])->name('divisions.store');
            Route::delete('/divisions/{division}', [DivisionsController::class, 'destroy'])->name('divisions.destroy');
            Route::post('/positions', [PositionsController::class, 'store'])->name('positions.store');
            Route::delete('/positions/{position}', [PositionsController::class, 'destroy'])->name('positions.destroy');
            Route::post('/cash-categories', [CashCategoriesController::class, 'store'])->name('cash-categories.store');
            Route::delete('/cash-categories/{cashCategory}', [CashCategoriesController::class, 'destroy'])->name('cash-categories.destroy');
            Route::post('/cash-methods', [CashMethodsController::class, 'store'])->name('cash-methods.store');
            Route::delete('/cash-methods/{cashMethod}', [CashMethodsController::class, 'destroy'])->name('cash-methods.destroy');
            Route::post('/payment-statuses', [PaymentStatusesController::class, 'store'])->name('payment-statuses.store');
            Route::delete('/payment-statuses/{paymentStatus}', [PaymentStatusesController::class, 'destroy'])->name('payment-statuses.destroy');
        });
        Route::prefix('settings/access')->name('settings.access.')->group(function () {
            Route::post('/users', [UsersController::class, 'store'])->name('users.store');
            Route::patch('/users/{user}', [UsersController::class, 'update'])->name('users.update');
            Route::patch('/users/{user}/disable', [UsersController::class, 'disable'])->name('users.disable');
            Route::patch('/users/{user}/assign-role', [UsersController::class, 'assignRole'])->name('users.assign-role');
            Route::patch('/users/{user}/sync-permissions', [UsersController::class, 'syncPermissions'])->name('users.sync-permissions');

            Route::post('/roles', [RolesController::class, 'store'])->name('roles.store');
            Route::patch('/roles/{role}', [RolesController::class, 'update'])->name('roles.update');
            Route::delete('/roles/{role}', [RolesController::class, 'destroy'])->name('roles.destroy');
            Route::patch('/roles/{role}/sync-permissions', [RolesController::class, 'syncPermissions'])->name('roles.sync-permissions');

            Route::post('/permissions', [PermissionsController::class, 'store'])->name('permissions.store');
            Route::patch('/permissions/{permission}', [PermissionsController::class, 'update'])->name('permissions.update');
            Route::delete('/permissions/{permission}', [PermissionsController::class, 'destroy'])->name('permissions.destroy');
        });
    });

});
    

require __DIR__.'/auth.php';
