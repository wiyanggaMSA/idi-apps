<?php

namespace App\Http\Controllers\Dues;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class DuesRecapController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Dues/Recap');
    }
}
