<?php

namespace Database\Factories;

use App\Models\DuesPayment;
use App\Models\Member;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DuesPaymentFactory extends Factory
{
    protected $model = DuesPayment::class;

    public function definition(): array
    {
        return [
            'member_id' => Member::factory(),
            'paid_at' => now(),
            'amount' => 1000,
            'method' => 'cash',
            'reference_no' => $this->faker->bothify('DUES-REF-####'),
            'notes' => $this->faker->sentence(),
            'created_by' => User::factory(),
        ];
    }
}
