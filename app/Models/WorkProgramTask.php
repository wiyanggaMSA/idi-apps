<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkProgramTask extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_TODO = 'todo';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_BLOCKED = 'blocked';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_TODO,
        self::STATUS_IN_PROGRESS,
        self::STATUS_BLOCKED,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED,
    ];

    protected $fillable = [
        'work_program_id',
        'parent_task_id',
        'task_code',
        'sort_order',
        'name',
        'description',
        'planned_start_date',
        'planned_end_date',
        'actual_start_date',
        'actual_end_date',
        'duration_days',
        'progress',
        'weight',
        'status',
        'priority',
        'is_milestone',
        'pic_user_id',
        'estimated_cost',
        'realized_cost',
        'notes',
        'lock_version',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'planned_start_date' => 'date',
        'planned_end_date' => 'date',
        'actual_start_date' => 'date',
        'actual_end_date' => 'date',
        'duration_days' => 'integer',
        'progress' => 'integer',
        'weight' => 'decimal:2',
        'is_milestone' => 'boolean',
        'estimated_cost' => 'decimal:2',
        'realized_cost' => 'decimal:2',
        'lock_version' => 'integer',
    ];

    protected static function booted(): void
    {
        static::saving(function (WorkProgramTask $task) {
            $task->validateDomain();
        });
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(WorkProgram::class, 'work_program_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_task_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_task_id');
    }

    public function pic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function assignees(): HasMany
    {
        return $this->hasMany(WorkProgramTaskAssignee::class);
    }

    public function outgoingDependencies(): HasMany
    {
        return $this->hasMany(WorkProgramTaskDependency::class, 'predecessor_task_id');
    }

    public function incomingDependencies(): HasMany
    {
        return $this->hasMany(WorkProgramTaskDependency::class, 'successor_task_id');
    }

    public function risks(): HasMany
    {
        return $this->hasMany(WorkProgramRisk::class);
    }

    public function documentLinks(): MorphMany
    {
        return $this->morphMany(DocumentLink::class, 'linkable');
    }

    private function validateDomain(): void
    {
        if (! in_array($this->status, self::STATUSES, true)) {
            throw new \InvalidArgumentException('Status task program kerja tidak valid.');
        }

        if ($this->progress < 0 || $this->progress > 100) {
            throw new \InvalidArgumentException('Progres task harus berada di antara 0 dan 100.');
        }

        if ($this->status === self::STATUS_COMPLETED && $this->progress !== 100) {
            throw new \InvalidArgumentException('Task selesai wajib memiliki progres 100.');
        }

        if ($this->planned_start_date && $this->planned_end_date && $this->planned_end_date->lt($this->planned_start_date)) {
            throw new \InvalidArgumentException('Tanggal selesai rencana task tidak boleh sebelum tanggal mulai.');
        }

        if ($this->actual_start_date && $this->actual_end_date && $this->actual_end_date->lt($this->actual_start_date)) {
            throw new \InvalidArgumentException('Tanggal selesai aktual task tidak boleh sebelum tanggal mulai.');
        }

        if ($this->is_milestone && $this->planned_start_date && $this->planned_end_date && ! $this->planned_start_date->isSameDay($this->planned_end_date)) {
            throw new \InvalidArgumentException('Milestone harus memiliki tanggal mulai dan selesai yang sama.');
        }

        if ((float) $this->weight < 0 || (float) $this->estimated_cost < 0 || (float) $this->realized_cost < 0) {
            throw new \InvalidArgumentException('Bobot dan biaya task tidak boleh negatif.');
        }
    }
}
