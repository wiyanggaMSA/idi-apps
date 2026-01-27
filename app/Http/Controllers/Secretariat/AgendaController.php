<?php

namespace App\Http\Controllers\Secretariat;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class AgendaController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Secretariat/Agenda', [
            'events' => [
                ['id' => 1, 'title' => 'Rapat Pengurus', 'start_at' => '2026-01-28 19:00', 'location' => 'Sekretariat IDI', 'status' => 'planned'],
                ['id' => 2, 'title' => 'PROMPT Training', 'start_at' => '2026-01-30 15:00', 'location' => 'Sekretariat IDI', 'status' => 'planned'],
            ],
        ]);
    }
}
