<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Letter extends Model
{
    protected $fillable = [
        'type',
        'template_id',
        'classification',
        'number',
        'date',
        'subject',
        'recipient_text',
        'attachments_meta_json',
        'cc_text',
        'signer_name',
        'signer_title',
        'stamp_enabled',
        'stamp_image_path',
        'content_blocks_json',
        'layout_json',
        'blocks_json',
        'content_plaintext',
        'public_hash',
        'qr_payload_json',
        'pdf_path',
        'is_revoked',
        'created_by',
        'updated_by',
        'status',
    ];

    protected $casts = [
        'date' => 'date',
        'attachments_meta_json' => 'array',
        'content_blocks_json' => 'array',
        'layout_json' => 'array',
        'blocks_json' => 'array',
        'qr_payload_json' => 'array',
        'stamp_enabled' => 'boolean',
        'is_revoked' => 'boolean',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(LetterTemplate::class, 'template_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(LetterVersion::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
