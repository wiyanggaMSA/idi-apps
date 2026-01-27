<?php

namespace App\Http\Controllers\Secretariat;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class LettersController extends Controller
{
    public function __invoke(): Response
    {
        // dummy data dulu
        return Inertia::render('Secretariat/Letters', [
            'letters' => [
                ['id' => 1, 'type' => 'out', 'letter_no' => '001/IDI-PWK/I/2026', 'subject' => 'Undangan Rapat', 'date' => '2026-01-10', 'status' => 'sent'],
                ['id' => 2, 'type' => 'in',  'letter_no' => '012/EXT/I/2026',     'subject' => 'Permohonan Audiensi', 'date' => '2026-01-11', 'status' => 'received'],
                ['id' => 3, 'type' => 'out', 'letter_no' => null,                'subject' => 'Draft Surat Tugas', 'date' => '2026-01-12', 'status' => 'draft'],
            ],
            'templates' => [
                ['id' => 1, 'code' => 'UNDANGAN_RAPAT', 'name' => 'Undangan Rapat'],
                ['id' => 2, 'code' => 'SURAT_TUGAS', 'name' => 'Surat Tugas'],
                ['id' => 3, 'code' => 'KETERANGAN', 'name' => 'Surat Keterangan'],
            ],
        ]);
    }
}
