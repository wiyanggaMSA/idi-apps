<?php

namespace App\Http\Middleware;

use App\Models\AppSetting;
use App\Support\RoleName;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $orgProfile = null;
        $fallbackLogoUrl = file_exists(public_path('images/idi-logo.png'))
            ? asset('images/idi-logo.png')
            : null;

        if (Schema::hasTable('app_settings')) {
            $orgProfile = AppSetting::query()->first();
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
                'roles' => $request->user()
                    ? $request->user()->getRoleNames()->map(fn (string $role) => RoleName::normalize($role))
                    : [],
                'role_labels' => $request->user()
                    ? $request->user()->getRoleNames()->map(fn (string $role) => RoleName::display($role))
                    : [],
                'permissions' => $request->user()?->getAllPermissions()->pluck('name') ?? [],
            ],
            'orgProfile' => [
                'org_name' => $orgProfile?->org_name ?? 'IDI Apps',
                'brand_color' => $orgProfile?->brand_color ?? '#1677ff',
                'logo_url' => $orgProfile?->logo_path
                    ? Storage::url($orgProfile->logo_path)
                    : $fallbackLogoUrl,
                'address' => $orgProfile?->address ?? null,
                'phone' => $orgProfile?->phone ?? null,
                'email' => $orgProfile?->email ?? null,
                'website' => config('app.url'),
            ],
        ];
    }
}
