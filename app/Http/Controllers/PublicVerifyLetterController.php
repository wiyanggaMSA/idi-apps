<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\Letter;
use App\Services\Secretariat\LetterSignatureStatusService;
use App\Support\Secretariat\LetterSignerNormalizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PublicVerifyLetterController extends Controller
{
    public function show(Request $request, string $public_hash, LetterSignatureStatusService $signatureStatusService): Response
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

        $letter = Letter::query()->with('signatures')->where('public_hash', $public_hash)->firstOrFail();
        $signatureSummary = $signatureStatusService->summary($letter);
        $status = match (true) {
            (bool) $letter->is_revoked => 'REVOKED',
            $signatureSummary['status'] === 'PENDING_SIGNATURES' => 'PENDING_SIGNATURES',
            default => 'VALID',
        };
        $version = $request->integer('v');
        $signerIndex = max(1, $request->integer('signer', 1));
        $signers = LetterSignerNormalizer::normalize(
            $letter->signers_json,
            $letter->signer_name,
            $letter->signer_title
        );
        $selectedSigner = $signers[$signerIndex - 1] ?? LetterSignerNormalizer::first($signers);

        $payload = [
            'status' => $status,
            'signature_verification' => $signatureSummary,
            'signer_name' => $selectedSigner['name'] ?? $letter->signer_name,
            'signer_title' => $selectedSigner['title'] ?? $letter->signer_title,
            'signer_index' => $signerIndex,
            'signers_count' => count($signers),
            'number' => $letter->number,
            'date' => optional($letter->date)->toDateString(),
            'subject' => $letter->subject,
            'pdf_url' => $letter->pdf_path ? Storage::disk('public')->url($letter->pdf_path) : null,
            'version' => $version ?: ($letter->versions()->max('version') ?? 1),
            'organization' => [
                'name' => $org?->org_name ?? config('app.name'),
                'unit' => $org?->org_unit,
                'logo_url' => $logoUrl,
            ],
        ];

        if ($version) {
            $versionData = $letter->versions()->where('version', $version)->first();
            if ($versionData) {
                $versionSigners = LetterSignerNormalizer::normalize(
                    $versionData->signers_json,
                    $versionData->signer_name,
                    $versionData->signer_title
                );
                $versionSelectedSigner = $versionSigners[$signerIndex - 1] ?? LetterSignerNormalizer::first($versionSigners);

                $payload['number'] = $versionData->number;
                $payload['date'] = optional($versionData->date)->toDateString();
                $payload['subject'] = $versionData->subject;
                $payload['signer_name'] = $versionSelectedSigner['name'] ?? $versionData->signer_name;
                $payload['signer_title'] = $versionSelectedSigner['title'] ?? $versionData->signer_title;
                $payload['signers_count'] = count($versionSigners);
                $payload['pdf_url'] = $versionData->pdf_path ? Storage::disk('public')->url($versionData->pdf_path) : null;
                $payload['version'] = $versionData->version;
            }
        }

        return Inertia::render('Public/VerifyLetter', [
            'payload' => $payload,
        ]);
    }

    public function download(Request $request, string $public_hash)
    {
        $letter = Letter::query()->where('public_hash', $public_hash)->firstOrFail();
        $version = $request->integer('v');
        $path = $letter->pdf_path;

        if ($version) {
            $path = $letter->versions()->where('version', $version)->value('pdf_path');
        }

        if (! $path) {
            abort(404);
        }

        return Storage::disk('public')->download($path);
    }
}
