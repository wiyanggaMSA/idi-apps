<?php

namespace App\Services\Secretariat;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMXPath;

class LetterBodyHtmlFormatter
{
    public function formatBlocks(array $blocks): array
    {
        return collect($blocks)
            ->map(function (array $block): array {
                if (($block['type'] ?? null) === 'isi_surat') {
                    $block['content'] = $this->formatLabelValueRows((string) ($block['content'] ?? ''));
                }

                return $block;
            })
            ->all();
    }

    public function formatLabelValueRows(string $html): string
    {
        if (trim($html) === '' || ! class_exists(DOMDocument::class)) {
            return $html;
        }

        $previousErrors = libxml_use_internal_errors(true);
        $document = new DOMDocument('1.0', 'UTF-8');
        $loaded = $document->loadHTML(
            '<?xml encoding="UTF-8"><div id="letter-body-fragment">'.$html.'</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previousErrors);

        if (! $loaded) {
            return $html;
        }

        $root = (new DOMXPath($document))->query('//*[@id="letter-body-fragment"]')->item(0);
        if (! $root instanceof DOMElement) {
            return $html;
        }

        $group = [];
        foreach (iterator_to_array($root->childNodes) as $node) {
            $parts = $node instanceof DOMElement ? $this->labelValueParts($node) : null;
            if ($parts) {
                if ($group !== [] && ($group[0][3] ?? 0) !== ($parts[2] ?? 0)) {
                    $this->replaceGroupWithTable($document, $root, $group);
                    $group = [];
                }
                $group[] = [$node, ...$parts];
                continue;
            }

            $this->replaceGroupWithTable($document, $root, $group);
            $group = [];
        }
        $this->replaceGroupWithTable($document, $root, $group);

        $result = '';
        foreach ($root->childNodes as $child) {
            $result .= $document->saveHTML($child);
        }

        return $result;
    }

    private function labelValueParts(DOMElement $node): ?array
    {
        if (! in_array(strtolower($node->tagName), ['p', 'div'], true)) {
            return null;
        }

        $raw = trim(str_replace("\u{00a0}", ' ', $node->textContent));
        $indentLevel = 0;
        if (preg_match('/(?:^|\s)ql-indent-(\d+)(?:\s|$)/', $node->getAttribute('class'), $indentMatch)) {
            $indentLevel = max(0, min(3, (int) $indentMatch[1]));
        }
        if (str_contains($raw, "\t")) {
            $parts = preg_split('/\t+/u', $raw, 2);

            return count($parts) === 2 && trim($parts[0]) !== '' && trim($parts[1]) !== ''
                ? [trim($parts[0]), trim($parts[1]), $indentLevel]
                : null;
        }

        $plain = trim(preg_replace('/\s+/u', ' ', $raw) ?? '');
        if (! preg_match('/^([^:]{2,42})\s*:\s*(.+)$/u', $plain, $matches)) {
            return null;
        }

        return [trim($matches[1]), trim($matches[2]), $indentLevel];
    }

    private function replaceGroupWithTable(DOMDocument $document, DOMElement $root, array $group): void
    {
        if (count($group) < 2) {
            return;
        }

        $longestLabelLength = max(array_map(
            static fn (array $row): int => mb_strwidth((string) ($row[1] ?? ''), 'UTF-8'),
            $group
        ));
        $labelWidthPercent = max(8, min(32, round($longestLabelLength * 0.95, 1)));
        $separatorWidthPercent = 2;
        $valueWidthPercent = round(100 - $labelWidthPercent - $separatorWidthPercent, 1);
        $table = $document->createElement('table');
        $indentLevel = (int) ($group[0][3] ?? 0);
        $table->setAttribute('class', 'detail-table'.($indentLevel > 0 ? ' ql-indent-'.$indentLevel : ''));
        if ($indentLevel > 0) {
            $indentPercent = $indentLevel * 5;
            $table->setAttribute('style', 'margin-left: '.$indentPercent.'%; width: '.(100 - $indentPercent).'%;');
        }

        foreach ($group as [$node, $label, $value]) {
            $row = $document->createElement('tr');
            foreach ([['detail-label', $label], ['detail-separator', ':'], ['detail-value', $value]] as [$class, $text]) {
                $cell = $document->createElement('td');
                $cell->setAttribute('class', $class);
                $cellWidth = match ($class) {
                    'detail-label' => $labelWidthPercent,
                    'detail-separator' => $separatorWidthPercent,
                    default => $valueWidthPercent,
                };
                $cell->setAttribute('style', 'width: '.$cellWidth.'%;');
                $cell->appendChild($document->createTextNode($text));
                $row->appendChild($cell);
            }
            $table->appendChild($row);
        }

        /** @var DOMNode $firstNode */
        $firstNode = $group[0][0];
        $root->insertBefore($table, $firstNode);
        foreach ($group as [$node]) {
            $root->removeChild($node);
        }
    }
}
