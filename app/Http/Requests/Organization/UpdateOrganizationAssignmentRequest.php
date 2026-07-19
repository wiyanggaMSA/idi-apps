<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrganizationAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $assignment = $this->route('organizationAssignment');

        return $assignment && ($this->user()?->can('update', $assignment) ?? false);
    }

    public function rules(): array
    {
        return [
            'started_at' => ['sometimes', 'required', 'date'],
            'appointment_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'appointment_date' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ];
    }
}
