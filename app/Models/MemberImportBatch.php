<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MemberImportBatch extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'original_filename',
        'total_rows',
        'created_count',
        'conflict_count',
        'error_count',
    ];

    public function rows(): HasMany
    {
        return $this->hasMany(MemberImportRow::class, 'batch_id');
    }
}
