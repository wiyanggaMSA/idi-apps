<?php

namespace App\Http\Requests\WorkPrograms;

use App\Models\WorkProgram;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateWorkProgramRequest extends FormRequest
{
    public function authorize(): bool
    {
        $program = $this->route('workProgram');

        return $program instanceof WorkProgram
            && ($this->user()?->can('update', $program) ?? false);
    }

    public function rules(): array
    {
        $program = $this->route('workProgram');
        $programId = $program instanceof WorkProgram ? $program->id : null;

        return [
            'program_code' => ['sometimes', 'nullable', 'string', 'max:255', Rule::unique('work_programs', 'program_code')->ignore($programId)],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'work_program_period_id' => ['sometimes', 'required', 'integer', 'exists:work_program_periods,id'],
            'year' => ['sometimes', 'required', 'integer', 'min:2000', 'max:2100'],
            'division_id' => ['sometimes', 'required', 'integer', 'exists:divisions,id'],
            'category' => ['sometimes', 'nullable', 'string', 'max:255'],
            'type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'nature' => ['sometimes', 'required', Rule::in([
                WorkProgram::NATURE_ROUTINE,
                WorkProgram::NATURE_INCIDENTAL,
                WorkProgram::NATURE_STRATEGIC,
                WorkProgram::NATURE_COLLABORATIVE,
            ])],
            'source' => ['sometimes', 'required', Rule::in([
                WorkProgram::SOURCE_FIELD_PROPOSAL,
                WorkProgram::SOURCE_ORGANIZATIONAL_MANDATE,
                WorkProgram::SOURCE_WORK_MEETING_RESULT,
                WorkProgram::SOURCE_EVALUATION_FOLLOW_UP,
            ])],
            'priority' => ['sometimes', 'required', Rule::in([
                WorkProgram::PRIORITY_LOW,
                WorkProgram::PRIORITY_MEDIUM,
                WorkProgram::PRIORITY_HIGH,
                WorkProgram::PRIORITY_CRITICAL,
            ])],
            'description' => ['sometimes', 'nullable', 'string'],
            'background' => ['sometimes', 'nullable', 'string'],
            'objectives' => ['sometimes', 'nullable', 'string'],
            'target_audience' => ['sometimes', 'nullable', 'string'],
            'success_indicators' => ['sometimes', 'nullable', 'string'],
            'expected_output' => ['sometimes', 'nullable', 'string'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'planned_start_date' => ['sometimes', 'nullable', 'date'],
            'planned_end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:planned_start_date'],
            'actual_start_date' => ['sometimes', 'nullable', 'date'],
            'actual_end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:actual_start_date'],
            'estimated_budget' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'realized_budget' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'budget_source' => ['sometimes', 'nullable', 'string', 'max:255'],
            'primary_pic_user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'internal_notes' => ['sometimes', 'nullable', 'string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if (! $this->has('division_id') || $this->user()?->can('work_program.view')) {
                return;
            }

            $divisionId = $this->user()?->member?->division_id;

            if (! $divisionId || (int) $this->input('division_id') !== (int) $divisionId) {
                $validator->errors()->add('division_id', 'Program kerja tidak dapat dipindahkan ke bidang lain.');
            }
        });
    }
}
