<?php

namespace App\Http\Requests\WorkPrograms;

use App\Models\WorkProgram;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreWorkProgramRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', WorkProgram::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'program_code' => ['nullable', 'string', 'max:255', Rule::unique('work_programs', 'program_code')],
            'name' => ['required', 'string', 'max:255'],
            'work_program_period_id' => ['required', 'integer', 'exists:work_program_periods,id'],
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'division_id' => ['required', 'integer', 'exists:divisions,id'],
            'category' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:255'],
            'nature' => ['required', Rule::in([
                WorkProgram::NATURE_ROUTINE,
                WorkProgram::NATURE_INCIDENTAL,
                WorkProgram::NATURE_STRATEGIC,
                WorkProgram::NATURE_COLLABORATIVE,
            ])],
            'source' => ['required', Rule::in([
                WorkProgram::SOURCE_FIELD_PROPOSAL,
                WorkProgram::SOURCE_ORGANIZATIONAL_MANDATE,
                WorkProgram::SOURCE_WORK_MEETING_RESULT,
                WorkProgram::SOURCE_EVALUATION_FOLLOW_UP,
            ])],
            'priority' => ['required', Rule::in([
                WorkProgram::PRIORITY_LOW,
                WorkProgram::PRIORITY_MEDIUM,
                WorkProgram::PRIORITY_HIGH,
                WorkProgram::PRIORITY_CRITICAL,
            ])],
            'description' => ['nullable', 'string'],
            'background' => ['nullable', 'string'],
            'objectives' => ['nullable', 'string'],
            'target_audience' => ['nullable', 'string'],
            'success_indicators' => ['nullable', 'string'],
            'expected_output' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'planned_start_date' => ['nullable', 'date'],
            'planned_end_date' => ['nullable', 'date', 'after_or_equal:planned_start_date'],
            'actual_start_date' => ['nullable', 'date'],
            'actual_end_date' => ['nullable', 'date', 'after_or_equal:actual_start_date'],
            'estimated_budget' => ['nullable', 'numeric', 'min:0'],
            'realized_budget' => ['nullable', 'numeric', 'min:0'],
            'budget_source' => ['nullable', 'string', 'max:255'],
            'primary_pic_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'internal_notes' => ['nullable', 'string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($this->user()?->can('work_program.view')) {
                return;
            }

            $divisionId = $this->user()?->member?->division_id;

            if (! $divisionId || (int) $this->input('division_id') !== (int) $divisionId) {
                $validator->errors()->add('division_id', 'Program kerja hanya dapat dibuat untuk bidang pengguna.');
            }
        });
    }
}
