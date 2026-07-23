<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Member extends Model
{
    use HasFactory, SoftDeletes;

    public const ACTIVE_STATUS_CODES = ['aktif', 'active'];

    protected $fillable = [
        'user_id',
        'npa',
        'full_name',
        'education',
        'phone',
        'gender',
        'birth_place',
        'birth_date',
        'email',
        'division_id',
        'position_id',
        'join_date',
        'status',
        'sip_1',
        'sip_2',
        'sip_3',
        'address',
        'notes',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'join_date' => 'date',
    ];

    public function division(): BelongsTo
    {
        return $this->belongsTo(Division::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function memberStatus(): BelongsTo
    {
        return $this->belongsTo(MemberStatus::class, 'status', 'code');
    }

    public function scopeAssignableActive(Builder $query): Builder
    {
        return $query->where(function (Builder $nested) {
            $nested->whereHas('memberStatus', fn (Builder $status) => $status->active()->activeMember())
                ->orWhereIn('status', self::ACTIVE_STATUS_CODES);
        });
    }

    public function hasAssignableActiveStatus(): bool
    {
        if (in_array($this->status, self::ACTIVE_STATUS_CODES, true)) {
            return true;
        }

        if ($this->relationLoaded('memberStatus')) {
            return (bool) ($this->memberStatus?->is_active && $this->memberStatus?->is_active_member);
        }

        return $this->memberStatus()->active()->activeMember()->exists();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organizationAssignments(): HasMany
    {
        return $this->hasMany(OrganizationAssignment::class);
    }
}
