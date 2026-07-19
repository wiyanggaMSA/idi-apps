<?php

namespace Database\Factories;

use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Models\OrganizationUnitPosition;
use App\Models\Position;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrganizationUnitPositionFactory extends Factory
{
    protected $model = OrganizationUnitPosition::class;

    public function definition(): array
    {
        return [
            'period_id' => OrganizationPeriod::factory(),
            'organization_unit_id' => fn (array $attributes) => OrganizationUnit::factory()->create([
                'period_id' => $attributes['period_id'],
            ])->id,
            'position_id' => Position::factory(),
            'custom_title' => null,
            'display_order' => 0,
            'is_required' => false,
            'is_active' => true,
        ];
    }

    public function required(): static
    {
        return $this->state(fn () => ['is_required' => true]);
    }
}
