<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OrganizationUnit extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'period_id',
        'parent_id',
        'master_unit_id',
        'name',
        'code',
        'unit_type',
        'description',
        'display_order',
        'is_core_structure',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'display_order' => 'integer',
        'is_core_structure' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function period(): BelongsTo
    {
        return $this->belongsTo(OrganizationPeriod::class, 'period_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('display_order')->orderBy('name');
    }

    public function masterUnit(): BelongsTo
    {
        return $this->belongsTo(Division::class, 'master_unit_id');
    }

    public function unitPositions(): HasMany
    {
        return $this->hasMany(OrganizationUnitPosition::class, 'organization_unit_id')
            ->orderBy('display_order');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(OrganizationAssignment::class, 'organization_unit_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeRoots(Builder $query): Builder
    {
        return $query->whereNull('parent_id');
    }
}
