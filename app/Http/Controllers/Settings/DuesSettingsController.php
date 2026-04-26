<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\DuesSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class DuesSettingsController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'dues_amount' => ['required', 'integer', 'min:0'],
            'dues_start_period' => ['nullable', 'date_format:Y-m'],
            'due_day' => ['required', 'integer', 'min:1', 'max:28'],
            'grace_days' => ['required', 'integer', 'min:0', 'max:60'],
            'auto_mark_arrears' => ['required', 'boolean'],
            'allow_partial' => ['required', 'boolean'],
        ]);

        $settings = DuesSetting::query()->first();

        if ($settings) {
            $settings->update($data);
        } else {
            DuesSetting::create($data);
        }

        return back()->with('success', 'Pengaturan iuran berhasil disimpan.');
    }
}
