<?php

namespace App\Http\Controllers\Settings\MasterData;

use App\Http\Controllers\Controller;
use App\Models\CashMethod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CashMethodsController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        CashMethod::create([
            'name' => $data['name'],
            'is_active' => $data['is_active'] ?? true,
        ]);

        return back()->with('success', 'Metode bayar berhasil ditambahkan.');
    }

    public function destroy(CashMethod $cashMethod): RedirectResponse
    {
        $cashMethod->delete();

        return back()->with('success', 'Metode bayar berhasil dihapus.');
    }

    public function update(Request $request, CashMethod $cashMethod): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $cashMethod->update([
            'name' => $data['name'],
            'is_active' => $data['is_active'] ?? false,
        ]);

        return back()->with('success', 'Metode bayar berhasil diperbarui.');
    }
}
