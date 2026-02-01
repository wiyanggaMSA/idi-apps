<?php

namespace App\Http\Requests\Members;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('members.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'npa' => ['required', 'string', 'max:255', Rule::unique('members', 'npa')],
            'full_name' => ['required', 'string', 'max:255'],
            'education' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'gender' => ['nullable', 'in:M,F'],
            'birth_place' => ['nullable', 'string', 'max:255'],
            'birth_date' => ['nullable', 'date'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('members', 'email')],
            'division_id' => ['nullable', 'exists:divisions,id'],
            'position_id' => ['nullable', 'exists:positions,id'],
            'join_date' => ['nullable', 'date'],
            'status' => ['nullable', 'in:aktif,mutasi,meninggal'],
            'sip_1' => ['nullable', 'string', 'max:255'],
            'sip_2' => ['nullable', 'string', 'max:255'],
            'sip_3' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
