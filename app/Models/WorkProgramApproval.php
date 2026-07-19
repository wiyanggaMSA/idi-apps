<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkProgramApproval extends Model
{
    use HasFactory;

    public const ACTION_CREATED = 'created';
    public const ACTION_SUBMITTED = 'submitted';
    public const ACTION_WITHDRAWN = 'withdrawn';
    public const ACTION_REVIEW_STARTED = 'review_started';
    public const ACTION_REVISION_REQUESTED = 'revision_requested';
    public const ACTION_APPROVED = 'approved';
    public const ACTION_REJECTED = 'rejected';
    public const ACTION_SCHEDULED = 'scheduled';
    public const ACTION_STARTED = 'started';
    public const ACTION_HELD = 'held';
    public const ACTION_RESUMED = 'resumed';
    public const ACTION_COMPLETED = 'completed';
    public const ACTION_CANCELLED = 'cancelled';
    public const ACTION_EVALUATED = 'evaluated';
    public const ACTION_ARCHIVED = 'archived';

    protected $fillable = [
        'work_program_id',
        'action',
        'from_status',
        'to_status',
        'actor_id',
        'reviewer_id',
        'note',
        'metadata',
        'acted_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'acted_at' => 'datetime',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(WorkProgram::class, 'work_program_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
