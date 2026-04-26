<?php

namespace App\Http\Controllers\Cash;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;

class CashExportController extends Controller
{
    public function __invoke(): RedirectResponse
    {
        return redirect()->route('reports.export');
    }
}
