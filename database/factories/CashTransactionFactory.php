<?php

namespace Database\Factories;

use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\CashTransaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CashTransactionFactory extends Factory
{
    protected $model = CashTransaction::class;

    public function definition(): array
    {
        return [
            'tx_date' => now(),
            'type' => 'in',
            'category_id' => CashCategory::factory(),
            'method_id' => CashMethod::factory(),
            'amount' => 100000,
            'description' => $this->faker->sentence(),
            'reference_no' => $this->faker->bothify('REF-####'),
            'created_by' => User::factory(),
        ];
    }
}
