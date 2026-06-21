<?php

namespace App\Http\Controllers\Secretariat;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Letter;
use App\Models\LetterSignature;
use App\Models\Member;
use App\Services\Secretariat\LetterSignatureStatusService;
use App\Services\Secretariat\QrCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;
use Inertia\Response;

class LetterSignatureController extends Controller
{
    public function index(Request $request, LetterSignatureStatusService $signatureStatusService): Response
    {
        $member = $request->user()->member;
        $member?->loadMissing('position:id,name');

        $signatures = $member
            ? LetterSignature::query()
                ->with(['letter:id,number,date,subject,status,public_hash,pdf_path,is_revoked,finalized_at,signer_name,signer_title,signers_json'])
                ->where('signer_member_id', $member->id)
                ->whereHas('letter', fn ($query) => $query
                    ->whereIn('status', ['finalized', 'archived'])
                    ->where('is_revoked', false))
                ->latest('updated_at')
                ->get()
            : collect();

        return Inertia::render('Secretariat/Signatures/Index', [
            'linkedMember' => $member ? [
                'id' => $member->id,
                'full_name' => $member->full_name,
                'position_name' => $member->position?->name,
            ] : null,
            'signatures' => $signatures
                ->map(function (LetterSignature $signature) use ($signatureStatusService) {
                    $letter = $signature->letter;
                    $summary = $letter ? $signatureStatusService->summary($letter) : null;

                    return [
                        'id' => $signature->id,
                        'signer_name' => $signature->signer_name_snapshot,
                        'signer_role' => $signature->signer_role_snapshot,
                        'signed_at' => optional($signature->signed_at)->toDateTimeString(),
                        'created_at' => optional($signature->created_at)->toDateTimeString(),
                        'letter' => $letter ? [
                            'id' => $letter->id,
                            'number' => $letter->number,
                            'date' => optional($letter->date)->toDateString(),
                            'subject' => $letter->subject,
                            'status' => $letter->status,
                            'finalized_at' => optional($letter->finalized_at)->toDateTimeString(),
                            'show_url' => route('secretariat.letters.show', $letter),
                            'pdf_url' => $letter->pdf_path ? route('secretariat.letters.pdf.preview', $letter) : null,
                            'verify_url' => $letter->public_hash ? route('letters.verify', $letter->public_hash) : null,
                            'signature_summary' => $summary,
                        ] : null,
                        'sign_url' => route('secretariat.signatures.sign', $signature),
                    ];
                })
                ->values(),
        ]);
    }

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

    public function sign(
        Request $request,
        LetterSignature $signature,
        LetterSignatureStatusService $signatureStatusService
    ): RedirectResponse {
        $member = $request->user()->member;
        abort_unless($member && (int) $signature->signer_member_id === (int) $member->id, 403);

        $signature->load('letter');
        abort_unless($signature->letter && in_array($signature->letter->status, ['finalized', 'archived'], true), 422, 'Surat belum difinalisasi.');
        abort_if($signature->letter->is_revoked, 422, 'Surat sudah dicabut.');
        abort_if($signature->revoked_at, 422, 'Permintaan tanda tangan sudah dicabut.');

        if (! $signature->signed_at) {
            $signature->forceFill(['signed_at' => now()])->save();
        }

        $signatureStatusService->refreshLetterPayload($signature->letter->refresh());

        return redirect()
            ->route('secretariat.signatures.index')
            ->with('success', 'Surat berhasil ditandatangani.');
    }
}
