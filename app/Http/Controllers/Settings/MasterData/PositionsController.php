<?php

namespace App\Http\Controllers\Settings\MasterData;

use App\Http\Controllers\Controller;
use App\Models\Position;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PositionsController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        Position::create([
            'name' => $data['name'],
            'code' => $data['code'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return back()->with('success', 'Jabatan berhasil ditambahkan.');
    }

    public function destroy(Position $position): RedirectResponse
    {
        $position->delete();

        return back()->with('success', 'Jabatan berhasil dihapus.');
    }
}
