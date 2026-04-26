<?php

namespace App\Services\Secretariat;

use App\Models\AppSetting;
use App\Models\Letter;
use App\Models\LetterSignature;
use App\Models\LetterTemplate;
use App\Support\Secretariat\LetterSignerNormalizer;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

class LetterRenderDataService
{
    public function __construct(private readonly QrCodeService $qrCodeService) {}

    public function build(Letter $letter): array
    {
        $layout = $letter->layout_json ?? [];
        $blocks = $letter->blocks_json ?? [];

        $orgProfile = AppSetting::query()->first();
        $addressLines = $orgProfile?->address
            ? preg_split('/\\r\\n|\\r|\\n/', $orgProfile->address)
            : [];

        $normalizedLogoPath = $this->normalizeLogoPath($orgProfile?->logo_path);
        $logoDataUri = $this->logoDataUri($normalizedLogoPath);
        $organization = [
            'logo_url' => $normalizedLogoPath
                ? url(Storage::url($normalizedLogoPath))
                : (File::exists(public_path('images/idi-logo.png')) ? url('images/idi-logo.png') : null),
            'logo_data_uri' => $logoDataUri,
            'org_name' => $orgProfile?->org_name ?? config('app.name'),
            'org_unit' => $orgProfile?->org_unit ?? null,
            'address_lines' => array_values(array_filter($addressLines)),
            'contacts' => [
                'tel' => $orgProfile?->phone,
                'email' => $orgProfile?->email,
                'website' => config('app.url'),
            ],
            'header_variant' => $orgProfile?->header_variant ?? 'logo_left',
        ];

        $signatureQuery = LetterSignature::query()->where('letter_id', $letter->id);

        $signature = null;
        if (! empty($letter->signer_name) || ! empty($letter->signer_title)) {
            $signature = (clone $signatureQuery)
                ->when(! empty($letter->signer_name), fn ($q) => $q->where('signer_name_snapshot', $letter->signer_name))
                ->when(! empty($letter->signer_title), fn ($q) => $q->where('signer_role_snapshot', $letter->signer_title))
                ->latest('updated_at')
                ->first();
        }

        if (! $signature && empty($letter->signer_name) && empty($letter->signer_title)) {
            $signature = (clone $signatureQuery)->latest('updated_at')->first();
        }
        if (! $signature) {
            $signature = (clone $signatureQuery)->latest('updated_at')->first();
        }

        $signaturePayload = null;
        if ($signature) {
            $verificationUrl = route('letters.signature.verify', [
                'signature' => $signature->id,
                'k' => $signature->verification_code,
            ]);
            $logoPath = $normalizedLogoPath ? Storage::disk('public')->path($normalizedLogoPath) : null;
            $qrDataUri = $this->qrCodeService->generateQrWithCenterLogo(
                $verificationUrl,
                $logoPath && file_exists($logoPath) ? $logoPath : null
            );

            $signaturePayload = [
                'signature_id' => $signature->id,
                'verification_url' => $verificationUrl,
                'qr_data_uri' => $qrDataUri,
                'org_logo_url' => $organization['logo_url'],
                'org_logo_data_uri' => $organization['logo_data_uri'],
            ];
        } elseif ($letter->public_hash) {
            $verificationUrl = route('letters.verify', ['public_hash' => $letter->public_hash]);
            $logoPath = $normalizedLogoPath ? Storage::disk('public')->path($normalizedLogoPath) : null;
            $qrDataUri = $this->qrCodeService->generateQrWithCenterLogo(
                $verificationUrl,
                $logoPath && file_exists($logoPath) ? $logoPath : null
            );

            $signaturePayload = [
                'signature_id' => null,
                'verification_url' => $verificationUrl,
                'qr_data_uri' => $qrDataUri,
                'org_logo_url' => $organization['logo_url'],
                'org_logo_data_uri' => $organization['logo_data_uri'],
            ];
        }

        $template = null;
        $templateStyle = [];
        if ($letter->template_id) {
            $template = $letter->relationLoaded('template')
                ? $letter->template
                : LetterTemplate::query()->find($letter->template_id);
            $templateStyle = is_array($template?->margin_json) ? $template->margin_json : [];
        }

        $signers = LetterSignerNormalizer::normalize(
            $letter->signers_json,
            $signature?->signer_name_snapshot ?? $letter->signer_name,
            $signature?->signer_role_snapshot ?? $letter->signer_title,
            $templateStyle['signature_qr_position'] ?? 'right',
            (bool) ($template?->qr_enabled ?? true)
        );
        $signers = $this->appendSignerQrPayloads($signers, $letter, $organization, $normalizedLogoPath);
        $primarySigner = LetterSignerNormalizer::first($signers);
        $signaturePayload = $primarySigner['signature'] ?? $signaturePayload;

        return [
            'blocks' => $blocks,
            'layout' => $layout,
            'gridConfig' => [
                'cols' => 12,
                'rowHeight' => 24,
            ],
            'data' => [
                'organization' => $organization,
                'signature' => $signaturePayload,
                'signer' => $primarySigner,
                'signers' => $signers,
                'letter' => [
                    'number' => $letter->number ?? '',
                    'date' => optional($letter->date)->format('d/m/Y') ?? '',
                    'subject' => $letter->subject ?? '',
                    'recipient_text' => $letter->recipient_text ?? '',
                    'cc_text' => $letter->cc_text ?? '',
                ],
                'style' => [
                    'font_family' => $templateStyle['font_family'] ?? 'Times New Roman',
                    'font_size' => (float) ($templateStyle['font_size'] ?? 12),
                    'line_height' => (float) ($templateStyle['line_height'] ?? 1.35),
                    'paragraph_spacing' => (float) ($templateStyle['paragraph_spacing'] ?? 4),
                    'repeat_header' => (bool) ($templateStyle['repeat_header'] ?? true),
                    'signature_qr_position' => in_array(($templateStyle['signature_qr_position'] ?? ''), ['left', 'right'], true)
                        ? $templateStyle['signature_qr_position']
                        : 'right',
                    'header_image_url' => $template?->header_image_path ? url(Storage::url($template->header_image_path)) : null,
                    'header_image_data_uri' => $this->fileDataUri($template?->header_image_path),
                    'header_height_px' => (int) ($template?->header_height_px ?: 132),
                    'document_mode' => $template?->document_mode ?: ($templateStyle['document_mode'] ?? 'flow'),
                    'margin_left_px' => (int) ($templateStyle['margin_left_px'] ?? 64),
                    'margin_right_px' => (int) ($templateStyle['margin_right_px'] ?? 64),
                    'margin_bottom_px' => (int) ($templateStyle['margin_bottom_px'] ?? 72),
                    'content_top_gap_px' => (int) ($templateStyle['content_top_gap_px'] ?? 54),
                ],
            ],
        ];
    }

