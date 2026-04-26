<?php

namespace App\Services\Members;

use App\Imports\MemberImportRows;
use App\Models\Division;
use App\Models\Member;
use App\Models\MemberImportBatch;
use App\Models\MemberImportRow;
use App\Models\MemberStatus;
use App\Models\Position;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class MemberImportService
{
    private ?array $memberStatusMap = null;

    public function import(UploadedFile $file, int $userId): array
    {
        $batchId = (string) Str::uuid();
        $batch = MemberImportBatch::create([
            'id' => $batchId,
            'user_id' => $userId,
            'original_filename' => $file->getClientOriginalName(),
        ]);

        $rows = Excel::toArray(new MemberImportRows(), $file)[0] ?? [];

        $createdCount = 0;
        $conflictCount = 0;
        $errorCount = 0;
        $warnings = [];

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;

            $payload = $this->mapRow($row);

            if (! $payload['npa'] || ! $payload['full_name']) {
                $errorCount++;
                continue;
            }

            $conflicts = $this->detectConflicts($payload['npa'], $payload['email']);

            if ($conflicts['conflict']) {
                $conflictCount++;
                $warnings[] = [
                    'row_number' => $rowNumber,
                    'reasons' => $conflicts['types'],
                ];

                MemberImportRow::create([
                    'batch_id' => $batchId,
                    'row_number' => $rowNumber,
                    ...$payload,
                    'conflict_type' => $conflicts['types'],
                    'conflict_member_ids' => $conflicts['member_ids'],
                ]);

                continue;
            }

            Member::create($payload);
            $createdCount++;
        }

        $batch->update([
            'total_rows' => count($rows),
            'created_count' => $createdCount,
            'conflict_count' => $conflictCount,
            'error_count' => $errorCount,
        ]);

        return [
            'batch_id' => $batchId,
            'total_rows' => count($rows),
            'created_count' => $createdCount,
            'conflict_count' => $conflictCount,
            'error_count' => $errorCount,
            'warnings' => $warnings,
        ];
    }

    private function mapRow(array $row): array
    {
        $normalized = $this->normalizeRowKeys($row);

        $divisionName = trim((string) Arr::get($normalized, 'divisi'));
        $positionName = trim((string) Arr::get($normalized, 'jabatan'));

        $division = $divisionName
            ? Division::query()->whereRaw('lower(name) = ?', [strtolower($divisionName)])->first()
            : null;
        $position = $positionName
            ? Position::query()->whereRaw('lower(name) = ?', [strtolower($positionName)])->first()
            : null;

        return [
            'npa' => $this->stringValue(Arr::get($normalized, 'npa')),
            'full_name' => $this->stringValue(Arr::get($normalized, 'nama lengkap')),
            'education' => $this->stringValue(Arr::get($normalized, 'pendidikan')),
            'phone' => $this->stringValue(Arr::get($normalized, 'no. hp')),
            'gender' => $this->normalizeGender(Arr::get($normalized, 'jenis kelamin')),
            'birth_place' => $this->stringValue(Arr::get($normalized, 'tempat lahir')),
            'birth_date' => $this->normalizeDate(Arr::get($normalized, 'tanggal lahir')),
            'email' => $this->stringValue(Arr::get($normalized, 'email')),
            'division_name' => $divisionName ?: null,
            'position_name' => $positionName ?: null,
            'division_id' => $division?->id,
            'position_id' => $position?->id,
            'join_date' => $this->normalizeDate(Arr::get($normalized, 'tanggal bergabung')),
            'status' => $this->normalizeStatus(Arr::get($normalized, 'status')),
            'address' => $this->stringValue(Arr::get($normalized, 'alamat')),
            'notes' => $this->stringValue(Arr::get($normalized, 'catatan')),
        ];
    }

    private function normalizeRowKeys(array $row): array
    {
        $normalized = [];
        foreach ($row as $key => $value) {
            $cleanKey = strtolower(trim((string) $key));
            $normalized[$cleanKey] = $value;
        }

        return $normalized;
    }

    private function detectConflicts(?string $npa, ?string $email): array
    {
        $types = [];
        $ids = [];

        if (! $npa && ! $email) {
            return [
                'conflict' => false,
                'types' => [],
                'member_ids' => [],
            ];
        }

        $members = Member::query()
            ->where(function ($query) use ($npa, $email) {
                if ($npa) {
                    $query->orWhere('npa', $npa);
                }

                if ($email) {
                    $query->orWhere('email', $email);
                }
            })
            ->get(['id', 'npa', 'email']);

        if ($npa && $members->where('npa', $npa)->count() > 0) {
            $types[] = 'npa_exists';
        }

        if ($email && $members->where('email', $email)->count() > 0) {
            $types[] = 'email_exists';
        }

        if (! empty($types)) {
            $ids = $members->pluck('id')->unique()->values()->all();
        }

        return [
            'conflict' => ! empty($types),
            'types' => $types,
            'member_ids' => $ids,
        ];
    }

    private function normalizeGender($value): ?string
    {
        $raw = strtolower(trim((string) $value));
        if ($raw === '') {
            return null;
        }

        $male = ['l', 'male', 'm', 'laki-laki', 'laki', 'pria'];
        $female = ['p', 'female', 'f', 'perempuan', 'wanita'];

        if (in_array($raw, $male, true)) {
            return 'M';
        }

        if (in_array($raw, $female, true)) {
            return 'F';
        }

        return null;
    }

    private function normalizeStatus($value): ?string
    {
        $raw = strtolower(trim((string) $value));
        if ($raw === '') {
            return $this->defaultStatusCode();
        }

        $legacyMapped = match ($raw) {
            'active', 'aktif' => 'aktif',
            'inactive', 'nonaktif', 'mutasi', 'leave', 'cuti', 'alumni' => 'mutasi',
            'meninggal' => 'meninggal',
            default => null,
        };

        if ($legacyMapped && $this->memberStatusExists($legacyMapped)) {
            return $legacyMapped;
        }

        $statusMap = $this->memberStatusMap();
        if (isset($statusMap[$raw])) {
            return $statusMap[$raw];
        }

        return $this->defaultStatusCode();
    }

    private function defaultStatusCode(): string
    {
        $status = MemberStatus::query()
            ->active()
            ->activeMember()
            ->orderBy('sort_order')
            ->value('code');

        return $status ?: 'aktif';
    }

    private function memberStatusExists(string $code): bool
    {
        return MemberStatus::query()
            ->where('code', $code)
            ->exists();
    }

    private function memberStatusMap(): array
    {
        if ($this->memberStatusMap !== null) {
            return $this->memberStatusMap;
        }

        $this->memberStatusMap = MemberStatus::query()
            ->active()
            ->get(['code', 'name'])
            ->flatMap(fn (MemberStatus $status) => [
                strtolower($status->code) => $status->code,
                strtolower($status->name) => $status->code,
            ])
            ->all();

        return $this->memberStatusMap;
    }

    private function normalizeDate($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            return Carbon::instance(ExcelDate::excelToDateTimeObject($value))->format('Y-m-d');
        }

        $value = trim((string) $value);

        foreach (['d/m/Y', 'Y-m-d', 'd-m-Y'] as $format) {
            try {
                return Carbon::createFromFormat($format, $value)->format('Y-m-d');
            } catch (\Throwable) {
                continue;
            }
        }

        try {
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    private function stringValue($value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim((string) $value);
        return $trimmed === '' ? null : $trimmed;
    }
}
