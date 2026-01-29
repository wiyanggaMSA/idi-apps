<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemberImportRow extends Model
{
    use HasFactory;

    protected $fillable = [
        'batch_id',
        'row_number',
        'npa',
        'full_name',
        'education',
        'phone',
        'gender',
        'birth_place',
        'birth_date',
        'email',
        'division_name',
        'position_name',
        'division_id',
        'position_id',
        'join_date',
        'status',
        'address',
        'notes',
        'conflict_type',
        'conflict_member_ids',
        'action',
        'resolved_at',
        'resolved_by',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'join_date' => 'date',
        'conflict_type' => 'array',
        'conflict_member_ids' => 'array',
        'resolved_at' => 'datetime',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(MemberImportBatch::class, 'batch_id');
    }
}
