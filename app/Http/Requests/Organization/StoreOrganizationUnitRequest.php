<?php

namespace App\Http\Requests\Organization;

use App\Models\OrganizationUnit;
use Illuminate\Foundation\Http\FormRequest;

class StoreOrganizationUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', OrganizationUnit::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'parent_id' => ['nullable', 'integer', 'exists:organization_units,id'],
            'master_unit_id' => ['nullable', 'integer', 'exists:divisions,id'],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:255'],
            'unit_type' => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:5000'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_core_structure' => ['nullable', 'boolean'],
        ];
    }
}
