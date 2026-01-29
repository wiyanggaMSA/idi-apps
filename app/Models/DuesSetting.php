<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DuesSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'dues_amount',
        'due_day',
        'grace_days',
        'auto_mark_arrears',
        'allow_partial',
    ];

    protected $casts = [
        'auto_mark_arrears' => 'boolean',
        'allow_partial' => 'boolean',
    ];
}
