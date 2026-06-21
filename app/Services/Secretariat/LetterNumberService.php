<?php

namespace App\Services\Secretariat;

use App\Models\LetterNumberingProfile;
use App\Models\LetterSequence;
use App\Models\Letter;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LetterNumberService
{
    public function previewNumber(LetterNumberingProfile $profile, CarbonInterface $date, ?string $classification = null): string
    {
        $seq = $this->nextAvailableSequenceValue($profile, $date, $classification);

        return $this->formatNumber($profile, $date, $seq, $classification);
    }

    public function commitNextNumber(
        LetterNumberingProfile $profile,
        CarbonInterface $date,
        ?string $classification = null,
        ?int $ignoreLetterId = null
    ): string
    {
        return DB::transaction(function () use ($profile, $date, $classification, $ignoreLetterId) {
            $query = LetterSequence::query()
                ->where('numbering_profile_id', $profile->id)
                ->where('year', $date->year);

            if ($profile->reset_policy === 'monthly') {
                $query->where('month', $date->month);
            } elseif ($profile->reset_policy === 'never') {
                $query->whereNull('month');
            }

            $sequence = $query->lockForUpdate()->first();

            if (!$sequence) {
                $sequence = LetterSequence::create([
                    'numbering_profile_id' => $profile->id,
                    'year' => $date->year,
                    'month' => $profile->reset_policy === 'monthly' ? $date->month : null,
                    'last_seq' => 0,
                ]);
            }

            $nextSeq = $this->nextAvailableSequenceValue($profile, $date, $classification, $ignoreLetterId);
            $sequence->last_seq = max((int) $sequence->last_seq, $nextSeq);
            $sequence->save();

            return $this->formatNumber($profile, $date, $nextSeq, $classification);
        });
    }

    private function nextAvailableSequenceValue(
        LetterNumberingProfile $profile,
        CarbonInterface $date,
        ?string $classification,
        ?int $ignoreLetterId = null
    ): int
    {
        $query = LetterSequence::query()
            ->where('numbering_profile_id', $profile->id)
            ->where('year', $date->year);

        if ($profile->reset_policy === 'monthly') {
            $query->where('month', $date->month);
        } elseif ($profile->reset_policy === 'never') {
            $query->whereNull('month');
        }

        $sequence = $query->first();
        $highestExisting = $this->highestExistingSequence($profile, $date, $classification, $ignoreLetterId);
        $baseline = $highestExisting > 0 ? $highestExisting : (int) ($sequence?->last_seq ?? 0);

        for ($seq = $baseline + 1; $seq <= $baseline + 1000; $seq++) {
            $number = $this->formatNumber($profile, $date, $seq, $classification);
            if (! $this->numberExists($number, $ignoreLetterId)) {
                return $seq;
            }
        }

        return $baseline + 1001;
    }

    private function highestExistingSequence(
        LetterNumberingProfile $profile,
        CarbonInterface $date,
        ?string $classification,
        ?int $ignoreLetterId = null
    ): int {
        $pattern = $this->numberRegex($profile, $date, $classification);
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

    private function numberExists(string $number, ?int $ignoreLetterId = null): bool
    {
        return Letter::query()
            ->where('number', $number)
            ->when($ignoreLetterId, fn ($query) => $query->whereKeyNot($ignoreLetterId))
            ->exists();
    }

    private function formatNumber(LetterNumberingProfile $profile, CarbonInterface $date, int $seq, ?string $classification): string
    {
        $romanMonth = $this->toRoman($date->month);
        $pattern = $profile->pattern;

        $replacements = [
            '{seq}' => str_pad((string) $seq, 3, '0', STR_PAD_LEFT),
            '{type}' => $classification ?? '-',
            '{org}' => Str::upper(config('app.org_short', 'IDI')),
            '{roman_month}' => $romanMonth,
            '{year}' => $date->year,
        ];

        $number = strtr($pattern, $replacements);

        if ($profile->prefix) {
            $number = $profile->prefix . $number;
        }

        if ($profile->suffix) {
            $number .= $profile->suffix;
        }

        return $number;
    }

    private function numberRegex(LetterNumberingProfile $profile, CarbonInterface $date, ?string $classification): string
    {
        $raw = ($profile->prefix ?: '').$profile->pattern.($profile->suffix ?: '');
        $quoted = preg_quote($raw, '#');
        $sequenceToken = preg_quote('{seq}', '#');

        if (str_contains($quoted, $sequenceToken)) {
            $quoted = preg_replace('#'.preg_quote($sequenceToken, '#').'#', '(?P<seq>\d+)', $quoted, 1);
            $quoted = str_replace($sequenceToken, '\d+', $quoted);
        }

        return '#^'.strtr($quoted, [
            preg_quote('{type}', '#') => preg_quote($classification ?? '-', '#'),
            preg_quote('{org}', '#') => preg_quote(Str::upper(config('app.org_short', 'IDI')), '#'),
            preg_quote('{roman_month}', '#') => preg_quote($this->toRoman($date->month), '#'),
            preg_quote('{year}', '#') => preg_quote((string) $date->year, '#'),
        ]).'$#';
    }

    private function toRoman(int $number): string
    {
        $map = [
            'M' => 1000,
            'CM' => 900,
            'D' => 500,
            'CD' => 400,
            'C' => 100,
            'XC' => 90,
            'L' => 50,
            'XL' => 40,
            'X' => 10,
            'IX' => 9,
            'V' => 5,
            'IV' => 4,
            'I' => 1,
        ];

        $result = '';
        foreach ($map as $roman => $value) {
            while ($number >= $value) {
                $result .= $roman;
                $number -= $value;
            }
        }

        return $result;
    }
}
