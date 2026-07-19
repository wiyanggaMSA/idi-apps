<?php

namespace App\Http\Controllers\Cash;

use App\Http\Controllers\Controller;
use App\Models\CashTransaction;
use Illuminate\Http\RedirectResponse;

class CashExportController extends Controller
{
    public function __invoke(): RedirectResponse
    {
        $this->authorize('export', CashTransaction::class);

        return redirect()->route('reports.export');
    }
}
