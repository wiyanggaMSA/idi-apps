<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;

class WorkProgramReportExport implements FromCollection
{
    public function __construct(private readonly Collection $rows) {}

    public function collection(): Collection
    {
        return collect([
            [
                'Kode',
                'Nama Program',
                'Periode',
                'Tahun',
                'Bidang',
                'Status',
                'Prioritas',
                'Progress (%)',
                'PIC',
                'Mulai Rencana',
                'Selesai Rencana',
                'Terlambat',
                'Anggaran Estimasi',
                'Anggaran Realisasi',
                'Sumber Anggaran',
                'Total Task',
                'Task Selesai',
            ],
        ])->merge($this->rows->map(fn (array $row) => [
            $row['program_code'],
            $row['name'],
            $row['period'],
            $row['year'],
            $row['division'],
            $row['status'],
            $row['priority'],
            $row['progress'],
            $row['primary_pic'],
            $row['planned_start_date'],
            $row['planned_end_date'],
            $row['overdue'] ? 'Ya' : 'Tidak',
            $row['estimated_budget'],
            $row['realized_budget'],
            $row['budget_source'],
            $row['task_total'],
            $row['task_completed'],
        ]));
    }
}
