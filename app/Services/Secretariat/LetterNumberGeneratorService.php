<?php

namespace App\Services\Secretariat;

use App\Models\Letter;
use App\Models\LetterSequence;
use App\Models\LetterTemplate;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class LetterNumberGeneratorService
{
    public function preview(LetterTemplate $template, CarbonInterface $date, ?string $type = null): string
    {
        $sequence = $this->nextAvailableSequence($template, $date, $type);

        return $this->format($template, $date, $sequence, $type);
    }

    public function commit(LetterTemplate $template, CarbonInterface $date, ?string $type = null, ?int $ignoreLetterId = null): string
    {
        return DB::transaction(function () use ($template, $date, $type, $ignoreLetterId) {
            $sequence = $this->sequenceQuery($template, $date)->lockForUpdate()->first();

            if (! $sequence) {
                $sequence = LetterSequence::create([
                    'letter_template_id' => $template->id,
                    'year' => $date->year,
                    'month' => $template->number_reset_policy === 'monthly' ? $date->month : null,
                    'last_seq' => 0,
                ]);
            }

            $nextSeq = $this->nextAvailableSequence($template, $date, $type, $ignoreLetterId);
            $number = $this->format($template, $date, $nextSeq, $type);

            $sequence->last_seq = max((int) $sequence->last_seq, $nextSeq);
            $sequence->save();
            $template->forceFill(['last_number' => max((int) $template->last_number, $sequence->last_seq)])->save();

            return $number;
        });
    }

    public function assertUnique(string $number, ?int $ignoreLetterId = null): void
    {
        if ($this->numberExists($number, $ignoreLetterId)) {
            throw new LetterWorkflowException('number', 'Nomor surat sudah digunakan. Gunakan nomor lain.');
        }
    }

    private function nextAvailableSequence(
        LetterTemplate $template,
        CarbonInterface $date,
        ?string $type,
        ?int $ignoreLetterId = null
    ): int
    {
        $highestExisting = $this->highestExistingSequence($template, $date, $type, $ignoreLetterId);
        $baseline = $highestExisting > 0
            ? $highestExisting
            : max((int) ($this->sequenceQuery($template, $date)->value('last_seq') ?? 0), (int) ($template->last_number ?? 0));

        for ($sequence = $baseline + 1; $sequence <= $baseline + 1000; $sequence++) {
            $number = $this->format($template, $date, $sequence, $type);
            if (! $this->numberExists($number, $ignoreLetterId)) {
                return $sequence;
            }
        }

        return $baseline + 1001;
    }

    private function highestExistingSequence(
        LetterTemplate $template,
        CarbonInterface $date,
        ?string $type,
        ?int $ignoreLetterId = null
    ): int {
        $pattern = $this->numberRegex($template, $date, $type);
        $highest = 0;

        Letter::query()
            ->whereNotNull('number')
            ->when($ignoreLetterId, fn ($query) => $query->whereKeyNot($ignoreLetterId))
            ->pluck('number')
            ->each(function (string $number) use ($pattern, &$highest) {
                if (preg_match($pattern, $number, $matches)) {
                    $highest = max($highest, (int) ($matches['seq'] ?? 0));
                }
            });

        return $highest;
    }

    private function numberRegex(LetterTemplate $template, CarbonInterface $date, ?string $type): string
    {
        $raw = (string) ($template->number_format ?: '{number}/IDI-PWK/{roman_month}/{year}');
        $quoted = preg_quote($raw, '#');
        $sequencePattern = '(?P<seq>\d+)';

        foreach (['number', 'seq', 'counter'] as $placeholder) {
            $token = preg_quote('{'.$placeholder.'}', '#');
            if (str_contains($quoted, $token)) {
                $quoted = preg_replace('#'.preg_quote($token, '#').'#', $sequencePattern, $quoted, 1);
                $quoted = str_replace($token, '\d+', $quoted);
            }
        }

        return '#^'.strtr($quoted, [
            preg_quote('{month}', '#') => preg_quote(str_pad((string) $date->month, 2, '0', STR_PAD_LEFT), '#'),
            preg_quote('{roman_month}', '#') => preg_quote($this->roman($date->month), '#'),
            preg_quote('{year}', '#') => preg_quote((string) $date->year, '#'),
            preg_quote('{type}', '#') => preg_quote($type ?: ($template->classification ?: 'UMUM'), '#'),
        ]).'$#';
    }

    private function sequenceQuery(LetterTemplate $template, CarbonInterface $date)
    {
        $query = LetterSequence::query()
            ->where('letter_template_id', $template->id);

        if ($template->number_reset_policy === 'never') {
            return $query->whereNull('month');
        }

        $query->where('year', $date->year);

        if ($template->number_reset_policy === 'monthly') {
            $query->where('month', $date->month);
        } else {
            $query->whereNull('month');
        }

        return $query;
    }

    private function numberExists(string $number, ?int $ignoreLetterId): bool
    {
        return Letter::query()
            ->where('number', $number)
            ->when($ignoreLetterId, fn ($query) => $query->whereKeyNot($ignoreLetterId))
            ->exists();
    }

    private function format(LetterTemplate $template, CarbonInterface $date, int $sequence, ?string $type): string
    {
        $raw = (string) ($template->number_format ?: '{number}/IDI-PWK/{roman_month}/{year}');
        $padded = str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);

        return strtr($raw, [
            '{number}' => $padded,
            '{seq}' => $padded,
            '{counter}' => $padded,
            '{month}' => str_pad((string) $date->month, 2, '0', STR_PAD_LEFT),
            '{roman_month}' => $this->roman($date->month),
            '{year}' => (string) $date->year,
            '{type}' => $type ?: ($template->classification ?: 'UMUM'),
        ]);
    }

    private function roman(int $number): string
    {
        $map = [
            'XII' => 12,
            'XI' => 11,
            'X' => 10,
            'IX' => 9,
            'VIII' => 8,
            'VII' => 7,
            'VI' => 6,
            'V' => 5,
            'IV' => 4,
            'III' => 3,
            'II' => 2,
            'I' => 1,
        ];

        foreach ($map as $roman => $value) {
            if ($number === $value) {
                return $roman;
            }
        }

        return (string) $number;
    }
}
