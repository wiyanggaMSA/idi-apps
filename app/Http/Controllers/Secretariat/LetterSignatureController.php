<?php

namespace App\Http\Controllers\Secretariat;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Letter;
use App\Models\LetterSignature;
use App\Models\Member;
use App\Services\Secretariat\QrCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;

class LetterSignatureController extends Controller
{
    public function prepare(Request $request, Letter $letter, QrCodeService $qrCodeService): JsonResponse
    {
        $data = $request->validate([
            'signer_member_id' => ['required', 'exists:members,id'],
        ]);

        $member = Member::query()->with('position')->findOrFail($data['signer_member_id']);

        $signature = LetterSignature::query()->firstOrNew([
            'letter_id' => $letter->id,
            'signer_member_id' => $member->id,
        ]);

        $signature->signer_name_snapshot = $member->full_name;
        $signature->signer_role_snapshot = $member->position?->name;

        if (!$signature->verification_code) {
            $signature->verification_code = Str::random(32);
        }

        $signature->save();

        $orgProfile = AppSetting::query()->first();
        $logoUrl = $orgProfile?->logo_path ? Storage::url($orgProfile->logo_path) : null;
        $logoPath = $orgProfile?->logo_path ? Storage::disk('public')->path($orgProfile->logo_path) : null;
        if (!$logoPath || !file_exists($logoPath)) {
            $fallbackLogo = public_path('images/idi-logo.png');
            $logoPath = File::exists($fallbackLogo) ? $fallbackLogo : null;
        }
        $verificationUrl = route('letters.signature.verify', [
            'signature' => $signature->id,
            'k' => $signature->verification_code,
        ]);
        $qrDataUri = $qrCodeService->generateQrWithCenterLogo(
            $verificationUrl,
            $logoPath
        );

        return response()->json([
            'signature_id' => $signature->id,
            'verification_url' => $verificationUrl,
            'qr_data_uri' => $qrDataUri,
            'org_logo_url' => $logoUrl,
        ]);
    }
}
