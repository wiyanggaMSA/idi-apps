<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

class ActivateOrganizationPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        $period = $this->route('organizationPeriod');

        return $period && ($this->user()?->can('activate', $period) ?? false);
    }

    public function rules(): array
    {
        return [];
    }
}
