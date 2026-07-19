<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OrganizationUnitPosition extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'period_id',
        'organization_unit_id',
        'position_id',
        'custom_title',
        'display_order',
        'is_required',
        'is_active',
    ];

    protected $casts = [
        'display_order' => 'integer',
        'is_required' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function period(): BelongsTo
    {
        return $this->belongsTo(OrganizationPeriod::class, 'period_id');
    }

    public function organizationUnit(): BelongsTo
    {
        return $this->belongsTo(OrganizationUnit::class, 'organization_unit_id');
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(OrganizationAssignment::class, 'unit_position_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function getDisplayTitleAttribute(): string
    {
        return $this->custom_title ?: ($this->position?->name ?? '-');
    }
}
