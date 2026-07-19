<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\FinancePeriod;
use App\Services\Finance\FinancePeriodService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinancePeriodController extends Controller
{
    public function index(FinancePeriodService $service): Response
    {
        $this->authorize('viewAny', FinancePeriod::class);

        return Inertia::render('Finance/Periods', [
            'periods' => $service->listRecentPeriods(),
        ]);
    }

    public function close(Request $request, int $year, int $month, FinancePeriodService $service): RedirectResponse
    {
        abort_unless($month >= 1 && $month <= 12, 404);

        $period = $service->getOrCreateForPeriod($year, $month);
        $this->authorize('close', $period);

        $data = $request->validate([
            'notes' => ['required', 'string', 'min:3', 'max:1000'],
        ]);

        try {
            $service->close($period, $request->user(), $data['notes']);
        } catch (\RuntimeException $exception) {
            return back()->withErrors(['period' => $exception->getMessage()]);
        }

        return back()->with('success', 'Periode keuangan berhasil ditutup.');
    }
}
