<?php

namespace App\Services\Secretariat;

class LetterPlaintextService
{
    public function extract(array $blocks): string
    {
        $chunks = [];

        foreach ($blocks as $block) {
            $content = $block['content'] ?? '';
            if (is_array($content)) {
                $content = implode(' ', $content);
            }

            $text = trim(strip_tags((string) $content));
            if ($text !== '') {
                $chunks[] = $text;
            }
        }

        return trim(implode("\n", $chunks));
    }
}
