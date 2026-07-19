<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

class EndOrganizationAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $assignment = $this->route('organizationAssignment');

        return $assignment && ($this->user()?->can('end', $assignment) ?? false);
    }

    public function rules(): array
    {
        return [
            'ended_at' => ['required', 'date'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
