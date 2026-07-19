<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class WorkProgram extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_UNDER_REVIEW = 'under_review';

    public const STATUS_REVISION_REQUESTED = 'revision_requested';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_SCHEDULED = 'scheduled';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_ON_HOLD = 'on_hold';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_EVALUATED = 'evaluated';

    public const STATUS_ARCHIVED = 'archived';

    public const NATURE_ROUTINE = 'routine';

    public const NATURE_INCIDENTAL = 'incidental';

    public const NATURE_STRATEGIC = 'strategic';

    public const NATURE_COLLABORATIVE = 'collaborative';

    public const SOURCE_FIELD_PROPOSAL = 'field_proposal';

    public const SOURCE_ORGANIZATIONAL_MANDATE = 'organizational_mandate';

    public const SOURCE_WORK_MEETING_RESULT = 'work_meeting_result';

    public const SOURCE_EVALUATION_FOLLOW_UP = 'evaluation_follow_up';

    public const PRIORITY_LOW = 'low';

    public const PRIORITY_MEDIUM = 'medium';

    public const PRIORITY_HIGH = 'high';

    public const PRIORITY_CRITICAL = 'critical';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_SUBMITTED,
        self::STATUS_UNDER_REVIEW,
        self::STATUS_REVISION_REQUESTED,
        self::STATUS_APPROVED,
        self::STATUS_REJECTED,
        self::STATUS_SCHEDULED,
        self::STATUS_IN_PROGRESS,
        self::STATUS_ON_HOLD,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED,
        self::STATUS_EVALUATED,
        self::STATUS_ARCHIVED,
    ];

    public const TRANSITIONS = [
        self::STATUS_DRAFT => [self::STATUS_SUBMITTED, self::STATUS_CANCELLED],
        self::STATUS_SUBMITTED => [self::STATUS_DRAFT, self::STATUS_UNDER_REVIEW, self::STATUS_CANCELLED],
        self::STATUS_UNDER_REVIEW => [self::STATUS_REVISION_REQUESTED, self::STATUS_APPROVED, self::STATUS_REJECTED],
        self::STATUS_REVISION_REQUESTED => [self::STATUS_SUBMITTED, self::STATUS_CANCELLED],
        self::STATUS_APPROVED => [self::STATUS_SCHEDULED, self::STATUS_CANCELLED],
        self::STATUS_SCHEDULED => [self::STATUS_IN_PROGRESS, self::STATUS_CANCELLED],
        self::STATUS_IN_PROGRESS => [self::STATUS_ON_HOLD, self::STATUS_COMPLETED, self::STATUS_CANCELLED],
        self::STATUS_ON_HOLD => [self::STATUS_IN_PROGRESS],
        self::STATUS_COMPLETED => [self::STATUS_REVISION_REQUESTED, self::STATUS_EVALUATED],
        self::STATUS_EVALUATED => [self::STATUS_ARCHIVED],
    ];

    protected $fillable = [
        'uuid',
        'program_code',
        'name',
        'work_program_period_id',
        'year',
        'division_id',
        'category',
        'type',
        'nature',
        'source',
        'status',
        'priority',
        'description',
        'background',
        'objectives',
        'target_audience',
        'success_indicators',
        'expected_output',
        'location',
        'planned_start_date',
        'planned_end_date',
        'actual_start_date',
        'actual_end_date',
        'estimated_budget',
        'realized_budget',
        'budget_source',
        'primary_pic_user_id',
        'submitted_at',
        'submitted_by',
        'approved_at',
        'approved_by',
        'rejected_at',
        'rejected_by',
        'completed_at',
        'evaluated_at',
        'archived_at',
        'internal_notes',
        'lock_version',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'planned_start_date' => 'date',
        'planned_end_date' => 'date',
        'actual_start_date' => 'date',
        'actual_end_date' => 'date',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'completed_at' => 'datetime',
        'evaluated_at' => 'datetime',
        'archived_at' => 'datetime',
        'estimated_budget' => 'decimal:2',
        'realized_budget' => 'decimal:2',
        'lock_version' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (WorkProgram $program) {
            $program->uuid ??= (string) Str::uuid();
        });

        static::saving(function (WorkProgram $program) {
            $program->validateDomain();
        });
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->can('work_program.view')) {
            return $query;
        }

        $divisionId = $user->member?->division_id;

        return $query->where(function (Builder $scope) use ($user, $divisionId) {
            $scope->where('primary_pic_user_id', $user->id)
                ->orWhereHas('assignments', fn (Builder $assignment) => $assignment->where('user_id', $user->id))
                ->orWhereHas('tasks', fn (Builder $task) => $task
                    ->where('pic_user_id', $user->id)
                    ->orWhereHas('assignees', fn (Builder $assignee) => $assignee->where('user_id', $user->id)));

            if ($divisionId && $user->can('work_program.view_own_field')) {
                $scope->orWhere('division_id', $divisionId)
                    ->orWhereHas('collaboratorDivisions', fn (Builder $collaborator) => $collaborator->where('division_id', $divisionId));
            }
        });
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(WorkProgramPeriod::class, 'work_program_period_id');
    }

    public function division(): BelongsTo
    {
        return $this->belongsTo(Division::class);
    }

    public function primaryPic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'primary_pic_user_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(WorkProgramTask::class);
    }

    public function budgetItems(): HasMany
    {
        return $this->hasMany(WorkProgramBudgetItem::class);
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(WorkProgramApproval::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(WorkProgramAssignment::class);
    }

    public function collaboratorDivisions(): HasMany
    {
        return $this->hasMany(WorkProgramCollaboratorDivision::class);
    }

    public function risks(): HasMany
    {
        return $this->hasMany(WorkProgramRisk::class);
    }

    public function progressUpdates(): HasMany
    {
        return $this->hasMany(WorkProgramProgressUpdate::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(WorkProgramNotification::class);
    }

    public function evaluation(): HasOne
    {
        return $this->hasOne(WorkProgramEvaluation::class);
    }

    public function documentLinks(): MorphMany
    {
        return $this->morphMany(DocumentLink::class, 'linkable');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    private function validateDomain(): void
    {
        if (! in_array($this->status, self::STATUSES, true)) {
            throw new \InvalidArgumentException('Status program kerja tidak valid.');
        }

        if ($this->planned_start_date && $this->planned_end_date && $this->planned_end_date->lt($this->planned_start_date)) {
            throw new \InvalidArgumentException('Tanggal selesai rencana tidak boleh sebelum tanggal mulai.');
        }

        if ($this->actual_start_date && $this->actual_end_date && $this->actual_end_date->lt($this->actual_start_date)) {
            throw new \InvalidArgumentException('Tanggal selesai aktual tidak boleh sebelum tanggal mulai.');
        }

        if ((float) $this->estimated_budget < 0 || (float) $this->realized_budget < 0) {
            throw new \InvalidArgumentException('Anggaran program kerja tidak boleh negatif.');
        }
    }
}
