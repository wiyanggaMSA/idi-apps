<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkProgramTaskAssignee extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_program_task_id',
        'user_id',
        'role',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(WorkProgramTask::class, 'work_program_task_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
