<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DuesSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'dues_amount',
        'dues_start_period',
        'due_day',
        'grace_days',
        'auto_mark_arrears',
    ];

    protected $casts = [
        'auto_mark_arrears' => 'boolean',
    ];
}
