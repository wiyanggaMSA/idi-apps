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
    logger()->info('OrganizationProfileController@update HIT');

    $data = $request->validated();
    $settings = AppSetting::query()->first();

    if ($request->hasFile('logo') && $request->file('logo')->isValid()) {
        logger()->info('UPLOAD DEBUG', [
    'content_type' => request()->header('content-type'),
    'has_logo_key' => $request->has('logo'),
    'all_files_keys' => array_keys($request->allFiles()),
    'hasFile_logo' => $request->hasFile('logo'),
    'logo_is_valid' => $request->hasFile('logo') ? $request->file('logo')->isValid() : null,
    'logo_class' => $request->hasFile('logo') ? get_class($request->file('logo')) : null,
]);


        if ($settings?->logo_path) {
            Storage::disk('public')->delete($settings->logo_path);
        }

        $data['logo_path'] = $request->file('logo')->store('org-logos', 'public');
    } else {
        logger()->info('No logo uploaded or invalid file');
    }

    $settings ? $settings->update($data) : AppSetting::query()->create($data);

    return redirect()->route('settings.index');
}

}
