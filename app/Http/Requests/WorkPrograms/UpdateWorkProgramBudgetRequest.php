<?php

namespace App\Http\Requests\WorkPrograms;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWorkProgramBudgetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'estimated_budget' => ['required', 'numeric', 'min:0'],
            'realized_budget' => ['required', 'numeric', 'min:0'],
            'budget_source' => ['nullable', 'string', 'max:255'],
            'internal_notes' => ['nullable', 'string'],
        ];
    }
}
