<?php

namespace App\Http\Controllers\WorkPrograms;

use App\Exports\WorkProgramReportExport;
use App\Http\Controllers\Controller;
use App\Models\Division;
use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramPeriod;
use App\Services\WorkPrograms\WorkProgramReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class WorkProgramReportController extends Controller
{
    public function index(Request $request, WorkProgramReportService $service): Response
    {
        $this->authorize('viewAny', WorkProgram::class);

        $rows = $service->rows($request, $request->user());

        return Inertia::render('WorkPrograms/Report', [
            'rows' => $rows,
            'summary' => $service->summary($rows),
            'filters' => $service->filterSnapshot($request),
            'options' => $this->options(),
            'canExport' => $request->user()->can('export', WorkProgram::class),
        ]);
    }

    public function export(Request $request, WorkProgramReportService $service): BinaryFileResponse|HttpResponse
    {
        $this->authorize('export', WorkProgram::class);

        $rows = $service->rows($request, $request->user());
        $format = strtolower((string) $request->input('format', 'xlsx'));
        $filename = 'laporan-program-kerja-'.now()->format('Ymd-His');

        if ($format === 'csv') {
            return Excel::download(new WorkProgramReportExport($rows), "{$filename}.csv", \Maatwebsite\Excel\Excel::CSV);
        }

        if ($format === 'pdf') {
            return Pdf::loadView('work-programs.report', [
                'rows' => $rows,
                'summary' => $service->summary($rows),
                'filters' => $service->filterSnapshot($request),
                'generatedAt' => now(),
            ])->setPaper('a4', 'landscape')->download("{$filename}.pdf");
        }

        return Excel::download(new WorkProgramReportExport($rows), "{$filename}.xlsx", \Maatwebsite\Excel\Excel::XLSX);
    }

    public function print(Request $request, WorkProgramReportService $service): HttpResponse
    {
        $this->authorize('export', WorkProgram::class);

        $rows = $service->rows($request, $request->user());

        return response()->view('work-programs.report', [
            'rows' => $rows,
            'summary' => $service->summary($rows),
            'filters' => $service->filterSnapshot($request),
            'generatedAt' => now(),
        ]);
    }

    private function options(): array
    {
        return [
            'periods' => WorkProgramPeriod::query()
                ->active()
                ->orderByDesc('start_date')
                ->get(['id', 'name', 'code']),
            'divisions' => Division::query()
                ->active()
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'users' => User::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'email']),
            'statuses' => WorkProgram::STATUSES,
            'priorities' => [
                WorkProgram::PRIORITY_LOW,
                WorkProgram::PRIORITY_MEDIUM,
                WorkProgram::PRIORITY_HIGH,
                WorkProgram::PRIORITY_CRITICAL,
            ],
        ];
    }
}
