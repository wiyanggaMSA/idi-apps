<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkProgramNotification extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_program_id',
        'work_program_task_id',
        'recipient_user_id',
        'type',
        'dedupe_key',
        'title',
        'message',
        'payload',
        'read_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'read_at' => 'datetime',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(WorkProgram::class, 'work_program_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(WorkProgramTask::class, 'work_program_task_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }
}
