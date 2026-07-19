<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

class ReplaceOrganizationAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $assignment = $this->route('organizationAssignment');

        return $assignment && ($this->user()?->can('replace', $assignment) ?? false);
    }

    public function rules(): array
    {
        return [
            'member_id' => ['required', 'integer', 'exists:members,id'],
            'portal_role_id' => ['nullable', 'integer', 'exists:roles,id'],
            'started_at' => ['required', 'date'],
            'appointment_number' => ['nullable', 'string', 'max:255'],
            'appointment_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'reason' => ['required', 'string', 'max:2000'],
        ];
    }
}
