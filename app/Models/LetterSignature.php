<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LetterSignature extends Model
{
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'letter_id',
        'signer_member_id',
        'signer_name_snapshot',
        'signer_role_snapshot',
        'verification_code',
        'signed_at',
        'revoked_at',
    ];

    protected $casts = [
        'signed_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function letter(): BelongsTo
    {
        return $this->belongsTo(Letter::class);
    }

    public function signerMember(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'signer_member_id');
    }
}
