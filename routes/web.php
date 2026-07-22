<?php

use App\Http\Controllers\Cash\CashController;
use App\Http\Controllers\Cash\CashExportController;
use App\Http\Controllers\Cash\CashReportsController;
use App\Http\Controllers\Cash\TransactionsController;
// Controllers
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\Dues\DuesController;
use App\Http\Controllers\Dues\DuesRecapController;
use App\Http\Controllers\Finance\AuditController;
use App\Http\Controllers\Finance\FinancePeriodController;
use App\Http\Controllers\Members\MemberController;
use App\Http\Controllers\Members\MemberImportExportController;
use App\Http\Controllers\Organization\OrganizationAssignmentController;
use App\Http\Controllers\Organization\OrganizationMemberController;
use App\Http\Controllers\Organization\OrganizationPageController;
use App\Http\Controllers\Organization\OrganizationPeriodController;
use App\Http\Controllers\Organization\OrganizationUnitController;
use App\Http\Controllers\Organization\OrganizationUnitPositionController;
use App\Http\Controllers\Portal\PortalLandingContentController;
use App\Http\Controllers\Portal\PublicLandingController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicLetterSignatureController;
use App\Http\Controllers\PublicVerifyLetterController;
use App\Http\Controllers\Reports\CashReportController;
use App\Http\Controllers\Reports\FinancialSummaryController;
use App\Http\Controllers\Reports\ReportsController;
use App\Http\Controllers\Reports\ReportsExportController;
use App\Http\Controllers\Reports\ReportsResumeController;
use App\Http\Controllers\Secretariat\AgendaController;
use App\Http\Controllers\Secretariat\ArchiveController;
use App\Http\Controllers\Secretariat\LetterNumberingProfilesController;
use App\Http\Controllers\Secretariat\LettersController;
use App\Http\Controllers\Secretariat\LetterSignatureController;
use App\Http\Controllers\Secretariat\LetterTemplatesController;
use App\Http\Controllers\Settings\Access\PermissionsController;
use App\Http\Controllers\Settings\Access\RolesController;
use App\Http\Controllers\Settings\Access\UsersController;
use App\Http\Controllers\Settings\BackupController;
use App\Http\Controllers\Settings\DuesSettingsController;
use App\Http\Controllers\Settings\FactoryResetController;
use App\Http\Controllers\Settings\MasterData\CashCategoriesController;
use App\Http\Controllers\Settings\MasterData\CashMethodsController;
use App\Http\Controllers\Settings\MasterData\DivisionsController;
use App\Http\Controllers\Settings\MasterData\MemberStatusesController;
use App\Http\Controllers\Settings\MasterData\PaymentStatusesController;
use App\Http\Controllers\Settings\MasterData\PositionsController;
use App\Http\Controllers\Settings\MasterData\WorkProgramPeriodsController;
use App\Http\Controllers\Settings\OrganizationProfileController;
use App\Http\Controllers\Settings\SettingsController;
use App\Http\Controllers\WorkPrograms\WorkProgramBudgetController;
use App\Http\Controllers\WorkPrograms\WorkProgramCollaboratorDivisionController;
use App\Http\Controllers\WorkPrograms\WorkProgramController;
use App\Http\Controllers\WorkPrograms\WorkProgramDocumentController;
use App\Http\Controllers\WorkPrograms\WorkProgramEvaluationController;
use App\Http\Controllers\WorkPrograms\WorkProgramGanttController;
use App\Http\Controllers\WorkPrograms\WorkProgramMonitoringController;
use App\Http\Controllers\WorkPrograms\WorkProgramReportController;
use App\Http\Controllers\WorkPrograms\WorkProgramRiskController;
use App\Http\Controllers\WorkPrograms\WorkProgramTaskController;
use App\Http\Controllers\WorkPrograms\WorkProgramTaskDependencyController;
use App\Http\Controllers\WorkPrograms\WorkProgramWorkflowController;
use Illuminate\Support\Facades\Route;

