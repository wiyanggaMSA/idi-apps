<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LetterSequence extends Model
{
    protected $fillable = [
        'numbering_profile_id',
        'letter_template_id',
        'year',
        'month',
        'last_seq',
    ];

    public function numberingProfile(): BelongsTo
    {
        return $this->belongsTo(LetterNumberingProfile::class, 'numbering_profile_id');
    }

    public function letterTemplate(): BelongsTo
    {
        return $this->belongsTo(LetterTemplate::class);
    }
}
