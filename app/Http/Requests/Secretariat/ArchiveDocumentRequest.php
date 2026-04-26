<?php

namespace App\Http\Requests\Secretariat;

use Illuminate\Foundation\Http\FormRequest;

class ArchiveDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:120'],
            'document_number' => ['nullable', 'string', 'max:120'],
            'document_date' => ['nullable', 'date'],
            'description' => ['nullable', 'string'],
            'attachments' => ['required', 'array', 'max:8'],
            'attachments.*' => ['file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx'],
        ];
    }
}
