<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\LetterSignature;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PublicLetterSignatureController extends Controller
{
    public function show(Request $request, LetterSignature $signature): Response
    {
        $org = AppSetting::query()->first();
        $logoUrl = null;
        if ($org?->logo_path) {
            $logoPath = ltrim((string) $org->logo_path, '/');
            if (str_starts_with($logoPath, 'storage/')) {
                $logoPath = substr($logoPath, 8);
            }
            if ($logoPath !== '' && Storage::disk('public')->exists($logoPath)) {
                $logoUrl = Storage::disk('public')->url($logoPath);
            }
        }

        $code = $request->string('k')->toString();
        $isCodeValid = $code !== '' && hash_equals($signature->verification_code, $code);

        $status = 'INVALID';
        if ($isCodeValid) {
            $status = $signature->revoked_at ? 'REVOKED' : 'VALID';
        }

        $letter = $signature->letter;

        return Inertia::render('Public/VerifySignature', [
            'payload' => [
                'status' => $status,
                'signer_name' => $signature->signer_name_snapshot,
                'signer_role' => $signature->signer_role_snapshot,
                'number' => $letter?->number,
                'date' => optional($letter?->date)->toDateString(),
                'subject' => $letter?->subject,
                'signed_at' => optional($signature->signed_at)->toDateTimeString(),
                'organization' => [
                    'name' => $org?->org_name ?? config('app.name'),
                    'unit' => $org?->org_unit,
                    'logo_url' => $logoUrl,
                ],
            ],
        ]);
    }
}
