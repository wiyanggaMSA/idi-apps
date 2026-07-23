<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MemberStatus extends Model
{
    use SoftDeletes;

    public const LEGACY_STATUS_LABELS = [
        'aktif' => 'Aktif',
        'active' => 'Aktif',
        'nonaktif' => 'Nonaktif',
        'inactive' => 'Nonaktif',
        'mutasi' => 'Mutasi',
        'meninggal' => 'Meninggal',
        'deceased' => 'Meninggal',
    ];

    protected $fillable = [
        'code',
        'name',
        'sort_order',
        'is_active_member',
        'is_billable',
        'is_deceased',
        'is_active',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active_member' => 'boolean',
        'is_billable' => 'boolean',
        'is_deceased' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeActiveMember(Builder $query): Builder
    {
        return $query->where('is_active_member', true);
    }

    public function scopeBillable(Builder $query): Builder
    {
        return $query->where('is_billable', true);
    }

    /**
     * @return list<string>
     */
    public static function acceptedCodes(): array
    {
        return array_values(array_unique([
            ...static::query()->pluck('code')->all(),
            ...array_keys(self::LEGACY_STATUS_LABELS),
        ]));
    }
}
