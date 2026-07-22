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
    public function __construct(
        private readonly QrCodeService $qrCodeService,
        private readonly LetterBodyHtmlFormatter $bodyHtmlFormatter
    ) {}

    public function build(Letter $letter): array
    {
        $layout = $letter->layout_json ?? [];
        $blocks = $this->bodyHtmlFormatter->formatBlocks($letter->blocks_json ?? []);

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
            $qrDataUri = $this->qrCodeService->generateQrWithCenterLogo(
                $verificationUrl,
                $this->qrLogoAbsolutePath($normalizedLogoPath)
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
            $qrDataUri = $this->qrCodeService->generateQrWithCenterLogo(
                $verificationUrl,
                $this->qrLogoAbsolutePath($normalizedLogoPath)
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

        $pxToMm = static fn (float $px): float => round($px * 25.4 / 96, 1);
        $mmToPx = static fn (float $mm): int => (int) round($mm * 96 / 25.4);
        $marginTopMm = (float) ($templateStyle['margin_top_mm'] ?? 10);
        $marginRightMm = (float) ($templateStyle['margin_right_mm'] ?? $pxToMm($templateStyle['margin_right_px'] ?? 64));
        $marginBottomMm = (float) ($templateStyle['margin_bottom_mm'] ?? $pxToMm($templateStyle['margin_bottom_px'] ?? 72));
        $marginLeftMm = (float) ($templateStyle['margin_left_mm'] ?? $pxToMm($templateStyle['margin_left_px'] ?? 64));
        $contentTopGapMm = (float) ($templateStyle['content_top_gap_mm'] ?? $pxToMm($templateStyle['content_top_gap_px'] ?? 11));

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
                    'font_size' => (float) ($templateStyle['font_size'] ?? 11),
                    'line_height' => (float) ($templateStyle['line_height'] ?? 1.25),
                    'paragraph_spacing' => (float) ($templateStyle['paragraph_spacing'] ?? 2),
                    'repeat_header' => (bool) ($templateStyle['repeat_header'] ?? true),
                    'signature_qr_position' => in_array(($templateStyle['signature_qr_position'] ?? ''), ['left', 'right'], true)
                        ? $templateStyle['signature_qr_position']
                        : 'right',
                    'header_image_url' => $template?->header_image_path ? url(Storage::url($template->header_image_path)) : null,
                    'header_image_data_uri' => $this->fileDataUri($template?->header_image_path, 1200, 600, true),
                    'header_height_px' => (int) ($template?->header_height_px ?: 132),
                    'document_mode' => $template?->document_mode ?: ($templateStyle['document_mode'] ?? 'flow'),
                    'paper_format' => $templateStyle['paper_format'] ?? $template?->paper ?? 'A4',
                    'orientation' => ($templateStyle['orientation'] ?? 'P') === 'L' ? 'L' : 'P',
                    'margin_top_mm' => $marginTopMm,
                    'margin_right_mm' => $marginRightMm,
                    'margin_bottom_mm' => $marginBottomMm,
                    'margin_left_mm' => $marginLeftMm,
                    'content_top_gap_mm' => $contentTopGapMm,
                    'margin_left_px' => (int) ($templateStyle['margin_left_px'] ?? $mmToPx($marginLeftMm)),
                    'margin_right_px' => (int) ($templateStyle['margin_right_px'] ?? $mmToPx($marginRightMm)),
                    'margin_bottom_px' => (int) ($templateStyle['margin_bottom_px'] ?? $mmToPx($marginBottomMm)),
                    'content_top_gap_px' => (int) ($templateStyle['content_top_gap_px'] ?? $mmToPx($contentTopGapMm)),
                ],
            ],
        ];
    }

    private function logoDataUri(?string $logoPath): ?string
    {
        $dataUri = $this->fileDataUri($logoPath, 256, 256);
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
        [$bytes, $mime] = $this->optimizeImageForPdf($bytes, $mime, 256, 256);

        return 'data:'.$mime.';base64,'.base64_encode($bytes);
    }

    private function appendSignerQrPayloads(array $signers, Letter $letter, array $organization, ?string $logoPath): array
    {
        if (! $letter->public_hash) {
            return $signers;
        }

        $validLogoPath = $this->qrLogoAbsolutePath($logoPath);
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

    private function fileDataUri(?string $path, int $maxWidth = 600, int $maxHeight = 600, bool $trimWhitespace = false): ?string
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
        [$bytes, $mime] = $this->optimizeImageForPdf($bytes, $mime, $maxWidth, $maxHeight, $trimWhitespace);

        return 'data:'.$mime.';base64,'.base64_encode($bytes);
    }

    private function qrLogoAbsolutePath(?string $logoPath): ?string
    {
        if ($logoPath) {
            $absolutePath = Storage::disk('public')->path($logoPath);
            if (is_file($absolutePath)) {
                return $absolutePath;
            }
        }

        $fallbackPath = public_path('images/idi-logo.png');

        return is_file($fallbackPath) ? $fallbackPath : null;
    }

    private function optimizeImageForPdf(string $bytes, string $mime, int $maxWidth, int $maxHeight, bool $trimWhitespace = false): array
    {
        if (! function_exists('imagecreatefromstring')) {
            return [$bytes, $mime];
        }

        $info = @getimagesizefromstring($bytes);
        if (! $info) {
            return [$bytes, $mime];
        }

        [$width, $height] = $info;
        $shouldOptimize = $trimWhitespace || strlen($bytes) > 80_000 || $width > $maxWidth || $height > $maxHeight;
        if (! $shouldOptimize) {
            return [$bytes, $mime];
        }

        $image = @imagecreatefromstring($bytes);
        if (! $image) {
            return [$bytes, $mime];
        }

        if ($trimWhitespace) {
            $cropped = $this->cropNearWhiteWhitespace($image);
            if ($cropped !== false) {
                imagedestroy($image);
                $image = $cropped;
                $width = imagesx($image);
                $height = imagesy($image);
            }
        }

        $scale = min(1, $maxWidth / max(1, $width), $maxHeight / max(1, $height));
        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));

        $canvas = imagecreatetruecolor($targetWidth, $targetHeight);
        if (! $canvas) {
            imagedestroy($image);

            return [$bytes, $mime];
        }

        $white = imagecolorallocate($canvas, 255, 255, 255);
        imagefilledrectangle($canvas, 0, 0, $targetWidth, $targetHeight, $white);
        imagecopyresampled($canvas, $image, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        ob_start();
        imagejpeg($canvas, null, 78);
        $optimized = ob_get_clean();

        imagedestroy($image);
        imagedestroy($canvas);

        if (! is_string($optimized) || strlen($optimized) >= strlen($bytes)) {
            return [$bytes, $mime];
        }

        return [$optimized, 'image/jpeg'];
    }

    private function cropNearWhiteWhitespace(\GdImage $image): \GdImage|false
    {
        $width = imagesx($image);
        $height = imagesy($image);
        $minX = $width;
        $minY = $height;
        $maxX = -1;
        $maxY = -1;
        $threshold = 245;
        $trueColor = imageistruecolor($image);

        for ($y = 0; $y < $height; $y++) {
            for ($x = 0; $x < $width; $x++) {
                $color = imagecolorat($image, $x, $y);
                if ($trueColor) {
                    $red = ($color >> 16) & 0xff;
                    $green = ($color >> 8) & 0xff;
                    $blue = $color & 0xff;
                } else {
                    $channels = imagecolorsforindex($image, $color);
                    $red = $channels['red'];
                    $green = $channels['green'];
                    $blue = $channels['blue'];
                }

                if ($red < $threshold || $green < $threshold || $blue < $threshold) {
                    $minX = min($minX, $x);
                    $minY = min($minY, $y);
                    $maxX = max($maxX, $x);
                    $maxY = max($maxY, $y);
                }
            }
        }

        if ($maxX < $minX || $maxY < $minY) {
            return false;
        }

        $padding = max(4, (int) round(min($width, $height) * 0.01));
        $x = max(0, $minX - $padding);
        $y = max(0, $minY - $padding);
        $cropWidth = min($width - $x, ($maxX - $minX + 1) + (2 * $padding));
        $cropHeight = min($height - $y, ($maxY - $minY + 1) + (2 * $padding));

        return imagecrop($image, [
            'x' => $x,
            'y' => $y,
            'width' => $cropWidth,
            'height' => $cropHeight,
        ]);
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
