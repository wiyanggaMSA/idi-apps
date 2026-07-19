<?php

namespace App\Http\Requests\WorkPrograms;

use Illuminate\Foundation\Http\FormRequest;

class BulkUpdateWorkProgramTaskScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'tasks' => ['required', 'array', 'min:1'],
            'tasks.*.id' => ['required', 'integer', 'exists:work_program_tasks,id'],
            'tasks.*.parent_task_id' => ['nullable', 'integer', 'exists:work_program_tasks,id'],
            'tasks.*.sort_order' => ['nullable', 'integer', 'min:0'],
            'tasks.*.planned_start_date' => ['nullable', 'date'],
            'tasks.*.planned_end_date' => ['nullable', 'date'],
            'tasks.*.lock_version' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
