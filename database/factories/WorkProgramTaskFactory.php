<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramTask;
use Illuminate\Database\Eloquent\Factories\Factory;

class WorkProgramTaskFactory extends Factory
{
    protected $model = WorkProgramTask::class;

    public function definition(): array
    {
        $start = fake()->dateTimeBetween('now', '+2 months');
        $end = (clone $start)->modify('+7 days');

        return [
            'work_program_id' => WorkProgram::factory(),
            'task_code' => fake()->unique()->bothify('TASK-####'),
            'sort_order' => 1,
            'name' => fake()->sentence(3),
            'planned_start_date' => $start->format('Y-m-d'),
            'planned_end_date' => $end->format('Y-m-d'),
            'progress' => 0,
            'weight' => 0,
            'status' => WorkProgramTask::STATUS_TODO,
            'priority' => WorkProgram::PRIORITY_MEDIUM,
            'pic_user_id' => User::factory(),
            'estimated_cost' => 0,
            'realized_cost' => 0,
        ];
    }
}
