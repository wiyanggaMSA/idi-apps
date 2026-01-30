<?php

namespace App\Http\Controllers\Secretariat;

use App\Http\Controllers\Controller;
use App\Models\Letter;
use Inertia\Inertia;
use Inertia\Response;

class ArchiveController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Secretariat/Archive', [
        'letters' => Letter::query()->where('status', 'ARCHIVED')->latest()->paginate(10),
        ]);
    }
}
