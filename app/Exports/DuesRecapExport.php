<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;

class DuesRecapExport implements FromCollection
{
    /**
     * @param array<int, array<string, mixed>> $monthlyRecap
     * @param array<int, array<string, mixed>> $memberRecap
     */
    public function __construct(
        private readonly array $monthlyRecap,
        private readonly array $memberRecap
    ) {
    }

    public function collection(): Collection
    {
        $rows = collect();

        $rows->push(['Rekap Per Bulan']);
        $rows->push([
            'Periode',
            'Total Tagihan',
            'Total Dibayar',
            'Outstanding',
            'Collection Rate (%)',
            'Overdue Count',
        ]);

        foreach ($this->monthlyRecap as $row) {
            $rows->push([
                $row['period_label'],
                $row['total_due'],
                $row['total_paid'],
                $row['outstanding'],
                $row['collection_rate'],
                $row['overdue_count'],
            ]);
        }

        $rows->push([]);
        $rows->push(['Rekap Per Member']);
        $rows->push([
            'NPA',
            'Nama',
            'Total Tagihan',
            'Total Dibayar',
            'Outstanding',
            'Status',
        ]);

        foreach ($this->memberRecap as $row) {
            $rows->push([
                $row['npa'],
                $row['name'],
                $row['total_due'],
                $row['total_paid'],
                $row['outstanding'],
                $row['status'],
            ]);
        }

        return $rows;
    }
}
