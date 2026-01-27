<?php

namespace App\Http\Controllers\Members;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class MemberController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Members/Index', [
            'stats' => [
                'total' => 248,
                'active' => 231,
                'inactive' => 17,
            ],
        ]);
    }
}
