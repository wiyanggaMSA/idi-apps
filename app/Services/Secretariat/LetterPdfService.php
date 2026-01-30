<?php

namespace App\Services\Secretariat;

use Spatie\Browsershot\Browsershot;

class LetterPdfService
{
    public function generateFromHtml(string $html, string $outputPath): void
    {
        // Requires spatie/browsershot and a Chromium installation accessible by Node/Puppeteer.
        Browsershot::html($html)
            ->format('A4')
            ->margins(0, 0, 0, 0)
            ->showBackground()
            ->save($outputPath);
    }
}
