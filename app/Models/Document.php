<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'category',
        'document_number',
        'document_date',
        'file_path',
        'mime_type',
        'size',
        'description',
        'source',
        'disk',
        'original_name',
        'tags',
        'uploaded_by',
    ];

    protected $casts = [
        'document_date' => 'date',
    ];

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function links(): HasMany
    {
        return $this->hasMany(DocumentLink::class);
    }
}
