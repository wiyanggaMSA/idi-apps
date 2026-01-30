<?php

namespace App\Http\Controllers\Dues;

use App\Http\Controllers\Controller;
use App\Exports\DuesRecapExport;
use App\Models\Division;
use App\Models\Member;
use App\Services\Dues\DuesRecapService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class DuesRecapController extends Controller
{
    public function index(Request $request, DuesRecapService $recapService): Response
    {
        $startPeriod = $request->input('start_period');
        $endPeriod = $request->input('end_period');

        if (! $startPeriod || ! $endPeriod) {
            $startPeriod = now()->startOfYear()->format('Y-m');
            $endPeriod = now()->format('Y-m');
        }

        $divisionId = $request->input('division_id');
        $memberId = $request->input('member_id');

        $invoices = $recapService->filterInvoices($startPeriod, $endPeriod, $divisionId, $memberId);
        $monthlyRecap = collect($recapService->buildMonthlyRecap($invoices));
        $memberRecap = collect($recapService->buildMemberRecap($invoices));

        return Inertia::render('Dues/Recap', [
            'kpis' => $recapService->buildKpis($invoices),
            'monthlyRecap' => $monthlyRecap,
            'memberRecap' => $memberRecap,
            'trend' => $recapService->buildTrend($monthlyRecap),
            'topArrears' => $recapService->buildTopArrears($memberRecap),
            'divisions' => Division::query()->active()->orderBy('name')->get(['id', 'name']),
            'members' => Member::query()->orderBy('full_name')->get(['id', 'npa', 'full_name']),
            'filters' => [
                'start_period' => $startPeriod,
                'end_period' => $endPeriod,
                'division_id' => $divisionId,
                'member_id' => $memberId,
            ],
        ]);
    }

    public function exportXlsx(Request $request, DuesRecapService $recapService)
    {
        $startPeriod = $request->input('start_period') ?? now()->startOfYear()->format('Y-m');
        $endPeriod = $request->input('end_period') ?? now()->format('Y-m');
        $divisionId = $request->input('division_id');
        $memberId = $request->input('member_id');

        $invoices = $recapService->filterInvoices($startPeriod, $endPeriod, $divisionId, $memberId);
        $monthlyRecap = $recapService->buildMonthlyRecap($invoices);
        $memberRecap = $recapService->buildMemberRecap($invoices);

        $filename = sprintf('rekap-iuran-%s.xlsx', now()->format('Ymd-His'));

        return Excel::download(new DuesRecapExport($monthlyRecap, $memberRecap), $filename, \Maatwebsite\Excel\Excel::XLSX);
    }
}
