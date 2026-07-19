<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

class EndOrganizationPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        $period = $this->route('organizationPeriod');

        return $period && ($this->user()?->can('end', $period) ?? false);
    }

    public function rules(): array
    {
        return [
            'ended_at' => ['required', 'date'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
