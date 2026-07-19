<?php

namespace Database\Factories;

use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrganizationUnitFactory extends Factory
{
    protected $model = OrganizationUnit::class;

    public function definition(): array
    {
        return [
            'period_id' => OrganizationPeriod::factory(),
            'parent_id' => null,
            'master_unit_id' => null,
            'name' => 'Unit '.$this->faker->unique()->words(2, true),
            'code' => $this->faker->optional()->bothify('UNIT-###'),
            'unit_type' => $this->faker->randomElement([
                'core',
                'board',
                'council',
                'bureau',
                'division',
                'committee',
                'other',
            ]),
            'description' => null,
            'display_order' => 0,
            'is_core_structure' => false,
            'is_active' => true,
            'created_by' => null,
            'updated_by' => null,
        ];
    }

    public function core(): static
    {
        return $this->state(fn () => [
            'unit_type' => 'core',
            'is_core_structure' => true,
        ]);
    }
}
