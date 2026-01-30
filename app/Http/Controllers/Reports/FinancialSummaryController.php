<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Division;
use App\Services\Cash\FinancialSummaryService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinancialSummaryController extends Controller
{
    public function index(Request $request, FinancialSummaryService $service): Response
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
            'summary' => $summary,
            'divisions' => Division::query()->active()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function pdf(Request $request, FinancialSummaryService $service)
    {
        $filters = [
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'division_id' => $request->input('division_id'),
            'include_dues_in_cash' => $request->boolean('include_dues_in_cash', true),
        ];

        $summary = $service->build($filters);

        $pdf = Pdf::loadView('reports.financial-summary-pdf', [
            'org' => AppSetting::query()->first(),
            'filters' => $filters,
            'summary' => $summary,
        ]);

        return $pdf->stream('resume-keuangan.pdf');
    }
}
