<?php

namespace App\Http\Controllers\Dues;

use App\Http\Controllers\Controller;
use App\Exports\DuesRecapExport;
use App\Models\Division;
use App\Models\DuesPeriod;
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
        [$startPeriod, $endPeriod] = $this->resolvePeriods($request, $recapService);

        $divisionId = $request->input('division_id');

        $invoices = $recapService->filterInvoices($startPeriod, $endPeriod, $divisionId);
        $monthlyRecap = collect($recapService->buildMonthlyRecap($invoices));
        $memberRecap = collect($recapService->buildMemberRecap($invoices));
        [$analyticsStartPeriod, $analyticsEndPeriod] = $recapService->resolveAnalyticsWindow(60);
        $analyticsInvoices = $recapService->filterInvoices($analyticsStartPeriod, $analyticsEndPeriod, $divisionId);
        $analyticsMemberRecap = collect($recapService->buildMemberRecap($analyticsInvoices));

        return Inertia::render('Dues/Recap', [
            'kpis' => $recapService->buildKpis($invoices),
            'realtimeReceived' => $recapService->buildRealtimeReceived($startPeriod, $endPeriod, $divisionId),
            'monthlyRecap' => $monthlyRecap,
            'memberRecap' => $memberRecap,
            'trend' => $recapService->buildTrend($monthlyRecap),
            'topArrears' => $recapService->buildTopArrears($memberRecap),
            'topArrearsLongTerm' => $recapService->buildTopArrears($analyticsMemberRecap),
            'topPayersLongTerm' => $recapService->buildTopPayers($analyticsMemberRecap),
            'analyticsRange' => [
                'start_period' => $analyticsStartPeriod,
                'end_period' => $analyticsEndPeriod,
            ],
            'divisions' => Division::query()->active()->orderBy('name')->get(['id', 'name']),
            'members' => Member::query()->orderBy('full_name')->get(['id', 'npa', 'full_name']),
            'filters' => [
                'start_period' => $startPeriod,
                'end_period' => $endPeriod,
                'division_id' => $divisionId,
            ],
        ]);
    }

    public function exportXlsx(Request $request, DuesRecapService $recapService)
    {
        [$startPeriod, $endPeriod] = $this->resolvePeriods($request, $recapService);
        $divisionId = $request->input('division_id');

        $invoices = $recapService->filterInvoices($startPeriod, $endPeriod, $divisionId);
        $monthlyRecap = $recapService->buildMonthlyRecap($invoices);
        $memberRecap = $recapService->buildMemberRecap($invoices);

        $filename = sprintf('rekap-iuran-%s.xlsx', now()->format('Ymd-His'));

        return Excel::download(new DuesRecapExport($monthlyRecap, $memberRecap), $filename, \Maatwebsite\Excel\Excel::XLSX);
    }

    private function resolvePeriods(Request $request, DuesRecapService $recapService): array
    {
        $startPeriod = $request->input('start_period');
        $endPeriod = $request->input('end_period');
        $duesStartPeriod = $recapService->duesStartPeriod();

        if (! $startPeriod || ! $endPeriod) {
            $firstPeriod = DuesPeriod::query()->orderBy('period')->value('period');
            $lastPeriod = DuesPeriod::query()->orderByDesc('period')->value('period');

            if ($firstPeriod && $lastPeriod) {
                $startPeriod = $startPeriod ?: $firstPeriod;
                $endPeriod = $endPeriod ?: $lastPeriod;
            } else {
                $startPeriod = $startPeriod ?: $duesStartPeriod;
                $endPeriod = $endPeriod ?: now()->format('Y-m');
            }
        }

        $startPeriod = max($startPeriod, $duesStartPeriod);

        if ($startPeriod && $endPeriod && $startPeriod > $endPeriod) {
            [$startPeriod, $endPeriod] = [$endPeriod, $startPeriod];
        }

        return [$startPeriod, $endPeriod];
    }
}
