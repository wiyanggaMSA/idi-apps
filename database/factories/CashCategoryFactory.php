<?php

namespace Database\Factories;

use App\Models\CashCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

class CashCategoryFactory extends Factory
{
    protected $model = CashCategory::class;

    public function definition(): array
    {
        return [
            'type' => 'in',
            'name' => $this->faker->word(),
            'code' => $this->faker->unique()->slug(),
            'is_active' => true,
        ];
    }
}
