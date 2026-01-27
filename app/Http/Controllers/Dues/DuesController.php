<?php

namespace App\Http\Controllers\Dues;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class DuesController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Dues/Index', [
            'summary' => [
                'paid' => 210,
                'unpaid' => 38,
                'overdue' => 27,
            ],
        ]);
    }
}
