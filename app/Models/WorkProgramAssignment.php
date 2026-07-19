<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkProgramAssignment extends Model
{
    use HasFactory;

    public const ROLE_PRIMARY_PIC = 'primary_pic';
    public const ROLE_MEMBER = 'member';
    public const ROLE_REVIEWER = 'reviewer';
    public const ROLE_OBSERVER = 'observer';

    protected $fillable = [
        'work_program_id',
        'user_id',
        'role',
        'assigned_by',
        'assigned_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(WorkProgram::class, 'work_program_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
