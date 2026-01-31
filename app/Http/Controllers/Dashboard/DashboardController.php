<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Services\Dashboard\DashboardMetricsService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, DashboardMetricsService $service): Response
    {
        $monthParam = $request->string('month')->toString();

        try {
            $month = $monthParam !== '' ? Carbon::createFromFormat('Y-m', $monthParam) : Carbon::now();
        } catch (\Throwable) {
            $month = Carbon::now();
        }

        $monthKey = $month->format('Y-m');
        $startDate = $month->copy()->startOfMonth();
        $endDate = $month->copy()->endOfMonth();

        $payload = Cache::remember("dashboard:{$monthKey}", 300, function () use ($service, $startDate, $endDate, $monthKey) {
            return $service->build($startDate, $endDate, $monthKey);
        });

        return Inertia::render('Dashboard', array_merge($payload, [
            'filters' => [
                'month' => $monthKey,
            ],
        ]));
    }
}
