<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkProgramRisk extends Model
{
    use HasFactory, SoftDeletes;

    public const TYPE_RISK = 'risk';
    public const TYPE_ISSUE = 'issue';

    public const LEVEL_LOW = 'low';
    public const LEVEL_MEDIUM = 'medium';
    public const LEVEL_HIGH = 'high';
    public const LEVEL_EXTREME = 'extreme';

    public const LEVELS = [
        self::LEVEL_LOW,
        self::LEVEL_MEDIUM,
        self::LEVEL_HIGH,
        self::LEVEL_EXTREME,
    ];

    protected $fillable = [
        'work_program_id',
        'work_program_task_id',
        'type',
        'title',
        'description',
        'category',
        'likelihood',
        'impact',
        'level',
        'severity',
        'status',
        'mitigation_plan',
        'follow_up',
        'evidence_note',
        'owner_user_id',
        'due_date',
        'resolved_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'likelihood' => 'integer',
        'impact' => 'integer',
        'due_date' => 'date',
        'resolved_at' => 'datetime',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(WorkProgram::class, 'work_program_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(WorkProgramTask::class, 'work_program_task_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }
}
