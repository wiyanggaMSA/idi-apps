<?php

namespace App\Http\Requests\Organization;

use App\Models\OrganizationPeriod;
use Illuminate\Foundation\Http\FormRequest;

class StoreOrganizationPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', OrganizationPeriod::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'source_period_id' => ['nullable', 'integer', 'exists:organization_periods,id'],
        ];
    }
}
