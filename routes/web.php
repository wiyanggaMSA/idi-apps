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
use App\Http\Controllers\Secretariat\LetterTemplatesController;
use App\Http\Controllers\Secretariat\LetterNumberingProfilesController;
use App\Http\Controllers\PublicVerifyLetterController;
use App\Http\Controllers\Members\MemberController;
use App\Http\Controllers\Members\MemberImportExportController;
use App\Http\Controllers\Dues\DuesController;
use App\Http\Controllers\Dues\DuesRecapController;
use App\Http\Controllers\Cash\CashController;
use App\Http\Controllers\Cash\CashReportsController;
use App\Http\Controllers\Cash\CashExportController;
use App\Http\Controllers\Cash\TransactionsController;
use App\Http\Controllers\Reports\ReportsController;
use App\Http\Controllers\Reports\ReportsResumeController;
use App\Http\Controllers\Reports\ReportsExportController;
use App\Http\Controllers\Reports\CashReportController;
use App\Http\Controllers\Reports\FinancialSummaryController;
use App\Http\Controllers\Settings\SettingsController;
use App\Http\Controllers\Settings\Access\PermissionsController;
use App\Http\Controllers\Settings\Access\RolesController;
use App\Http\Controllers\Settings\Access\UsersController;
use App\Http\Controllers\Settings\OrganizationProfileController;
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
    // Secretariat
    Route::prefix('secretariat')->name('secretariat.')->group(function () {
        Route::redirect('/', '/secretariat/letters');
        Route::get('/letters', [LettersController::class, 'index'])
            ->middleware('permission:letters.view')
            ->name('letters.index');
        Route::get('/letters/create', [LettersController::class, 'create'])
            ->middleware('permission:letters.create')
            ->name('letters.create');
        Route::get('/letters/{letter}', [LettersController::class, 'edit'])
            ->middleware('permission:letters.update')
            ->name('letters.edit');
        Route::post('/letters', [LettersController::class, 'storeDraft'])
            ->middleware('permission:letters.create')
            ->name('letters.store');
        Route::patch('/letters/{letter}', [LettersController::class, 'updateDraft'])
            ->middleware('permission:letters.update')
            ->name('letters.update');
        Route::post('/letters/{letter}/finalize', [LettersController::class, 'finalize'])
            ->middleware('permission:letters.finalize')
            ->name('letters.finalize');
        Route::get('/letters/{letter}/versions', [LettersController::class, 'versions'])
            ->middleware('permission:letters.versions.view')
            ->name('letters.versions');
        Route::get('/letters/{letter}/html', [LettersController::class, 'showHtml'])
            ->middleware('permission:secretariat.view')
            ->name('letters.html');
        Route::get('/letters/{letter}/pdf', [LettersController::class, 'downloadPdf'])
            ->middleware('permission:letters.export_pdf')
            ->name('letters.pdf');
        Route::patch('/letters/{letter}/revoke', [LettersController::class, 'revoke'])
            ->middleware('permission:letters.revoke')
            ->name('letters.revoke');

        Route::get('/templates', [LetterTemplatesController::class, 'index'])
            ->middleware('permission:templates.manage')
            ->name('templates.index');
        Route::post('/templates', [LetterTemplatesController::class, 'store'])
            ->middleware('permission:templates.manage')
            ->name('templates.store');
        Route::patch('/templates/{template}', [LetterTemplatesController::class, 'update'])
            ->middleware('permission:templates.manage')
            ->name('templates.update');
        Route::delete('/templates/{template}', [LetterTemplatesController::class, 'destroy'])
            ->middleware('permission:templates.manage')
            ->name('templates.destroy');

        Route::get('/settings/numbering', [LetterNumberingProfilesController::class, 'index'])
            ->middleware('permission:numbering.manage')
            ->name('numbering.index');
        Route::post('/settings/numbering', [LetterNumberingProfilesController::class, 'store'])
            ->middleware('permission:numbering.manage')
            ->name('numbering.store');
        Route::patch('/settings/numbering/{profile}', [LetterNumberingProfilesController::class, 'update'])
            ->middleware('permission:numbering.manage')
            ->name('numbering.update');
        Route::delete('/settings/numbering/{profile}', [LetterNumberingProfilesController::class, 'destroy'])
            ->middleware('permission:numbering.manage')
            ->name('numbering.destroy');

        Route::get('/agenda', [AgendaController::class, 'index'])
            ->middleware('permission:agenda.view')
            ->name('agenda.index');
        Route::post('/agenda', [AgendaController::class, 'store'])
            ->middleware('permission:agenda.manage')
            ->name('agenda.store');
        Route::patch('/agenda/{agenda}', [AgendaController::class, 'update'])
            ->middleware('permission:agenda.manage')
            ->name('agenda.update');
        Route::delete('/agenda/{agenda}', [AgendaController::class, 'destroy'])
            ->middleware('permission:agenda.manage')
            ->name('agenda.destroy');

        Route::get('/archive', ArchiveController::class)
            ->middleware('permission:secretariat.view')
            ->name('archive');
    });
    //MEMBERS
    Route::prefix('members')->name('members.')->group(function () {
        Route::get('/', [MemberController::class, 'index'])
            ->middleware('permission:members.view')
            ->name('index');
        Route::post('/', [MemberController::class, 'store'])
            ->middleware('permission:members.create')
            ->name('store');
        Route::patch('/{member}', [MemberController::class, 'update'])
            ->middleware('permission:members.update')
            ->name('update');
        Route::delete('/{member}', [MemberController::class, 'destroy'])
            ->middleware('permission:members.delete')
            ->name('destroy');

        Route::get('/import-export', [MemberImportExportController::class, 'index'])
            ->middleware('permission:members.import|members.export|members.resolve_import')
            ->name('import-export');
        Route::get('/template', [MemberImportExportController::class, 'template'])
            ->middleware('permission:members.import')
            ->name('template');
        Route::post('/import', [MemberImportExportController::class, 'import'])
            ->middleware('permission:members.import')
            ->name('import');
        Route::get('/import/{batch}/conflicts', [MemberImportExportController::class, 'conflicts'])
            ->middleware('permission:members.resolve_import')
            ->name('conflicts');
        Route::post('/import/{batch}/resolve', [MemberImportExportController::class, 'resolve'])
            ->middleware('permission:members.resolve_import')
            ->name('resolve');
        Route::get('/export', [MemberImportExportController::class, 'export'])
            ->middleware('permission:members.export')
            ->name('export');
    });
    //DUES
    Route::get('/dues', [DuesController::class, 'index'])
        ->middleware('permission:dues.manage')
        ->name('dues.index');
    Route::post('/dues/payments', [DuesController::class, 'storePayment'])
        ->middleware('permission:dues.manage')
        ->name('dues.payments.store');
    Route::patch('/dues/payments/{payment}', [DuesController::class, 'updatePayment'])
        ->middleware('permission:dues.manage')
        ->name('dues.payments.update');
    Route::post('/dues/payments/{payment}/void', [DuesController::class, 'voidPayment'])
        ->middleware('permission:dues.void')
        ->name('dues.payments.void');
    Route::get('/dues/members/{member}/payments', [DuesController::class, 'memberPayments'])
        ->middleware('permission:dues.manage')
        ->name('dues.members.payments');
    Route::get('/dues/recap', [DuesRecapController::class, 'index'])
        ->middleware('permission:dues.recap.view')
        ->name('dues.recap');
    Route::get('/dues/recap/export', [DuesRecapController::class, 'exportXlsx'])
        ->middleware('permission:dues.export')
        ->name('dues.recap.export');
    //CASH
    Route::get('/cash', CashController::class)->name('cash.index');
    Route::get('/cash/reports', CashReportsController::class)->name('cash.reports');
    Route::get('/cash/export', CashExportController::class)->name('cash.export');

    Route::prefix('transactions')->name('transactions.')->group(function () {
        Route::get('/', [TransactionsController::class, 'index'])
            ->middleware('permission:transactions.view')
            ->name('index');
        Route::post('/', [TransactionsController::class, 'store'])
            ->middleware('permission:transactions.create')
            ->name('store');
        Route::patch('/{transaction}', [TransactionsController::class, 'update'])
            ->middleware('permission:transactions.update')
            ->name('update');
        Route::delete('/{transaction}', [TransactionsController::class, 'destroy'])
            ->middleware('permission:transactions.delete')
            ->name('destroy');
    });

    //REPORTS
    Route::get('/reports', ReportsController::class)->name('reports.index');
    Route::get('/reports/resume', ReportsResumeController::class)->name('reports.resume');
    Route::get('/reports/export', ReportsExportController::class)->name('reports.export');
    Route::get('/reports/cash', [CashReportController::class, 'index'])
        ->middleware('permission:reports.cash.view')
        ->name('reports.cash');
    Route::get('/reports/cash/pdf', [CashReportController::class, 'pdf'])
        ->middleware('permission:reports.export|reports.print')
        ->name('reports.cash.pdf');
    Route::get('/reports/financial-summary', [FinancialSummaryController::class, 'index'])
        ->middleware('permission:reports.financial.view')
        ->name('reports.financial-summary');
    Route::get('/reports/financial-summary/pdf', [FinancialSummaryController::class, 'pdf'])
        ->middleware('permission:reports.export|reports.print')
        ->name('reports.financial-summary.pdf');
    //SETTINGS
    Route::middleware(['role:Admin'])->group(function () {
        Route::get('/settings', SettingsController::class)->name('settings.index');
        Route::patch('/settings/profile', [OrganizationProfileController::class, 'update'])->name('settings.profile.update');
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
