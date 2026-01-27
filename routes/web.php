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
    Route::get('/settings', SettingsController::class)->name('settings.index');

});
    

require __DIR__.'/auth.php';
