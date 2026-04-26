<?php

namespace App\Http\Requests\Secretariat;

use Illuminate\Foundation\Http\FormRequest;

class LetterTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $templateId = $this->route('template')?->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:120', 'unique:letter_templates,code,'.$templateId],
            'classification' => ['nullable', 'string', 'max:120'],
            'number_format' => ['required', 'string', 'max:255'],
            'number_reset_policy' => ['required', 'in:yearly,monthly,never'],
            'last_number' => ['nullable', 'integer', 'min:0'],
            'numbering_profile_id' => ['nullable', 'integer', 'exists:letter_numbering_profiles,id'],
            'content_text' => ['nullable', 'string'],
            'paper' => ['nullable', 'string', 'max:20'],
            'header_image' => ['nullable', 'file', 'max:4096', 'mimes:jpg,jpeg,png,webp'],
            'header_image_path' => ['nullable', 'string', 'max:255'],
            'header_height_px' => ['nullable', 'integer', 'min:80', 'max:260'],
            'document_mode' => ['nullable', 'in:flow,grid'],
            'margin_json' => ['nullable', 'array'],
            'blocks_json' => ['nullable', 'array'],
            'layout_json' => ['nullable', 'array'],
            'placeholders_schema_json' => ['nullable', 'array'],
            'signer_name' => ['nullable', 'string', 'max:255'],
            'signer_title' => ['nullable', 'string', 'max:255'],
            'signers' => ['nullable', 'array', 'max:3'],
            'signers.*.name' => ['nullable', 'string', 'max:255'],
            'signers.*.member_id' => ['nullable', 'integer', 'exists:members,id'],
            'signers.*.title' => ['nullable', 'string', 'max:255'],
            'signers.*.position' => ['nullable', 'in:left,center,right'],
            'signers.*.qr_enabled' => ['nullable', 'boolean'],
            'signers_json' => ['nullable', 'array', 'max:3'],
            'signature_enabled' => ['nullable', 'boolean'],
            'qr_enabled' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
