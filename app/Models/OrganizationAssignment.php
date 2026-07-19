<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Permission\Models\Role;

class OrganizationAssignment extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_REPLACED = 'replaced';

    public const STATUS_ENDED = 'ended';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_ACTIVE,
        self::STATUS_REPLACED,
        self::STATUS_ENDED,
        self::STATUS_CANCELLED,
    ];

    protected $fillable = [
        'period_id',
        'organization_unit_id',
        'unit_position_id',
        'member_id',
        'portal_role_id',
        'role_was_preexisting',
        'account_was_active',
        'account_was_created',
        'access_applied_at',
        'access_revoked_at',
        'started_at',
        'ended_at',
        'status',
        'appointment_number',
        'appointment_date',
        'notes',
        'end_reason',
        'created_by',
        'updated_by',
        'ended_by',
        'replaced_by_assignment_id',
    ];

    protected $casts = [
        'role_was_preexisting' => 'boolean',
        'account_was_active' => 'boolean',
        'account_was_created' => 'boolean',
        'access_applied_at' => 'datetime',
        'access_revoked_at' => 'datetime',
        'started_at' => 'date',
        'ended_at' => 'date',
        'appointment_date' => 'date',
    ];

    public function period(): BelongsTo
    {
        return $this->belongsTo(OrganizationPeriod::class, 'period_id');
    }

    public function organizationUnit(): BelongsTo
    {
        return $this->belongsTo(OrganizationUnit::class, 'organization_unit_id');
    }

    public function unitPosition(): BelongsTo
    {
        return $this->belongsTo(OrganizationUnitPosition::class, 'unit_position_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function portalRole(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'portal_role_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function endedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ended_by');
    }

    public function replacedBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'replaced_by_assignment_id');
    }

    public function replaces(): HasOne
    {
        return $this->hasOne(self::class, 'replaced_by_assignment_id');
    }

    public function scopeCurrent(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_DRAFT, self::STATUS_ACTIVE]);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE)->whereNull('ended_at');
    }

    public function isCurrent(): bool
    {
        return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_ACTIVE], true);
    }
}
