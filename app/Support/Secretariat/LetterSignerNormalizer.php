<?php

namespace App\Support\Secretariat;

class LetterSignerNormalizer
{
    public static function normalize(
        ?array $signers,
        ?string $fallbackName = null,
        ?string $fallbackTitle = null,
        string $fallbackPosition = 'right',
        bool $fallbackQrEnabled = true
    ): array {
        $normalized = collect($signers ?? [])
            ->take(3)
            ->map(function ($signer, int $index) use ($fallbackQrEnabled) {
                $position = $signer['position'] ?? match ($index) {
                    0 => 'right',
                    1 => 'left',
                    default => 'center',
                };

                if (! in_array($position, ['left', 'center', 'right'], true)) {
                    $position = 'right';
                }

                return [
                    'member_id' => isset($signer['member_id']) && $signer['member_id'] !== ''
                        ? (int) $signer['member_id']
                        : null,
                    'name' => trim((string) ($signer['name'] ?? '')),
                    'title' => trim((string) ($signer['title'] ?? ($signer['role'] ?? ''))),
                    'position' => $position,
                    'qr_enabled' => array_key_exists('qr_enabled', $signer)
                        ? filter_var($signer['qr_enabled'], FILTER_VALIDATE_BOOL)
                        : $fallbackQrEnabled,
                ];
            })
            ->filter(fn (array $signer) => $signer['name'] !== '' || $signer['title'] !== '')
            ->values()
            ->all();

        if ($normalized !== []) {
            return $normalized;
        }

        $fallbackName = trim((string) $fallbackName);
        $fallbackTitle = trim((string) $fallbackTitle);

        if ($fallbackName === '' && $fallbackTitle === '') {
            return [];
        }

        if (! in_array($fallbackPosition, ['left', 'center', 'right'], true)) {
            $fallbackPosition = 'right';
        }

        return [[
            'member_id' => null,
            'name' => $fallbackName,
            'title' => $fallbackTitle,
            'position' => $fallbackPosition,
            'qr_enabled' => $fallbackQrEnabled,
        ]];
    }

    public static function first(array $signers): array
    {
        return $signers[0] ?? [
            'name' => '',
            'title' => '',
            'member_id' => null,
            'position' => 'right',
            'qr_enabled' => true,
        ];
    }
}
