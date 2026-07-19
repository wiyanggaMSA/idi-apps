<?php

namespace App\Http\Controllers\Settings\MasterData;

use App\Http\Controllers\Controller;
use App\Models\WorkProgramPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WorkProgramPeriodsController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', Rule::unique('work_program_periods', 'code')->whereNull('deleted_at')],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        WorkProgramPeriod::query()->create([
            'name' => $data['name'],
            'code' => $data['code'] ?? null,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'is_active' => $data['is_active'] ?? true,
            'notes' => $data['notes'] ?? null,
            'created_by' => $request->user()?->id,
            'updated_by' => $request->user()?->id,
        ]);

        return back()->with('success', 'Periode program kerja berhasil ditambahkan.');
    }

    public function update(Request $request, WorkProgramPeriod $workProgramPeriod): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('work_program_periods', 'code')->ignore($workProgramPeriod->id)->whereNull('deleted_at'),
            ],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        $workProgramPeriod->update([
            'name' => $data['name'],
            'code' => $data['code'] ?? null,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'is_active' => $data['is_active'] ?? false,
            'notes' => $data['notes'] ?? null,
            'updated_by' => $request->user()?->id,
        ]);

        return back()->with('success', 'Periode program kerja berhasil diperbarui.');
    }

    public function destroy(WorkProgramPeriod $workProgramPeriod): RedirectResponse
    {
        if ($workProgramPeriod->programs()->exists()) {
            return back()->with('error', 'Periode program kerja masih dipakai oleh program dan tidak bisa dihapus.');
        }

        $workProgramPeriod->delete();

        return back()->with('success', 'Periode program kerja berhasil dihapus.');
    }
}
