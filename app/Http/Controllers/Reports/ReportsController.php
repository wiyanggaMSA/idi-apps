<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class ReportsController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Reports/Index', [
            'periods' => ['2026-01', '2025-12', '2025-11'],
        ]);
    }
}
