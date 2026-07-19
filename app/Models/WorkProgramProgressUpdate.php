<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkProgramProgressUpdate extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_program_id',
        'work_program_task_id',
        'progress_before',
        'progress_after',
        'status_before',
        'status_after',
        'planned_start_date',
        'planned_end_date',
        'actual_start_date',
        'actual_end_date',
        'notes',
        'updated_by',
        'updated_at_snapshot',
    ];

    protected $casts = [
        'progress_before' => 'integer',
        'progress_after' => 'integer',
        'planned_start_date' => 'date',
        'planned_end_date' => 'date',
        'actual_start_date' => 'date',
        'actual_end_date' => 'date',
        'updated_at_snapshot' => 'datetime',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(WorkProgram::class, 'work_program_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(WorkProgramTask::class, 'work_program_task_id');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
