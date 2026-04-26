<?php

namespace App\Http\Requests\Secretariat;

use Illuminate\Foundation\Http\FormRequest;

class LetterFinalizeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'numbering_profile_id' => ['nullable', 'integer', 'exists:letter_numbering_profiles,id', 'required_without_all:number,template_id'],
            'template_id' => ['nullable', 'integer', 'exists:letter_templates,id'],
            'number' => ['nullable', 'string', 'max:120', 'required_without_all:numbering_profile_id,template_id'],
            'classification' => ['nullable', 'string', 'max:120'],
            'date' => ['required', 'date'],
            'subject' => ['required', 'string', 'max:255'],
            'recipient_text' => ['required', 'string'],
            'cc_text' => ['nullable', 'string'],
            'signer_name' => ['nullable', 'string', 'max:255'],
            'signer_title' => ['nullable', 'string', 'max:255'],
            'signers' => ['nullable', 'array', 'max:3'],
            'signers.*.name' => ['nullable', 'string', 'max:255'],
            'signers.*.member_id' => ['nullable', 'integer', 'exists:members,id'],
            'signers.*.title' => ['nullable', 'string', 'max:255'],
            'signers.*.position' => ['nullable', 'in:left,center,right'],
            'signers.*.qr_enabled' => ['nullable', 'boolean'],
            'content_blocks_json' => ['nullable', 'array'],
            'layout' => ['nullable', 'array'],
            'blocks' => ['nullable', 'array'],
        ];
    }
}
