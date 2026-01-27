<?php

namespace App\Http\Controllers\Cash;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class CashExportController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Cash/Export');
    }
}
