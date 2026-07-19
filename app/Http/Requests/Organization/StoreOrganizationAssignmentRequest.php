<?php

namespace App\Http\Requests\Organization;

use App\Models\OrganizationAssignment;
use Illuminate\Foundation\Http\FormRequest;

class StoreOrganizationAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', OrganizationAssignment::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'period_id' => ['required', 'integer', 'exists:organization_periods,id'],
            'organization_unit_id' => ['required', 'integer', 'exists:organization_units,id'],
            'unit_position_id' => ['required', 'integer', 'exists:organization_unit_positions,id'],
            'member_id' => ['required', 'integer', 'exists:members,id'],
            'portal_role_id' => ['required', 'integer', 'exists:roles,id'],
            'started_at' => ['required', 'date'],
            'appointment_number' => ['nullable', 'string', 'max:255'],
            'appointment_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
