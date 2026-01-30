<?php

namespace App\Http\Requests\Dues;

use Illuminate\Foundation\Http\FormRequest;

class StoreDuesPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('dues.collect') ?? false;
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'integer', 'min:1'],
            'paid_at' => ['required', 'date'],
            'cash_method_id' => ['nullable', 'exists:cash_methods,id'],
            'payment_status_id' => ['nullable', 'exists:payment_statuses,id'],
            'note' => ['nullable', 'string'],
            'reference_no' => ['nullable', 'string', 'max:100'],
            'apply_to_year' => ['nullable', 'boolean'],
            'apply_year' => ['nullable', 'integer', 'min:2000', 'max:2100', 'required_if:apply_to_year,1'],
        ];
    }
}
