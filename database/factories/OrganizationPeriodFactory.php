<?php

namespace Database\Factories;

use App\Models\OrganizationPeriod;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrganizationPeriodFactory extends Factory
{
    protected $model = OrganizationPeriod::class;

    public function definition(): array
    {
        $start = $this->faker->dateTimeBetween('-1 year', '+1 year');
        $end = (clone $start)->modify('+3 years');

        return [
            'name' => 'Periode '.$start->format('Y').'–'.$end->format('Y'),
            'start_date' => $start->format('Y-m-d'),
            'end_date' => $end->format('Y-m-d'),
            'status' => OrganizationPeriod::STATUS_DRAFT,
            'is_active' => false,
            'published_at' => null,
            'published_by' => null,
            'activated_at' => null,
            'activated_by' => null,
            'ended_at' => null,
            'ended_by' => null,
            'notes' => null,
            'created_by' => null,
            'updated_by' => null,
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => [
            'status' => OrganizationPeriod::STATUS_ACTIVE,
            'is_active' => true,
            'published_at' => now(),
        ]);
    }

    public function ended(): static
    {
        return $this->state(fn () => [
            'status' => OrganizationPeriod::STATUS_ENDED,
            'is_active' => false,
            'published_at' => now()->subYear(),
            'ended_at' => now(),
        ]);
    }
}