Route::get('/', PublicLandingController::class)->name('portal.public');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::prefix('portal-idi')
        ->name('portal-idi.')
        ->middleware('permission:portal.view|portal.manage')
        ->group(function () {
            Route::get('/', [PortalLandingContentController::class, 'index'])->name('contents.index');
            Route::post('/contents', [PortalLandingContentController::class, 'store'])
                ->middleware('permission:portal.manage')
                ->name('contents.store');
            Route::patch('/contents/{content}', [PortalLandingContentController::class, 'update'])
                ->middleware('permission:portal.manage')
                ->name('contents.update');
            Route::delete('/contents/{content}', [PortalLandingContentController::class, 'destroy'])
                ->middleware('permission:portal.manage')
                ->name('contents.destroy');
        });
    Route::prefix('organization')
        ->name('organization.')
        ->middleware('permission:organization.view|organization.history.view')
        ->group(function () {
            Route::get('/periods', [OrganizationPeriodController::class, 'index'])->name('periods.index');
            Route::post('/periods', [OrganizationPeriodController::class, 'store'])->name('periods.store');
            Route::get('/periods/{organizationPeriod}/chart', [OrganizationPeriodController::class, 'chart'])->name('periods.chart');
            Route::get('/periods/{organizationPeriod}/units', [OrganizationUnitController::class, 'index'])->name('periods.units.index');
            Route::post('/periods/{organizationPeriod}/units', [OrganizationUnitController::class, 'store'])->name('periods.units.store');
            Route::get('/periods/{organizationPeriod}/assignments', [OrganizationAssignmentController::class, 'index'])->name('periods.assignments.index');
            Route::post('/periods/{organizationPeriod}/clone-structure', [OrganizationPeriodController::class, 'cloneStructure'])->name('periods.clone-structure');
            Route::get('/periods/{organizationPeriod}/workflow-summary', [OrganizationPeriodController::class, 'workflowSummary'])->name('periods.workflow-summary');
            Route::post('/periods/{organizationPeriod}/publish', [OrganizationPeriodController::class, 'publish'])->name('periods.publish');
            Route::post('/periods/{organizationPeriod}/activate', [OrganizationPeriodController::class, 'activate'])->name('periods.activate');
            Route::post('/periods/{organizationPeriod}/end', [OrganizationPeriodController::class, 'end'])->name('periods.end');
            Route::get('/periods/{organizationPeriod}', [OrganizationPeriodController::class, 'show'])->name('periods.show');
            Route::patch('/periods/{organizationPeriod}', [OrganizationPeriodController::class, 'update'])->name('periods.update');

            Route::get('/units/{organizationUnit}/positions', [OrganizationUnitPositionController::class, 'index'])->name('units.positions.index');
            Route::post('/units/{organizationUnit}/positions', [OrganizationUnitPositionController::class, 'store'])->name('units.positions.store');
            Route::get('/units/{organizationUnit}', [OrganizationUnitController::class, 'show'])->name('units.show');
            Route::patch('/units/{organizationUnit}', [OrganizationUnitController::class, 'update'])->name('units.update');
            Route::post('/units/{organizationUnit}/move', [OrganizationUnitController::class, 'move'])->name('units.move');
            Route::post('/units/{organizationUnit}/deactivate', [OrganizationUnitController::class, 'deactivate'])->name('units.deactivate');

            Route::patch('/unit-positions/{unitPosition}', [OrganizationUnitPositionController::class, 'update'])->name('unit-positions.update');
            Route::post('/unit-positions/{unitPosition}/deactivate', [OrganizationUnitPositionController::class, 'deactivate'])->name('unit-positions.deactivate');

            Route::post('/assignments', [OrganizationAssignmentController::class, 'store'])->name('assignments.store');
            Route::get('/assignments/{organizationAssignment}', [OrganizationAssignmentController::class, 'show'])->name('assignments.show');
            Route::patch('/assignments/{organizationAssignment}', [OrganizationAssignmentController::class, 'update'])->name('assignments.update');
            Route::post('/assignments/{organizationAssignment}/replace', [OrganizationAssignmentController::class, 'replace'])->name('assignments.replace');
            Route::post('/assignments/{organizationAssignment}/end', [OrganizationAssignmentController::class, 'end'])->name('assignments.end');

            Route::get('/members/search', [OrganizationMemberController::class, 'search'])->name('members.search');
            Route::get('/members/{member}/eligibility', [OrganizationMemberController::class, 'eligibility'])->name('members.eligibility');
            Route::get('/members/{member}/history', [OrganizationMemberController::class, 'history'])->name('members.history');
        });
    // Secretariat
    Route::prefix('secretariat')->name('secretariat.')->group(function () {
        Route::get('/', [LettersController::class, 'dashboard'])
            ->middleware('permission:secretariat.view')
            ->name('dashboard');
        Route::get('/organization', OrganizationPageController::class)
            ->middleware('permission:organization.view|organization.history.view')
            ->name('organization.index');
        Route::get('/letters', [LettersController::class, 'index'])
            ->middleware('permission:letters.view')
            ->name('letters.index');
        Route::get('/letters/create', [LettersController::class, 'create'])
            ->middleware('permission:letters.create')
            ->name('letters.create');
        Route::get('/letters/{letter}', [LettersController::class, 'show'])
            ->middleware('permission:letters.view')
            ->name('letters.show');
        Route::get('/letters/{letter}/edit', [LettersController::class, 'edit'])
            ->middleware('permission:letters.create|letters.update')
            ->name('letters.edit');
        Route::get('/letters/{letter}/builder', [LettersController::class, 'builder'])
            ->middleware('permission:letters.create|letters.update')
            ->name('letters.builder');
        Route::post('/letters', [LettersController::class, 'storeDraft'])
            ->middleware('permission:letters.create')
            ->name('letters.store');
        Route::patch('/letters/{letter}', [LettersController::class, 'updateDraft'])
            ->middleware('permission:letters.create|letters.update')
            ->name('letters.update');
        Route::put('/letters/{letter}/layout', [LettersController::class, 'saveLayout'])
            ->middleware('permission:letters.create|letters.update')
            ->name('letters.layout');
        Route::post('/letters/{letter}/attachments', [LettersController::class, 'storeAttachments'])
            ->middleware('permission:letters.update')
            ->name('letters.attachments.store');
        Route::post('/letters/{letter}/signature/prepare', [LetterSignatureController::class, 'prepare'])
            ->middleware('permission:letters.create|letters.update')
            ->name('letters.signature.prepare');
        Route::get('/signatures', [LetterSignatureController::class, 'index'])
            ->name('signatures.index');
        Route::post('/signatures/{signature}/sign', [LetterSignatureController::class, 'sign'])
            ->name('signatures.sign');
        Route::post('/letters/{letter}/finalize', [LettersController::class, 'finalize'])
            ->middleware('permission:letters.finalize')
            ->name('letters.finalize');
        Route::post('/letters/{letter}/generate-number', [LettersController::class, 'generateNumber'])
            ->middleware('permission:letters.create|letters.update')
            ->name('letters.generate-number');
        Route::post('/letters/{letter}/regenerate-pdf', [LettersController::class, 'regeneratePdf'])
            ->middleware('permission:letters.export_pdf')
            ->name('letters.pdf.regenerate');
        Route::patch('/letters/{letter}/archive', [LettersController::class, 'archive'])
            ->middleware('permission:letters.update')
            ->name('letters.archive');
        Route::get('/letters/{letter}/versions', [LettersController::class, 'versions'])
            ->middleware('permission:letters.versions.view')
            ->name('letters.versions');
        Route::get('/letters/{letter}/html', [LettersController::class, 'showHtml'])
            ->middleware('permission:secretariat.view')
            ->name('letters.html');
        Route::get('/letters/{letter}/pdf', [LettersController::class, 'downloadPdf'])
            ->middleware('permission:letters.export_pdf')
            ->name('letters.pdf');
        Route::get('/letters/{letter}/pdf/preview', [LettersController::class, 'previewPdf'])
            ->middleware('permission:letters.export_pdf')
            ->name('letters.pdf.preview');
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
        Route::get('/templates/{template}/builder', [LetterTemplatesController::class, 'builder'])
            ->middleware('permission:templates.manage')
            ->name('templates.builder');
        Route::put('/templates/{template}/layout', [LetterTemplatesController::class, 'saveLayout'])
            ->middleware('permission:templates.manage')
            ->name('templates.layout');
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

        Route::get('/archive', [ArchiveController::class, 'index'])
            ->middleware('permission:secretariat.view')
            ->name('archive.index');
        Route::post('/archive', [ArchiveController::class, 'store'])
            ->middleware('permission:secretariat.view')
            ->name('archive.store');
        Route::get('/documents/{document}/preview', [ArchiveController::class, 'preview'])
            ->middleware('permission:secretariat.view')
            ->name('documents.preview');
        Route::get('/documents/{document}/download', [ArchiveController::class, 'download'])
            ->middleware('permission:secretariat.view')
            ->name('documents.download');
    });
    // MEMBERS
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
    // WORK PROGRAMS
    Route::prefix('work-programs')->name('work-programs.')->group(function () {
        Route::get('/', [WorkProgramController::class, 'index'])
            ->middleware('permission:work_program.view|work_program.view_own_field|work_program.review')
            ->name('index');
        Route::post('/', [WorkProgramController::class, 'store'])
            ->middleware('permission:work_program.create')
            ->name('store');
        Route::get('/report', [WorkProgramReportController::class, 'index'])
            ->middleware('permission:work_program.view|work_program.view_own_field|work_program.review|work_program.update_progress')
            ->name('report');
        Route::get('/report/export', [WorkProgramReportController::class, 'export'])
            ->middleware('permission:work_program.export')
            ->name('report.export');
        Route::get('/report/print', [WorkProgramReportController::class, 'print'])
            ->middleware('permission:work_program.export')
            ->name('report.print');
        Route::post('/{workProgram}/submit', [WorkProgramWorkflowController::class, 'submit'])
            ->middleware('permission:work_program.submit')
            ->name('submit');
        Route::post('/{workProgram}/withdraw', [WorkProgramWorkflowController::class, 'withdraw'])
            ->middleware('permission:work_program.withdraw')
            ->name('withdraw');
        Route::post('/{workProgram}/start-review', [WorkProgramWorkflowController::class, 'startReview'])
            ->middleware('permission:work_program.review')
            ->name('start-review');
        Route::post('/{workProgram}/request-revision', [WorkProgramWorkflowController::class, 'requestRevision'])
            ->middleware('permission:work_program.request_revision')
            ->name('request-revision');
        Route::post('/{workProgram}/approve', [WorkProgramWorkflowController::class, 'approve'])
            ->middleware('permission:work_program.approve')
            ->name('approve');
        Route::post('/{workProgram}/reject', [WorkProgramWorkflowController::class, 'reject'])
            ->middleware('permission:work_program.reject')
            ->name('reject');
        Route::post('/{workProgram}/schedule', [WorkProgramWorkflowController::class, 'schedule'])
            ->middleware('permission:work_program.manage_tasks')
            ->name('schedule');
        Route::post('/{workProgram}/start-execution', [WorkProgramWorkflowController::class, 'startExecution'])
            ->middleware('permission:work_program.update_progress|work_program.manage_tasks')
            ->name('start-execution');
        Route::post('/{workProgram}/hold', [WorkProgramWorkflowController::class, 'hold'])
            ->middleware('permission:work_program.update_progress|work_program.manage_tasks')
            ->name('hold');
        Route::post('/{workProgram}/resume', [WorkProgramWorkflowController::class, 'resume'])
            ->middleware('permission:work_program.update_progress|work_program.manage_tasks')
            ->name('resume');
        Route::post('/{workProgram}/complete', [WorkProgramWorkflowController::class, 'complete'])
            ->middleware('permission:work_program.update_progress|work_program.manage_tasks')
            ->name('complete');
        Route::post('/{workProgram}/archive', [WorkProgramWorkflowController::class, 'archive'])
            ->middleware('permission:work_program.archive')
            ->name('archive');
        Route::get('/{workProgram}/tasks', [WorkProgramTaskController::class, 'index'])
            ->middleware('permission:work_program.view|work_program.view_own_field|work_program.review|work_program.update_progress')
            ->name('tasks.index');
        Route::post('/{workProgram}/tasks', [WorkProgramTaskController::class, 'store'])
            ->middleware('permission:work_program.manage_tasks')
            ->name('tasks.store');
        Route::patch('/{workProgram}/tasks/bulk-schedule', [WorkProgramTaskController::class, 'bulkSchedule'])
            ->middleware('permission:work_program.manage_tasks')
            ->name('tasks.bulk-schedule');
        Route::patch('/{workProgram}/tasks/{task}', [WorkProgramTaskController::class, 'update'])
            ->middleware('permission:work_program.manage_tasks')
            ->name('tasks.update');
        Route::patch('/{workProgram}/tasks/{task}/progress', [WorkProgramTaskController::class, 'updateProgress'])
            ->middleware('permission:work_program.view|work_program.view_own_field|work_program.update_progress|work_program.manage_tasks')
            ->name('tasks.progress');
        Route::delete('/{workProgram}/tasks/{task}', [WorkProgramTaskController::class, 'destroy'])
            ->middleware('permission:work_program.manage_tasks')
            ->name('tasks.destroy');
        Route::get('/{workProgram}/dependencies', [WorkProgramTaskDependencyController::class, 'index'])
            ->middleware('permission:work_program.view|work_program.view_own_field|work_program.review')
            ->name('dependencies.index');
        Route::post('/{workProgram}/dependencies', [WorkProgramTaskDependencyController::class, 'store'])
            ->middleware('permission:work_program.manage_tasks')
            ->name('dependencies.store');
        Route::delete('/{workProgram}/dependencies/{dependency}', [WorkProgramTaskDependencyController::class, 'destroy'])
            ->middleware('permission:work_program.manage_tasks')
            ->name('dependencies.destroy');
        Route::post('/{workProgram}/collaborator-divisions', [WorkProgramCollaboratorDivisionController::class, 'store'])
            ->middleware('permission:work_program.manage_tasks')
            ->name('collaborator-divisions.store');
        Route::delete('/{workProgram}/collaborator-divisions/{collaborator}', [WorkProgramCollaboratorDivisionController::class, 'destroy'])
            ->middleware('permission:work_program.manage_tasks')
            ->name('collaborator-divisions.destroy');
        Route::get('/{workProgram}/gantt', [WorkProgramGanttController::class, 'show'])
            ->middleware('permission:work_program.view|work_program.view_own_field|work_program.review|work_program.update_progress')
            ->name('gantt');
        Route::get('/{workProgram}/documents', [WorkProgramDocumentController::class, 'index'])
            ->middleware('permission:work_program.view|work_program.view_own_field|work_program.review|work_program.update_progress')
            ->name('documents.index');
        Route::post('/{workProgram}/documents', [WorkProgramDocumentController::class, 'store'])
            ->middleware('permission:work_program.upload_document')
            ->name('documents.store');
        Route::get('/{workProgram}/documents/{document}/preview', [WorkProgramDocumentController::class, 'preview'])
            ->middleware('permission:work_program.view|work_program.view_own_field|work_program.review|work_program.update_progress')
            ->name('documents.preview');
        Route::get('/{workProgram}/documents/{document}/download', [WorkProgramDocumentController::class, 'download'])
            ->middleware('permission:work_program.view|work_program.view_own_field|work_program.review|work_program.update_progress')
            ->name('documents.download');
        Route::delete('/{workProgram}/documents/{document}', [WorkProgramDocumentController::class, 'destroy'])
            ->middleware('permission:work_program.upload_document')
            ->name('documents.destroy');
        Route::get('/{workProgram}/budget', [WorkProgramBudgetController::class, 'index'])
            ->middleware('permission:work_program.view|work_program.view_own_field|work_program.review|work_program.update_progress')
            ->name('budget.index');
        Route::patch('/{workProgram}/budget', [WorkProgramBudgetController::class, 'update'])
            ->middleware('permission:work_program.manage_budget')
            ->name('budget.update');
        Route::post('/{workProgram}/budget/items', [WorkProgramBudgetController::class, 'storeItem'])
            ->middleware('permission:work_program.manage_budget')
            ->name('budget-items.store');
        Route::patch('/{workProgram}/budget/items/{item}', [WorkProgramBudgetController::class, 'updateItem'])
            ->middleware('permission:work_program.manage_budget')
            ->name('budget-items.update');
        Route::delete('/{workProgram}/budget/items/{item}', [WorkProgramBudgetController::class, 'destroyItem'])
            ->middleware('permission:work_program.manage_budget')
            ->name('budget-items.destroy');
        Route::post('/{workProgram}/evaluation', [WorkProgramEvaluationController::class, 'upsert'])
            ->middleware('permission:work_program.evaluate')
            ->name('evaluation.upsert');
        Route::get('/{workProgram}/monitoring', [WorkProgramMonitoringController::class, 'show'])
            ->middleware('permission:work_program.view|work_program.view_own_field|work_program.review|work_program.update_progress')
            ->name('monitoring');
        Route::post('/{workProgram}/risks', [WorkProgramRiskController::class, 'store'])
            ->middleware('permission:work_program.manage_tasks')
            ->name('risks.store');
        Route::patch('/{workProgram}/risks/{risk}', [WorkProgramRiskController::class, 'update'])
            ->middleware('permission:work_program.manage_tasks')
            ->name('risks.update');
        Route::delete('/{workProgram}/risks/{risk}', [WorkProgramRiskController::class, 'destroy'])
            ->middleware('permission:work_program.manage_tasks')
            ->name('risks.destroy');
        Route::get('/{workProgram}', [WorkProgramController::class, 'show'])
            ->middleware('permission:work_program.view|work_program.view_own_field|work_program.review|work_program.update_progress')
            ->name('show');
        Route::patch('/{workProgram}', [WorkProgramController::class, 'update'])
            ->middleware('permission:work_program.update')
            ->name('update');
        Route::delete('/{workProgram}', [WorkProgramController::class, 'destroy'])
            ->middleware('permission:work_program.delete')
            ->name('destroy');
    });
    // DUES
    Route::get('/dues', [DuesController::class, 'index'])
        ->middleware('permission:dues.view|dues.manage')
        ->name('dues.index');
    Route::post('/dues/sync', [DuesController::class, 'syncMembers'])
        ->middleware('permission:dues.sync|dues.manage')
        ->name('dues.sync');
    Route::post('/dues/payments', [DuesController::class, 'storePayment'])
        ->middleware('permission:dues.create|dues.manage')
        ->name('dues.payments.store');
    Route::patch('/dues/payments/{payment}', [DuesController::class, 'updatePayment'])
        ->middleware('permission:dues.update|dues.manage')
        ->name('dues.payments.update');
    Route::post('/dues/payments/{payment}/void', [DuesController::class, 'voidPayment'])
        ->middleware('permission:dues.void.request|dues.void')
        ->name('dues.payments.void');
    Route::get('/dues/members/{member}/payments', [DuesController::class, 'memberPayments'])
        ->middleware('permission:dues.view|dues.manage')
        ->name('dues.members.payments');
    Route::get('/dues/recap', [DuesRecapController::class, 'index'])
        ->middleware('permission:dues.recap.view')
        ->name('dues.recap');
    Route::get('/dues/recap/export', [DuesRecapController::class, 'exportXlsx'])
        ->middleware('permission:dues.export')
        ->name('dues.recap.export');
    // CASH
    Route::get('/cash', CashController::class)->name('cash.index');
    Route::get('/cash/reports', CashReportsController::class)->name('cash.reports');
    Route::get('/cash/export', CashExportController::class)->name('cash.export');

    Route::prefix('transactions')->name('transactions.')->group(function () {
        Route::get('/', [TransactionsController::class, 'index'])
            ->middleware('permission:transactions.view')
            ->name('index');
        Route::get('/{transaction}/attachments/{document}', [TransactionsController::class, 'attachment'])
            ->middleware(['permission:transactions.view', 'signed'])
            ->name('attachments.show');
        Route::post('/', [TransactionsController::class, 'store'])
            ->middleware('permission:transactions.create')
            ->name('store');
        Route::patch('/{transaction}', [TransactionsController::class, 'update'])
            ->middleware('permission:transactions.update')
            ->name('update');
        Route::delete('/{transaction}', [TransactionsController::class, 'destroy'])
            ->middleware('permission:transactions.void.request|transactions.delete')
            ->name('destroy');
    });

    Route::get('/audit', [AuditController::class, 'index'])
        ->middleware('permission:activity.view|dues.void.approve|transactions.void.approve')
        ->name('audit.index');
    Route::post('/audit/action-requests/{actionRequest}/approve', [AuditController::class, 'approve'])
        ->middleware('permission:dues.void.approve|transactions.void.approve')
        ->name('audit.action-requests.approve');
    Route::post('/audit/action-requests/{actionRequest}/reject', [AuditController::class, 'reject'])
        ->middleware('permission:dues.void.approve|transactions.void.approve')
        ->name('audit.action-requests.reject');

    Route::get('/finance/periods', [FinancePeriodController::class, 'index'])
        ->middleware('permission:finance.period.view')
        ->name('finance.periods.index');
    Route::post('/finance/periods/{year}/{month}/close', [FinancePeriodController::class, 'close'])
        ->whereNumber('year')
        ->whereNumber('month')
        ->middleware('permission:finance.period.close')
        ->name('finance.periods.close');

    // REPORTS
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
    // SETTINGS
    Route::middleware(['role:admin|superadmin'])->group(function () {
        Route::get('/settings', SettingsController::class)->name('settings.index');
        Route::patch('/settings/profile', [OrganizationProfileController::class, 'update'])->name('settings.profile.update');
        Route::patch('/settings/dues', [DuesSettingsController::class, 'update'])->name('settings.dues.update');
        Route::post('/settings/backups/full', [BackupController::class, 'store'])
            ->middleware('permission:settings.view')
            ->name('settings.backups.store');
        Route::get('/settings/backups/{backup}/download', [BackupController::class, 'download'])
            ->middleware('permission:settings.view')
            ->name('settings.backups.download');
        Route::post('/settings/backups/restore', [BackupController::class, 'restore'])
            ->middleware('permission:settings.view')
            ->name('settings.backups.restore');
        Route::post('/settings/factory-reset/hard', [FactoryResetController::class, 'hardReset'])
            ->middleware('permission:settings.view')
            ->name('settings.factory-reset.hard');
        Route::post('/settings/factory-reset/finance', [FactoryResetController::class, 'financeReset'])
            ->middleware('permission:settings.view')
            ->name('settings.factory-reset.finance');
        Route::post('/settings/factory-reset/custom', [FactoryResetController::class, 'customReset'])
            ->middleware('permission:settings.view')
            ->name('settings.factory-reset.custom');
        Route::prefix('settings/master-data')->name('settings.master-data.')->group(function () {
            Route::post('/divisions', [DivisionsController::class, 'store'])->name('divisions.store');
            Route::patch('/divisions/{division}', [DivisionsController::class, 'update'])->name('divisions.update');
            Route::delete('/divisions/{division}', [DivisionsController::class, 'destroy'])->name('divisions.destroy');
            Route::post('/positions', [PositionsController::class, 'store'])->name('positions.store');
            Route::patch('/positions/{position}', [PositionsController::class, 'update'])->name('positions.update');
            Route::delete('/positions/{position}', [PositionsController::class, 'destroy'])->name('positions.destroy');
            Route::post('/cash-categories', [CashCategoriesController::class, 'store'])->name('cash-categories.store');
            Route::patch('/cash-categories/{cashCategory}', [CashCategoriesController::class, 'update'])->name('cash-categories.update');
            Route::delete('/cash-categories/{cashCategory}', [CashCategoriesController::class, 'destroy'])->name('cash-categories.destroy');
            Route::post('/cash-methods', [CashMethodsController::class, 'store'])->name('cash-methods.store');
            Route::patch('/cash-methods/{cashMethod}', [CashMethodsController::class, 'update'])->name('cash-methods.update');
            Route::delete('/cash-methods/{cashMethod}', [CashMethodsController::class, 'destroy'])->name('cash-methods.destroy');
            Route::post('/member-statuses', [MemberStatusesController::class, 'store'])->name('member-statuses.store');
            Route::patch('/member-statuses/{memberStatus}', [MemberStatusesController::class, 'update'])->name('member-statuses.update');
            Route::delete('/member-statuses/{memberStatus}', [MemberStatusesController::class, 'destroy'])->name('member-statuses.destroy');
            Route::post('/payment-statuses', [PaymentStatusesController::class, 'store'])->name('payment-statuses.store');
            Route::patch('/payment-statuses/{paymentStatus}', [PaymentStatusesController::class, 'update'])->name('payment-statuses.update');
            Route::delete('/payment-statuses/{paymentStatus}', [PaymentStatusesController::class, 'destroy'])->name('payment-statuses.destroy');
            Route::post('/work-program-periods', [WorkProgramPeriodsController::class, 'store'])->name('work-program-periods.store');
            Route::patch('/work-program-periods/{workProgramPeriod}', [WorkProgramPeriodsController::class, 'update'])->name('work-program-periods.update');
            Route::delete('/work-program-periods/{workProgramPeriod}', [WorkProgramPeriodsController::class, 'destroy'])->name('work-program-periods.destroy');
        });
        Route::prefix('settings/access')->name('settings.access.')->group(function () {
            Route::post('/users', [UsersController::class, 'store'])->name('users.store');
            Route::patch('/users/{user}', [UsersController::class, 'update'])->name('users.update');
            Route::patch('/users/{user}/reset-password', [UsersController::class, 'resetPassword'])->name('users.reset-password');
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

Route::get('/letters/{letter}/render', [LettersController::class, 'renderDocument'])
    ->middleware('signed')
    ->name('letters.render');

Route::get('/verifikasi-surat/dokumen/{public_hash}', [PublicVerifyLetterController::class, 'show'])
    ->name('letters.verify');
Route::get('/verifikasi-surat/dokumen/{public_hash}/download', [PublicVerifyLetterController::class, 'download'])
    ->name('letters.verify.download');

Route::get('/verifikasi-surat/{signature}', [PublicLetterSignatureController::class, 'show'])
    ->name('letters.signature.verify');

require __DIR__.'/auth.php';
