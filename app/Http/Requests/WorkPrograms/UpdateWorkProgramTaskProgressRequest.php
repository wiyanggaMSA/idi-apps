<?php

namespace App\Http\Requests\WorkPrograms;

use App\Models\WorkProgramTask;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWorkProgramTaskProgressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'progress' => ['required', 'integer', 'min:0', 'max:100'],
            'status' => ['nullable', Rule::in([
                WorkProgramTask::STATUS_TODO,
                WorkProgramTask::STATUS_IN_PROGRESS,
                WorkProgramTask::STATUS_BLOCKED,
                WorkProgramTask::STATUS_COMPLETED,
            ])],
            'actual_start_date' => ['nullable', 'date'],
            'actual_end_date' => ['nullable', 'date', 'after_or_equal:actual_start_date'],
            'notes' => ['nullable', 'string'],
            'lock_version' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
