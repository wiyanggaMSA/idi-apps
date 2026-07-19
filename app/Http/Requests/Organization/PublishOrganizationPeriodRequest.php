<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

class PublishOrganizationPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        $period = $this->route('organizationPeriod');

        return $period && ($this->user()?->can('publish', $period) ?? false);
    }

    public function rules(): array
    {
        return [];
    }
}
