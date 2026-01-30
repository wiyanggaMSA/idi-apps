<?php

namespace App\Services\Secretariat;

use App\Models\LetterNumberingProfile;
use App\Models\LetterSequence;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LetterNumberService
{
    public function previewNumber(LetterNumberingProfile $profile, CarbonInterface $date, ?string $classification = null): string
    {
        $seq = $this->nextSequenceValue($profile, $date);

        return $this->formatNumber($profile, $date, $seq, $classification);
    }

    public function commitNextNumber(LetterNumberingProfile $profile, CarbonInterface $date, ?string $classification = null): string
    {
        return DB::transaction(function () use ($profile, $date, $classification) {
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

            $sequence->last_seq += 1;
            $sequence->save();

            return $this->formatNumber($profile, $date, $sequence->last_seq, $classification);
        });
    }

    private function nextSequenceValue(LetterNumberingProfile $profile, CarbonInterface $date): int
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

        return $sequence ? $sequence->last_seq + 1 : 1;
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
