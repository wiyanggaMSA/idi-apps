<?php

namespace Database\Factories;

use App\Models\CashMethod;
use Illuminate\Database\Eloquent\Factories\Factory;

class CashMethodFactory extends Factory
{
    protected $model = CashMethod::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->word(),
            'is_active' => true,
        ];
    }
}
