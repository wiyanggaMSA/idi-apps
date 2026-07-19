<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OrganizationPeriod extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_PUBLISHED = 'published';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_ENDED = 'ended';

    public const STATUS_ARCHIVED = 'archived';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_PUBLISHED,
        self::STATUS_ACTIVE,
        self::STATUS_ENDED,
        self::STATUS_ARCHIVED,
    ];

    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'status',
        'is_active',
        'published_at',
        'published_by',
        'activated_at',
        'activated_by',
        'ended_at',
        'ended_by',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
        'published_at' => 'datetime',
        'activated_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function units(): HasMany
    {
        return $this->hasMany(OrganizationUnit::class, 'period_id');
    }

    public function unitPositions(): HasMany
    {
        return $this->hasMany(OrganizationUnitPosition::class, 'period_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(OrganizationAssignment::class, 'period_id');
    }

    public function endedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ended_by');
    }

    public function publishedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    public function activatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'activated_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE && $this->is_active;
    }

    public function isReadOnly(): bool
    {
        return in_array($this->status, [self::STATUS_ENDED, self::STATUS_ARCHIVED], true);
    }
}
