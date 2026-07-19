<?php

namespace App\Http\Requests\WorkPrograms;

use App\Models\WorkProgramRisk;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkProgramRiskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'work_program_task_id' => ['nullable', 'integer', 'exists:work_program_tasks,id'],
            'type' => ['required', Rule::in([WorkProgramRisk::TYPE_RISK, WorkProgramRisk::TYPE_ISSUE])],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category' => ['nullable', 'string', 'max:255'],
            'likelihood' => ['required', 'integer', 'min:1', 'max:5'],
            'impact' => ['required', 'integer', 'min:1', 'max:5'],
            'status' => ['required', Rule::in(['open', 'mitigating', 'resolved', 'closed'])],
            'mitigation_plan' => ['nullable', 'string'],
            'follow_up' => ['nullable', 'string'],
            'evidence_note' => ['nullable', 'string'],
            'owner_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'due_date' => ['nullable', 'date'],
        ];
    }
}
