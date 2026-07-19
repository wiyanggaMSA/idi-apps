<?php

namespace App\Http\Requests\Organization;

use App\Models\OrganizationUnitPosition;
use Illuminate\Foundation\Http\FormRequest;

class StoreOrganizationUnitPositionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', OrganizationUnitPosition::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'position_id' => ['required', 'integer', 'exists:positions,id'],
            'custom_title' => ['nullable', 'string', 'max:255'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'is_required' => ['nullable', 'boolean'],
        ];
    }
}
