<?php

namespace App\Http\Requests\Cash;

use Illuminate\Foundation\Http\FormRequest;

class TransactionUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('transactions.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'description' => ['nullable', 'string'],
            'reference_no' => ['nullable', 'string', 'max:100'],
            'attachment' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:500'],
            'remove_attachment' => ['nullable', 'boolean'],
            'reason' => ['required', 'string', 'max:255'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->file('attachment') && ! ($this->user()?->can('transactions.attachments.upload'))) {
                $validator->errors()->add('attachment', 'Anda tidak memiliki izin upload lampiran.');
            }
        });
    }
}
