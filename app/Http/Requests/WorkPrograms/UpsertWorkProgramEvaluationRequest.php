<?php

namespace App\Http\Requests\WorkPrograms;

use Illuminate\Foundation\Http\FormRequest;

class UpsertWorkProgramEvaluationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'result_summary' => ['required', 'string'],
            'objective_achievement' => ['required', 'string'],
            'indicator_result' => ['required', 'string'],
            'target_vs_realization' => ['required', 'string'],
            'time_evaluation' => ['required', 'string'],
            'budget_result' => ['required', 'string'],
            'constraints' => ['nullable', 'string'],
            'supporting_factors' => ['nullable', 'string'],
            'inhibiting_factors' => ['nullable', 'string'],
            'lessons_learned' => ['required', 'string'],
            'recommendations' => ['required', 'string'],
            'follow_up' => ['required', 'string'],
            'report_document_id' => ['nullable', 'integer', 'exists:documents,id'],
            'evaluated_at' => ['required', 'date'],
            'mark_evaluated' => ['sometimes', 'boolean'],
        ];
    }
}
