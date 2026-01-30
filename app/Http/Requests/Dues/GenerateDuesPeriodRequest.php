<?php

namespace App\Http\Requests\Dues;

use Illuminate\Foundation\Http\FormRequest;

class GenerateDuesPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('dues.generate') ?? false;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'in:monthly,yearly'],
            'period' => ['nullable', 'date_format:Y-m', 'required_if:type,monthly'],
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100', 'required_if:type,yearly'],
        ];
    }
}
