<?php

namespace App\Http\Requests\WorkPrograms;

use App\Models\WorkProgramTask;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateWorkProgramTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'parent_task_id' => ['sometimes', 'nullable', 'integer', 'exists:work_program_tasks,id'],
            'task_code' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'planned_start_date' => ['sometimes', 'nullable', 'date'],
            'planned_end_date' => ['sometimes', 'nullable', 'date'],
            'actual_start_date' => ['sometimes', 'nullable', 'date'],
            'actual_end_date' => ['sometimes', 'nullable', 'date'],
            'duration_days' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'progress' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'weight' => ['sometimes', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::in(WorkProgramTask::STATUSES)],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high', 'critical'])],
            'is_milestone' => ['sometimes', 'boolean'],
            'pic_user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'assignee_user_ids' => ['sometimes', 'array'],
            'assignee_user_ids.*' => ['integer', 'exists:users,id', 'distinct'],
            'estimated_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'realized_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'lock_version' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $task = $this->route('task');

            if (! $task instanceof WorkProgramTask) {
                return;
            }

            $plannedStart = $this->input('planned_start_date', optional($task->planned_start_date)->format('Y-m-d'));
            $plannedEnd = $this->input('planned_end_date', optional($task->planned_end_date)->format('Y-m-d'));
            $actualStart = $this->input('actual_start_date', optional($task->actual_start_date)->format('Y-m-d'));
            $actualEnd = $this->input('actual_end_date', optional($task->actual_end_date)->format('Y-m-d'));

            if ($plannedStart && $plannedEnd && $plannedEnd < $plannedStart) {
                $validator->errors()->add('planned_end_date', 'Tanggal selesai rencana task tidak boleh sebelum tanggal mulai.');
            }

            if ($actualStart && $actualEnd && $actualEnd < $actualStart) {
                $validator->errors()->add('actual_end_date', 'Tanggal selesai aktual task tidak boleh sebelum tanggal mulai.');
            }
        });
    }
}
