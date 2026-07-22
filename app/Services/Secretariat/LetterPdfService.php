<?php

namespace App\Services\Secretariat;

use App\Services\Pdf\MpdfRenderer;
use RuntimeException;

class LetterPdfService
{
    public function __construct(
        private readonly MpdfRenderer $pdfRenderer
    ) {
    }

    public function generateFromHtml(string $html, string $outputPath, array $renderData = []): void
    {
        $this->pdfRenderer->saveHtml($html, $outputPath, $this->letterOptions($renderData));
    }

    public function generateFromUrl(string $url): string
    {
        throw new RuntimeException('Generate PDF dari URL tidak tersedia pada renderer mPDF.');
    }

    public function generateFromHtmlContent(string $html, array $renderData = []): string
    {
        return $this->pdfRenderer->renderHtml($html, $this->letterOptions($renderData));
    }

    private function letterOptions(array $renderData = []): array
    {
        $style = $renderData['data']['style'] ?? [];
        $fontMap = [
            'Times New Roman' => 'freeserif',
            'Arial' => 'freesans',
            'Calibri' => 'dejavusans',
        ];
        $format = in_array(($style['paper_format'] ?? ''), ['A4', 'A5', 'Letter', 'Legal'], true)
            ? $style['paper_format']
            : 'A4';
        $orientation = ($style['orientation'] ?? 'P') === 'L' ? 'L' : 'P';
        $repeatHeader = (bool) ($style['repeat_header'] ?? true);
        $marginTop = max(5, min(50, (float) ($style['margin_top_mm'] ?? 10)));
        $marginRight = max(5, min(50, (float) ($style['margin_right_mm'] ?? 18)));
        $marginLeft = max(5, min(50, (float) ($style['margin_left_mm'] ?? 18)));
        $contentTopGap = max(0, min(40, (float) ($style['content_top_gap_mm'] ?? 3)));
        $headerHtml = $repeatHeader
            ? view('letters.partials.mpdf-header', [
                'organization' => $renderData['data']['organization'] ?? [],
                'style' => $style,
            ])->render()
            : null;
        $contentMarginTop = $repeatHeader
            ? $marginTop + $this->headerHeightMm($style, $format, $orientation, $marginLeft, $marginRight) + $contentTopGap
            : $marginTop;

        return [
            'format' => $format,
            'orientation' => $orientation,
            'default_font' => $fontMap[$style['font_family'] ?? 'Times New Roman'] ?? 'freeserif',
            'default_font_size' => max(10, min(20, (float) ($style['font_size'] ?? 11))),
            'margin_left' => $marginLeft,
            'margin_right' => $marginRight,
            'margin_top' => $contentMarginTop,
            'margin_bottom' => max(5, min(50, (float) ($style['margin_bottom_mm'] ?? 20))),
            'margin_header' => $marginTop,
            'set_auto_top_margin' => false,
            'auto_margin_padding' => $contentTopGap,
            'html_header' => $headerHtml,
        ];
    }

    private function headerHeightMm(array $style, string $format, string $orientation, float $marginLeft, float $marginRight): float
    {
        $pageSizes = [
            'A4' => [210.0, 297.0],
            'A5' => [148.0, 210.0],
            'Letter' => [215.9, 279.4],
            'Legal' => [215.9, 355.6],
        ];
        [$pageWidth, $pageHeight] = $pageSizes[$format];
        if ($orientation === 'L') {
            [$pageWidth, $pageHeight] = [$pageHeight, $pageWidth];
        }

        $dataUri = $style['header_image_data_uri'] ?? null;
        if (! is_string($dataUri) || ! str_contains($dataUri, ',')) {
            return 35.0;
        }

        $bytes = base64_decode(substr($dataUri, strpos($dataUri, ',') + 1), true);
        $imageSize = is_string($bytes) ? @getimagesizefromstring($bytes) : false;
        if (! $imageSize || empty($imageSize[0]) || empty($imageSize[1])) {
            return 35.0;
        }

        $contentWidth = max(20, $pageWidth - $marginLeft - $marginRight);

        return $contentWidth * $imageSize[1] / $imageSize[0];
    }
}
