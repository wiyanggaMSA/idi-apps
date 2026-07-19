<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

class CloneOrganizationStructureRequest extends FormRequest
{
    public function authorize(): bool
    {
        $period = $this->route('organizationPeriod');

        return $period && ($this->user()?->can('update', $period) ?? false);
    }

    public function rules(): array
    {
        return [
            'source_period_id' => [
                'required',
                'integer',
                'exists:organization_periods,id',
            ],
        ];
    }
}
