<?php

namespace Database\Factories;

use App\Models\Position;
use Illuminate\Database\Eloquent\Factories\Factory;

class PositionFactory extends Factory
{
    protected $model = Position::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->jobTitle(),
            'code' => $this->faker->unique()->bothify('POS-###'),
            'description' => null,
            'level' => 0,
            'display_order' => 0,
            'is_leadership' => false,
            'is_active' => true,
        ];
    }
}
