<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LetterVersion extends Model
{
    protected $fillable = [
        'letter_id',
        'version',
        'number',
        'date',
        'subject',
        'recipient_text',
        'cc_text',
        'signer_name',
        'signer_title',
        'content_blocks_json',
        'content_plaintext',
        'pdf_path',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date',
        'content_blocks_json' => 'array',
    ];

    public function letter(): BelongsTo
    {
        return $this->belongsTo(Letter::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
