<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class LetterTemplate extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'description',
        'content_text',
        'variables_schema',
        'classification',
        'number_format',
        'number_reset_policy',
        'last_number',
        'numbering_profile_id',
        'paper',
        'header_image_path',
        'header_height_px',
        'document_mode',
        'margin_json',
        'blocks_json',
        'layout_json',
        'placeholders_schema_json',
        'signer_name',
        'signer_title',
        'signers_json',
        'signature_enabled',
        'qr_enabled',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'margin_json' => 'array',
        'blocks_json' => 'array',
        'layout_json' => 'array',
        'placeholders_schema_json' => 'array',
        'signers_json' => 'array',
        'signature_enabled' => 'boolean',
        'qr_enabled' => 'boolean',
        'header_height_px' => 'integer',
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
