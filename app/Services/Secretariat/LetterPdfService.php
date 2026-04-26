<?php

namespace App\Services\Secretariat;

use RuntimeException;
use Spatie\Browsershot\Browsershot;

class LetterPdfService
{
    public function generateFromHtml(string $html, string $outputPath): void
    {
        $this->browsershotFromHtml($html)
            ->format('A4')
            ->margins(0, 0, 0, 0)
            ->showBackground()
            ->save($outputPath);
    }

    public function generateFromUrl(string $url): string
    {
        return $this->browsershotFromUrl($url)
            ->format('A4')
            ->margins(0, 0, 0, 0)
            ->showBackground()
            ->pdf();
    }

    public function generateFromHtmlContent(string $html): string
    {
        $tempPath = tempnam(sys_get_temp_dir(), 'letter-pdf-');
        if ($tempPath === false) {
            throw new RuntimeException('Gagal membuat file sementara untuk PDF.');
        }

        $pdfPath = $tempPath . '.pdf';

        try {
            $this->generateFromHtml($html, $pdfPath);
            $content = file_get_contents($pdfPath);
            if ($content === false) {
                throw new RuntimeException('Gagal membaca PDF hasil generate.');
            }

            return $content;
        } finally {
            @unlink($tempPath);
            @unlink($pdfPath);
        }
    }

    private function browsershotFromUrl(string $url): Browsershot
    {
        return $this->configureBrowsershot(Browsershot::url($url));
    }

    private function browsershotFromHtml(string $html): Browsershot
    {
        return $this->configureBrowsershot(Browsershot::html($html));
    }

    private function configureBrowsershot(Browsershot $browsershot): Browsershot
    {
        $nodeModulesPath = base_path('node_modules');
        $puppeteerModule = $nodeModulesPath . '/puppeteer/package.json';
        if (!is_file($puppeteerModule)) {
            throw new RuntimeException(
                'Paket puppeteer belum terpasang. Jalankan: PUPPETEER_SKIP_DOWNLOAD=1 npm install puppeteer --save'
            );
        }

        $browsershot
            ->setNodeModulePath($nodeModulesPath);

        $nodeBinary = env('BROWSERSHOT_NODE_BINARY');
        if (is_string($nodeBinary) && $nodeBinary !== '' && is_file($nodeBinary)) {
            $browsershot->setNodeBinary($nodeBinary);
        }

        $chromePath = $this->detectChromePath();
        if ($chromePath) {
            $browsershot->setChromePath($chromePath);
        }

        $configuredTimeout = max(10, min(300, (int) env('BROWSERSHOT_TIMEOUT', 60)));
        $phpMaxExecution = (int) ini_get('max_execution_time');
        $safeUpperBound = $phpMaxExecution > 0 ? max(10, $phpMaxExecution - 5) : 300;
        $timeoutSeconds = min($configuredTimeout, $safeUpperBound);

        // Keep process timeout below PHP max_execution_time and avoid hanging on network-idle.
        $browsershot
            ->timeout($timeoutSeconds)
            ->setOption('waitUntil', 'domcontentloaded')
            ->addChromiumArguments([
                'disable-dev-shm-usage',
                'no-sandbox',
                'disable-setuid-sandbox',
            ]);

        return $browsershot;
    }

    private function detectChromePath(): ?string
    {
        $configured = env('BROWSERSHOT_CHROME_PATH');
        if (is_string($configured) && $configured !== '' && is_file($configured)) {
            return $configured;
        }

        $candidates = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
        ];

        foreach ($candidates as $candidate) {
            if (is_file($candidate)) {
                return $candidate;
            }
        }

        return null;
    }
}
