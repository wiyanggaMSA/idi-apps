<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Services\Cash\CashReportService;
use App\Services\Finance\FinancePeriodService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CashReportController extends Controller
{
    public function index(Request $request, CashReportService $service, FinancePeriodService $financePeriodService): Response
    {
        $filters = [
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'category_id' => $request->input('category_id'),
            'method_id' => $request->input('method_id'),
            'include_dues' => $request->boolean('include_dues', true),
        ];

        $report = $service->build($filters);

        return Inertia::render('Reports/Cash', [
            'filters' => $filters,
            'period_status' => $financePeriodService->statusForRange($filters['start_date'], $filters['end_date']),
            'summary' => [
                'total_in' => $report['totals']['total_in'],
                'total_out' => $report['totals']['total_out'],
                'net' => $report['totals']['net'],
                'opening_balance' => $report['opening_balance'],
                'closing_balance' => $report['closing_balance'],
            ],
            'monthly' => $report['monthly'],
            'by_category' => $report['by_category'],
            'by_method' => $report['by_method'],
            'categories' => CashCategory::query()->active()->orderBy('name')->get(['id', 'name']),
            'methods' => CashMethod::query()->active()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function pdf(Request $request, CashReportService $service, FinancePeriodService $financePeriodService)
    {
        $filters = [
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'category_id' => $request->input('category_id'),
            'method_id' => $request->input('method_id'),
            'include_dues' => $request->boolean('include_dues', true),
        ];

        $report = $service->build($filters);

        $pdf = Pdf::loadView('reports.cash-pdf', [
            'org' => AppSetting::query()->first(),
            'filters' => $filters,
            'period_status' => $financePeriodService->statusForRange($filters['start_date'], $filters['end_date']),
            'summary' => [
                'total_in' => $report['totals']['total_in'],
                'total_out' => $report['totals']['total_out'],
                'net' => $report['totals']['net'],
                'opening_balance' => $report['opening_balance'],
                'closing_balance' => $report['closing_balance'],
            ],
            'monthly' => $report['monthly'],
            'by_category' => $report['by_category'],
            'by_method' => $report['by_method'],
        ]);

        return $pdf->stream('laporan-kas.pdf');
    }
}
