<?php

namespace App\Http\Controllers\Settings\MasterData;

use App\Http\Controllers\Controller;
use App\Models\PaymentStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PaymentStatusesController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:payment_statuses,code'],
            'name' => ['required', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        PaymentStatus::create([
            'code' => $data['code'],
            'name' => $data['name'],
            'color' => $data['color'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return back()->with('success', 'Status bayar berhasil ditambahkan.');
    }

    public function destroy(PaymentStatus $paymentStatus): RedirectResponse
    {
        $paymentStatus->delete();

        return back()->with('success', 'Status bayar berhasil dihapus.');
    }
}
