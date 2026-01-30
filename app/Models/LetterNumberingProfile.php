<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LetterNumberingProfile extends Model
{
    protected $fillable = [
        'name',
        'pattern',
        'reset_policy',
        'prefix',
        'suffix',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
