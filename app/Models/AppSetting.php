<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    protected $fillable = [
        'org_name',
        'org_unit',
        'address',
        'phone',
        'email',
        'currency',
        'timezone',
        'brand_color',
        'logo_path',
        'header_variant',
    ];
}
