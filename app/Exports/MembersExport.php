<?php

namespace App\Exports;

use App\Models\Member;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class MembersExport implements FromQuery, WithHeadings, WithMapping
{
    public function __construct(private readonly Builder $query)
    {
    }

    public function query(): Builder
    {
        return $this->query;
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

    /**
     * @param Member $member
     */
    public function map($member): array
    {
        return [
            $member->npa,
            $member->full_name,
            $member->education,
            $member->phone,
            $member->gender,
            $member->birth_place,
            optional($member->birth_date)->format('Y-m-d'),
            $member->email,
            $member->division?->name,
            $member->position?->name,
            optional($member->join_date)->format('Y-m-d'),
            $member->status,
            $member->sip_1,
            $member->sip_2,
            $member->sip_3,
            $member->address,
            $member->notes,
        ];
    }
}
