<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        // sementara dummy dulu, nanti diganti query dari tabel transaksi/iuran/surat
        return Inertia::render('Dashboard', [
            'kpi' => [
                'cash_in' => 5200000,
                'cash_out' => 3100000,
                'balance' => 35500000,
                'members_total' => 248,
                'members_active' => 231,
                'dues_overdue' => 27,
            ],
            'trend' => [
                ['m' => 'Jan', 'in' => 2200000, 'out' => 1300000],
                ['m' => 'Feb', 'in' => 3000000, 'out' => 1700000],
                ['m' => 'Mar', 'in' => 2500000, 'out' => 1400000],
                ['m' => 'Apr', 'in' => 3200000, 'out' => 1800000],
                ['m' => 'Mei', 'in' => 5200000, 'out' => 3100000],
                ['m' => 'Jun', 'in' => 4800000, 'out' => 2900000],
            ],
            'recentTransactions' => [
                ['id' => 1, 'date' => '2026-01-12', 'type' => 'in',  'desc' => 'Iuran anggota', 'amount' => 200000, 'category' => 'Iuran'],
                ['id' => 2, 'date' => '2026-01-13', 'type' => 'out', 'desc' => 'Konsumsi rapat', 'amount' => 150000, 'category' => 'Operasional'],
                ['id' => 3, 'date' => '2026-01-14', 'type' => 'out', 'desc' => 'Cetak dokumen', 'amount' => 75000, 'category' => 'Operasional'],
                ['id' => 4, 'date' => '2026-01-15', 'type' => 'in',  'desc' => 'Donasi kegiatan', 'amount' => 500000, 'category' => 'Donasi'],
            ],
            'recentLetters' => [
                ['id' => 1, 'type' => 'out', 'no' => '001/IDI-PWK/I/2026', 'subject' => 'Undangan Rapat', 'date' => '2026-01-10', 'status' => 'sent'],
                ['id' => 2, 'type' => 'in',  'no' => '012/EXT/I/2026', 'subject' => 'Permohonan Audiensi', 'date' => '2026-01-11', 'status' => 'received'],
            ],
        ]);
    }
}
