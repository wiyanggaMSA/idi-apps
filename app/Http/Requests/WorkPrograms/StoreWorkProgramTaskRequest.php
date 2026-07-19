<?php

namespace App\Http\Requests\WorkPrograms;

use App\Models\WorkProgramTask;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkProgramTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'parent_task_id' => ['nullable', 'integer', 'exists:work_program_tasks,id'],
            'task_code' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'planned_start_date' => ['nullable', 'date'],
            'planned_end_date' => ['nullable', 'date', 'after_or_equal:planned_start_date'],
            'actual_start_date' => ['nullable', 'date'],
            'actual_end_date' => ['nullable', 'date', 'after_or_equal:actual_start_date'],
            'duration_days' => ['nullable', 'integer', 'min:0'],
            'progress' => ['nullable', 'integer', 'min:0', 'max:100'],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', Rule::in(WorkProgramTask::STATUSES)],
            'priority' => ['nullable', Rule::in(['low', 'medium', 'high', 'critical'])],
            'is_milestone' => ['nullable', 'boolean'],
            'pic_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'assignee_user_ids' => ['nullable', 'array'],
            'assignee_user_ids.*' => ['integer', 'exists:users,id', 'distinct'],
            'estimated_cost' => ['nullable', 'numeric', 'min:0'],
            'realized_cost' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
