<?php

namespace App\Http\Requests\WorkPrograms;

use Illuminate\Foundation\Http\FormRequest;

class WorkProgramRequiredNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'note' => ['required', 'string', 'min:3', 'max:1000'],
        ];
    }
}
