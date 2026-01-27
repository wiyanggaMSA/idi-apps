<?php

namespace App\Http\Controllers\Secretariat;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class ArchiveController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Secretariat/Archive', [
            'documents' => [
                ['id' => 1, 'title' => 'SK Kepengurusan 2026', 'category' => 'SK', 'uploaded_at' => '2026-01-05', 'file' => 'sk-kepengurusan.pdf'],
                ['id' => 2, 'title' => 'Notulen Rapat Januari', 'category' => 'Notulen', 'uploaded_at' => '2026-01-12', 'file' => 'notulen-jan.pdf'],
            ],
        ]);
    }
}
