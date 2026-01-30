<?php

namespace App\Http\Requests\Secretariat;

use Illuminate\Foundation\Http\FormRequest;

class LetterDraftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'template_id' => ['nullable', 'integer', 'exists:letter_templates,id'],
            'classification' => ['nullable', 'string', 'max:120'],
            'number' => ['nullable', 'string', 'max:120'],
            'date' => ['nullable', 'date'],
            'subject' => ['nullable', 'string', 'max:255'],
            'recipient_text' => ['nullable', 'string'],
            'attachments_meta_json' => ['nullable', 'array'],
            'cc_text' => ['nullable', 'string'],
            'signer_name' => ['nullable', 'string', 'max:255'],
            'signer_title' => ['nullable', 'string', 'max:255'],
            'stamp_enabled' => ['nullable', 'boolean'],
            'stamp_image_path' => ['nullable', 'string', 'max:255'],
            'content_blocks_json' => ['nullable', 'array'],
        ];
    }
}
