<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkProgramTaskDependency extends Model
{
    use HasFactory;

    public const TYPE_FINISH_TO_START = 'finish_to_start';
    public const TYPE_START_TO_START = 'start_to_start';
    public const TYPE_FINISH_TO_FINISH = 'finish_to_finish';
    public const TYPE_START_TO_FINISH = 'start_to_finish';

    public const TYPES = [
        self::TYPE_FINISH_TO_START,
        self::TYPE_START_TO_START,
        self::TYPE_FINISH_TO_FINISH,
        self::TYPE_START_TO_FINISH,
    ];

    protected $fillable = [
        'work_program_id',
        'predecessor_task_id',
        'successor_task_id',
        'type',
        'lag_days',
        'created_by',
    ];

    protected $casts = [
        'lag_days' => 'integer',
    ];

    protected static function booted(): void
    {
        static::saving(function (WorkProgramTaskDependency $dependency) {
            if ($dependency->predecessor_task_id === $dependency->successor_task_id) {
                throw new \InvalidArgumentException('Task tidak boleh bergantung pada dirinya sendiri.');
            }

            if (! in_array($dependency->type, self::TYPES, true)) {
                throw new \InvalidArgumentException('Tipe dependency program kerja tidak valid.');
            }
        });
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(WorkProgram::class, 'work_program_id');
    }

    public function predecessor(): BelongsTo
    {
        return $this->belongsTo(WorkProgramTask::class, 'predecessor_task_id');
    }

    public function successor(): BelongsTo
    {
        return $this->belongsTo(WorkProgramTask::class, 'successor_task_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
