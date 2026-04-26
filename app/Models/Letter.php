<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

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
        'signers_json',
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
        'archived_at',
        'finalized_at',
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
        'signers_json' => 'array',
        'qr_payload_json' => 'array',
        'stamp_enabled' => 'boolean',
        'is_revoked' => 'boolean',
        'archived_at' => 'datetime',
        'finalized_at' => 'datetime',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(LetterTemplate::class, 'template_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(LetterVersion::class);
    }

    public function signatures(): HasMany
    {
        return $this->hasMany(LetterSignature::class);
    }

    public function latestSignature(): HasOne
    {
        return $this->hasOne(LetterSignature::class)->latestOfMany();
    }

    public function documents(): MorphToMany
    {
        return $this->morphToMany(Document::class, 'linkable', 'document_links')->withTimestamps();
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
