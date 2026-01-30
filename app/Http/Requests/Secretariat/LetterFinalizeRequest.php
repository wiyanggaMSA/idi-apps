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
            'numbering_profile_id' => ['nullable', 'integer', 'exists:letter_numbering_profiles,id', 'required_without:number'],
            'number' => ['nullable', 'string', 'max:120', 'required_without:numbering_profile_id'],
            'classification' => ['nullable', 'string', 'max:120'],
            'date' => ['required', 'date'],
            'subject' => ['required', 'string', 'max:255'],
            'recipient_text' => ['required', 'string'],
            'signer_name' => ['required', 'string', 'max:255'],
            'signer_title' => ['required', 'string', 'max:255'],
            'content_blocks_json' => ['nullable', 'array'],
        ];
    }
}
