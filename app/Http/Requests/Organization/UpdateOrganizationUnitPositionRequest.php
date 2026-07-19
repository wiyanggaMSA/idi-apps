<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrganizationUnitPositionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $slot = $this->route('unitPosition');

        return $slot && ($this->user()?->can('update', $slot) ?? false);
    }

    public function rules(): array
    {
        return [
            'position_id' => ['sometimes', 'required', 'integer', 'exists:positions,id'],
            'custom_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'display_order' => ['sometimes', 'integer', 'min:0'],
            'is_required' => ['sometimes', 'boolean'],
        ];
    }
}
