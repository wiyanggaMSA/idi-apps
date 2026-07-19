<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

class MoveOrganizationUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        $unit = $this->route('organizationUnit');

        return $unit && ($this->user()?->can('update', $unit) ?? false);
    }

    public function rules(): array
    {
        return [
            'parent_id' => ['nullable', 'integer', 'exists:organization_units,id'],
            'display_order' => ['required', 'integer', 'min:0'],
        ];
    }
}
