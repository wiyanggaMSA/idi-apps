<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Division;
use App\Services\Cash\FinancialSummaryService;
use App\Services\Finance\FinancePeriodService;
use App\Services\Pdf\MpdfRenderer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinancialSummaryController extends Controller
{
    public function index(Request $request, FinancialSummaryService $service, FinancePeriodService $financePeriodService): Response
    {
        $filters = [
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'division_id' => $request->input('division_id'),
            'include_dues_in_cash' => $request->boolean('include_dues_in_cash', true),
        ];

        $summary = $service->build($filters);

        return Inertia::render('Reports/FinancialSummary', [
            'filters' => $filters,
            'period_status' => $financePeriodService->statusForRange($filters['start_date'], $filters['end_date']),
            'summary' => $summary,
            'divisions' => Division::query()->active()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function pdf(
        Request $request,
        FinancialSummaryService $service,
        FinancePeriodService $financePeriodService,
        MpdfRenderer $pdfRenderer
    ) {
        $filters = [
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'division_id' => $request->input('division_id'),
            'include_dues_in_cash' => $request->boolean('include_dues_in_cash', true),
        ];

        $summary = $service->build($filters);

        return $pdfRenderer->inlineView('reports.financial-summary-pdf', [
            'org' => AppSetting::query()->first(),
            'filters' => $filters,
            'period_status' => $financePeriodService->statusForRange($filters['start_date'], $filters['end_date']),
            'summary' => $summary,
        ], 'resume-keuangan.pdf');
    }
}
