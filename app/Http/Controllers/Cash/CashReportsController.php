<?php

namespace App\Http\Controllers\Cash;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class CashReportsController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Cash/Reports');
    }
}
