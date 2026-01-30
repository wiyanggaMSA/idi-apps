<?php

namespace App\Services\Secretariat;

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel\ErrorCorrectionLevelHigh;
use Endroid\QrCode\RoundBlockSizeMode\RoundBlockSizeModeMargin;

class QrCodeService
{
    public function generateQrWithCenterLogo(string $url, ?string $logoPath = null): string
    {
        $builder = Builder::create()
            ->data($url)
            ->encoding(new Encoding('UTF-8'))
            ->errorCorrectionLevel(new ErrorCorrectionLevelHigh())
            ->size(600)
            ->margin(0)
            ->roundBlockSizeMode(new RoundBlockSizeModeMargin());

        if ($logoPath) {
            $builder->logoPath($logoPath)
                ->logoResizeToWidth(120)
                ->logoResizeToHeight(120)
                ->logoPunchoutBackground(true);
        }

        return $builder->build()->getDataUri();
    }
}
