<?php

namespace Database\Factories;

use App\Models\WorkProgramPeriod;
use Illuminate\Database\Eloquent\Factories\Factory;

class WorkProgramPeriodFactory extends Factory
{
    protected $model = WorkProgramPeriod::class;

    public function definition(): array
    {
        $start = fake()->dateTimeBetween('-1 month', '+1 month');
        $end = (clone $start)->modify('+3 years');

        return [
            'name' => 'Periode '.$start->format('Y'),
            'code' => fake()->unique()->bothify('PER-####'),
            'start_date' => $start->format('Y-m-d'),
            'end_date' => $end->format('Y-m-d'),
            'is_active' => true,
        ];
    }
}
