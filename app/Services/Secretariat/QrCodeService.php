<?php

namespace App\Services\Secretariat;

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;

class QrCodeService
{
    public function generateQrWithCenterLogo(string $url, ?string $logoPath = null): string
    {
        $hasLogo = is_string($logoPath) && $logoPath !== '' && is_file($logoPath);

        $result = (new Builder(
            writer: new PngWriter(),
            data: $url,
            encoding: new Encoding('UTF-8'),
            errorCorrectionLevel: ErrorCorrectionLevel::High,
            size: 600,
            margin: 0,
            roundBlockSizeMode: RoundBlockSizeMode::Margin,
            logoPath: $hasLogo ? $logoPath : '',
            logoResizeToWidth: $hasLogo ? 140 : null,
            logoResizeToHeight: $hasLogo ? 140 : null,
            logoPunchoutBackground: $hasLogo
        ))->build();

        return $result->getDataUri();
    }
}
