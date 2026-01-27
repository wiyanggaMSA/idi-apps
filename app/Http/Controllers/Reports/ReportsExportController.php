<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class ReportsExportController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Reports/Export');
    }
}
