<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    protected $fillable = [
        'org_name',
        'address',
        'phone',
        'email',
        'currency',
        'timezone',
        'brand_color',
        'logo_path',
    ];
}
