<?php

namespace App\Services\Pdf;

use Illuminate\Contracts\View\View;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\File;
use Mpdf\Mpdf;
use Mpdf\Output\Destination;

class MpdfRenderer
{
    public function renderView(string|View $view, array $data = [], array $options = []): string
    {
        $html = $view instanceof View ? $view->render() : view($view, $data)->render();

        return $this->renderHtml($html, $options);
    }

    public function renderHtml(string $html, array $options = []): string
    {
        $this->configureRuntimeLimits();

        $mpdf = $this->make($options);
        $this->applyHeader($mpdf, $options);
        $mpdf->WriteHTML($html);

        return $mpdf->Output('', Destination::STRING_RETURN);
    }

    public function saveHtml(string $html, string $outputPath, array $options = []): void
    {
        $this->configureRuntimeLimits();

        File::ensureDirectoryExists(dirname($outputPath));

        $mpdf = $this->make($options);
        $this->applyHeader($mpdf, $options);
        $mpdf->WriteHTML($html);
        $mpdf->Output($outputPath, Destination::FILE);
    }

    public function inlineView(string $view, array $data, string $filename, array $options = []): Response
    {
        return $this->response($this->renderView($view, $data, $options), $filename, true);
    }

    public function downloadView(string $view, array $data, string $filename, array $options = []): Response
    {
        return $this->response($this->renderView($view, $data, $options), $filename, false);
    }

    public function response(string $content, string $filename, bool $inline): Response
    {
        return response($content, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => ($inline ? 'inline' : 'attachment').'; filename="'.$filename.'"',
        ]);
    }

    private function make(array $options = []): Mpdf
    {
        $tempDir = storage_path('framework/mpdf');
        File::ensureDirectoryExists($tempDir);

        return new Mpdf([
            'mode' => 'utf-8',
            'format' => $options['format'] ?? 'A4',
            'orientation' => $options['orientation'] ?? 'P',
            'tempDir' => $tempDir,
            'default_font' => $options['default_font'] ?? 'dejavusans',
            'default_font_size' => $options['default_font_size'] ?? 0,
            'margin_left' => $options['margin_left'] ?? 10,
            'margin_right' => $options['margin_right'] ?? 10,
            'margin_top' => $options['margin_top'] ?? 10,
            'margin_bottom' => $options['margin_bottom'] ?? 10,
            'margin_header' => $options['margin_header'] ?? 9,
            'setAutoTopMargin' => $options['set_auto_top_margin'] ?? false,
            'autoMarginPadding' => $options['auto_margin_padding'] ?? 2,
        ]);
    }

    private function configureRuntimeLimits(): void
    {
        $backtrackLimit = max((int) ini_get('pcre.backtrack_limit'), 10000000);
        ini_set('pcre.backtrack_limit', (string) $backtrackLimit);
    }

    private function applyHeader(Mpdf $mpdf, array $options): void
    {
        $headerHtml = $options['html_header'] ?? null;
        if (is_string($headerHtml) && $headerHtml !== '') {
            $mpdf->SetHTMLHeader($headerHtml);
        }
    }
}
