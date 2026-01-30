<?php

namespace App\Services\Secretariat;

class LetterHtmlRenderer
{
    public function render(array $blocks, array $margins, array $placeholders = []): string
    {
        $top = $margins['top_mm'] ?? 20;
        $right = $margins['right_mm'] ?? 20;
        $bottom = $margins['bottom_mm'] ?? 20;
        $left = $margins['left_mm'] ?? 20;

        $pages = [];
        foreach ($blocks as $block) {
            $pageIndex = (int) ($block['page'] ?? 1);
            $pages[$pageIndex] = ($pages[$pageIndex] ?? '') . $this->renderBlock($block, $placeholders);
        }

        ksort($pages);
        $body = '';
        foreach ($pages as $pageBlocks) {
            $body .= '<div class=\"letter-page\">' . $pageBlocks . '</div>';
        }

        return <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<style>
    @page { size: A4; margin: {$top}mm {$right}mm {$bottom}mm {$left}mm; }
    body { font-family: 'Arial', sans-serif; margin: 0; }
    .letter-page { width: 210mm; min-height: 297mm; position: relative; page-break-after: always; }
    .letter-block { position: absolute; box-sizing: border-box; }
</style>
</head>
<body>
<div class="letter-page">{$body}</div>
</body>
</html>
HTML;
    }

    private function renderBlock(array $block, array $placeholders): string
    {
        $x = $block['x'] ?? 0;
        $y = $block['y'] ?? 0;
        $w = $block['w'] ?? 200;
        $h = $block['h'] ?? 40;
        $content = $block['content'] ?? '';

        $content = $this->replacePlaceholders((string) $content, $placeholders);

        $style = sprintf('left:%dpx;top:%dpx;width:%dpx;height:%dpx;', $x, $y, $w, $h);

        return sprintf('<div class="letter-block" style="%s">%s</div>', $style, $content);
    }

    private function replacePlaceholders(string $content, array $placeholders): string
    {
        foreach ($placeholders as $key => $value) {
            $content = str_replace('{{' . $key . '}}', (string) $value, $content);
        }

        return $content;
    }
}
