<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Illuminate\Support\Collection;

class MemberTemplateExport implements FromCollection, WithHeadings
{
    public function collection(): Collection
    {
        return collect([]);
    }

    public function headings(): array
    {
        return [
            'NPA',
            'Nama Lengkap',
            'Pendidikan',
            'No. HP',
            'Jenis Kelamin',
            'Tempat Lahir',
            'Tanggal Lahir',
            'Email',
            'Divisi',
            'Jabatan',
            'Tanggal Bergabung',
            'Status',
            'SIP-1',
            'SIP-2',
            'SIP-3',
            'Alamat',
            'Catatan',
        ];
    }
}
