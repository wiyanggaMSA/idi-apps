<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LetterNumberingProfile extends Model
{
    use SoftDeletes;
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