    private function logoDataUri(?string $logoPath): ?string
    {
        $dataUri = $this->fileDataUri($logoPath);
        if ($dataUri) {
            return $dataUri;
        }

        $fallbackPath = public_path('images/idi-logo.png');
        if (! is_file($fallbackPath)) {
            return null;
        }
        $bytes = @file_get_contents($fallbackPath);
        if ($bytes === false) {
            return null;
        }
        $mime = @mime_content_type($fallbackPath) ?: 'image/png';

        return 'data:'.$mime.';base64,'.base64_encode($bytes);
    }

    private function appendSignerQrPayloads(array $signers, Letter $letter, array $organization, ?string $logoPath): array
    {
        if (! $letter->public_hash) {
            return $signers;
        }

        $logoAbsolutePath = $logoPath ? Storage::disk('public')->path($logoPath) : null;
        $validLogoPath = $logoAbsolutePath && file_exists($logoAbsolutePath) ? $logoAbsolutePath : null;
        $baseVerificationUrl = route('letters.verify', ['public_hash' => $letter->public_hash]);
        $memberIds = collect($signers)->pluck('member_id')->filter()->unique()->values();
        $signatureRecords = $memberIds->isEmpty()
            ? collect()
            : LetterSignature::query()
                ->where('letter_id', $letter->id)
                ->whereIn('signer_member_id', $memberIds)
                ->get()
                ->keyBy('signer_member_id');

        return collect($signers)
            ->map(function (array $signer, int $index) use ($baseVerificationUrl, $validLogoPath, $organization, $signatureRecords) {
                if (! ($signer['qr_enabled'] ?? true)) {
                    $signer['signature'] = null;

                    return $signer;
                }

                $signatureRecord = ! empty($signer['member_id'])
                    ? $signatureRecords->get((int) $signer['member_id'])
                    : null;

                if ($signatureRecord) {
                    $verificationUrl = route('letters.signature.verify', [
                        'signature' => $signatureRecord->id,
                        'k' => $signatureRecord->verification_code,
                    ]);
                } else {
                    $separator = str_contains($baseVerificationUrl, '?') ? '&' : '?';
                    $verificationUrl = $baseVerificationUrl.$separator.'signer='.($index + 1);
                }

                $signer['signature'] = [
                    'signature_id' => $signatureRecord?->id,
                    'verification_url' => $verificationUrl,
                    'qr_data_uri' => $this->qrCodeService->generateQrWithCenterLogo($verificationUrl, $validLogoPath),
                    'org_logo_url' => $organization['logo_url'] ?? null,
                    'org_logo_data_uri' => $organization['logo_data_uri'] ?? null,
                ];

                return $signer;
            })
            ->values()
            ->all();
    }

    private function fileDataUri(?string $path): ?string
    {
        if (! $path || ! Storage::disk('public')->exists($path)) {
            return null;
        }

        $absolutePath = Storage::disk('public')->path($path);
        if (! is_file($absolutePath)) {
            return null;
        }

        $bytes = @file_get_contents($absolutePath);
        if ($bytes === false) {
            return null;
        }

        $mime = @mime_content_type($absolutePath) ?: 'image/png';

        return 'data:'.$mime.';base64,'.base64_encode($bytes);
    }

    private function normalizeLogoPath(?string $logoPath): ?string
    {
        if (! $logoPath) {
            return null;
        }

        $path = trim($logoPath);
        if ($path === '') {
            return null;
        }

        if (str_starts_with($path, '/storage/')) {
            return substr($path, 9);
        }
        if (str_starts_with($path, 'storage/')) {
            return substr($path, 8);
        }

        return ltrim($path, '/');
    }
}
