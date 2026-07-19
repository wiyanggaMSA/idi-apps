<?php

namespace App\Http\Controllers\Cash;

use App\Http\Controllers\Controller;
use App\Models\CashTransaction;
use Illuminate\Http\RedirectResponse;

class CashReportsController extends Controller
{
    public function __invoke(): RedirectResponse
    {
        $this->authorize('viewReport', CashTransaction::class);

        return redirect()->route('reports.cash');
    }
}
