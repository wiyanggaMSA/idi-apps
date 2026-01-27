<?php

namespace App\Http\Controllers\Members;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class MemberImportController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Members/Import');
    }
}
