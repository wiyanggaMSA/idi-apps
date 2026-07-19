<?php

namespace App\Http\Requests\WorkPrograms;

use App\Models\WorkProgramTaskDependency;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkProgramTaskDependencyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'predecessor_task_id' => ['required', 'integer', 'exists:work_program_tasks,id'],
            'successor_task_id' => ['required', 'integer', 'exists:work_program_tasks,id', 'different:predecessor_task_id'],
            'type' => ['required', Rule::in(WorkProgramTaskDependency::TYPES)],
            'lag_days' => ['nullable', 'integer', 'min:-365', 'max:365'],
        ];
    }
}
