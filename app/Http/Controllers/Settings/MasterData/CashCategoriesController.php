<?php

namespace App\Http\Controllers\Settings\MasterData;

use App\Http\Controllers\Controller;
use App\Models\CashCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CashCategoriesController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', 'string', Rule::in(['in', 'out'])],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        CashCategory::create([
            'type' => $data['type'],
            'name' => $data['name'],
            'code' => $data['code'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return back()->with('success', 'Kategori cashflow berhasil ditambahkan.');
    }

    public function destroy(CashCategory $cashCategory): RedirectResponse
    {
        $cashCategory->delete();

        return back()->with('success', 'Kategori cashflow berhasil dihapus.');
    }

    public function update(Request $request, CashCategory $cashCategory): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', 'string', Rule::in(['in', 'out'])],
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('cash_categories', 'code')->ignore($cashCategory->id)->whereNull('deleted_at'),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $cashCategory->update([
            'type' => $data['type'],
            'name' => $data['name'],
            'code' => $data['code'] ?? null,
            'is_active' => $data['is_active'] ?? false,
        ]);

        return back()->with('success', 'Kategori cashflow berhasil diperbarui.');
    }
}
