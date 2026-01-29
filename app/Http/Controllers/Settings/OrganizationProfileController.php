<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\OrganizationProfileRequest;
use App\Models\AppSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;

class OrganizationProfileController extends Controller
{
    public function update(OrganizationProfileRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $settings = AppSetting::query()->first();

        if ($request->hasFile('logo')) {
            if ($settings?->logo_path) {
                Storage::disk('public')->delete($settings->logo_path);
            }

            $data['logo_path'] = $request->file('logo')->store('org-logos', 'public');
        }

        if ($settings) {
            $settings->update($data);
        } else {
            AppSetting::query()->create($data);
        }

        return redirect()->route('settings.index');
    }
}
