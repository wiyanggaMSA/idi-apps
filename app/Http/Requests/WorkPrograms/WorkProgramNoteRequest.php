<?php

namespace App\Http\Requests\WorkPrograms;

use Illuminate\Foundation\Http\FormRequest;

class WorkProgramNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
