<?php

namespace Database\Factories;

use App\Models\Division;
use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramPeriod;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class WorkProgramFactory extends Factory
{
    protected $model = WorkProgram::class;

    public function definition(): array
    {
        $start = fake()->dateTimeBetween('now', '+2 months');
        $end = (clone $start)->modify('+14 days');

        return [
            'uuid' => (string) Str::uuid(),
            'program_code' => fake()->unique()->bothify('PROKER-####'),
            'name' => fake()->sentence(4),
            'work_program_period_id' => WorkProgramPeriod::factory(),
            'year' => (int) $start->format('Y'),
            'division_id' => Division::factory(),
            'nature' => WorkProgram::NATURE_ROUTINE,
            'source' => WorkProgram::SOURCE_FIELD_PROPOSAL,
            'status' => WorkProgram::STATUS_DRAFT,
            'priority' => WorkProgram::PRIORITY_MEDIUM,
            'planned_start_date' => $start->format('Y-m-d'),
            'planned_end_date' => $end->format('Y-m-d'),
            'estimated_budget' => 0,
            'realized_budget' => 0,
            'primary_pic_user_id' => User::factory(),
        ];
    }
}
