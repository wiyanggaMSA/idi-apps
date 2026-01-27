<?php

namespace App\Http\Controllers\Cash;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class CashController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Cash/Index', [
            'summary' => [
                'cash_in' => 5200000,
                'cash_out' => 3100000,
                'balance' => 35500000,
            ],
        ]);
    }
}
