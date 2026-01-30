<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LetterTemplate extends Model
{
    protected $fillable = [
        'name',
        'code',
        'description',
        'content_text',
        'variables_schema',
        'classification',
        'numbering_profile_id',
        'paper',
        'margin_json',
        'blocks_json',
        'placeholders_schema_json',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'margin_json' => 'array',
        'blocks_json' => 'array',
        'placeholders_schema_json' => 'array',
        'is_active' => 'boolean',
    ];

    public function numberingProfile(): BelongsTo
    {
        return $this->belongsTo(LetterNumberingProfile::class, 'numbering_profile_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
