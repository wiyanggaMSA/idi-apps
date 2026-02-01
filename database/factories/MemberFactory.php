<?php

namespace Database\Factories;

use App\Models\Member;
use Illuminate\Database\Eloquent\Factories\Factory;

class MemberFactory extends Factory
{
    protected $model = Member::class;

    public function definition(): array
    {
        return [
            'npa' => $this->faker->unique()->numerify('NPA-####'),
            'full_name' => $this->faker->name(),
            'status' => 'aktif',
            'sip_1' => null,
            'sip_2' => null,
            'sip_3' => null,
        ];
    }
}
