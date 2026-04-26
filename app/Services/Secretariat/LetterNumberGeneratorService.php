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
        $sequence = $this->currentSequence($template, $date);

        return $this->format($template, $date, $sequence + 1, $type);
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

            do {
                $sequence->last_seq++;
                $number = $this->format($template, $date, $sequence->last_seq, $type);
            } while ($this->numberExists($number, $ignoreLetterId));

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

    private function currentSequence(LetterTemplate $template, CarbonInterface $date): int
    {
        return (int) ($this->sequenceQuery($template, $date)->value('last_seq') ?? $template->last_number ?? 0);
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
