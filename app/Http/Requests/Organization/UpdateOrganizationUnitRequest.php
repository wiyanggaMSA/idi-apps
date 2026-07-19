<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrganizationUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        $unit = $this->route('organizationUnit');

        return $unit && ($this->user()?->can('update', $unit) ?? false);
    }

    public function rules(): array
    {
        return [
            'parent_id' => ['sometimes', 'nullable', 'integer', 'exists:organization_units,id'],
            'master_unit_id' => ['sometimes', 'nullable', 'integer', 'exists:divisions,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['sometimes', 'nullable', 'string', 'max:255'],
            'unit_type' => ['sometimes', 'required', 'string', 'max:50'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'display_order' => ['sometimes', 'integer', 'min:0'],
            'is_core_structure' => ['sometimes', 'boolean'],
        ];
    }
}
