<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Imports\HeadingRowFormatter;


class MemberImportRows implements WithHeadingRow, SkipsEmptyRows
{
    public function __construct()
    {
        HeadingRowFormatter::default('none');
    }
}
