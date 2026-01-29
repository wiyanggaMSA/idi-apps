<?php

namespace App\Http\Controllers\Settings\MasterData;

use App\Http\Controllers\Controller;
use App\Models\Division;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class DivisionsController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        Division::create([
            'name' => $data['name'],
            'code' => $data['code'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return back()->with('success', 'Divisi berhasil ditambahkan.');
    }

    public function destroy(Division $division): RedirectResponse
    {
        $division->delete();

        return back()->with('success', 'Divisi berhasil dihapus.');
    }
}
