<?php

namespace App\Services\Settings;

use App\Models\Backup;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use ZipArchive;

class DatabaseBackupService
{
    public function createFullBackup(int $userId): Backup
    {
        if (! class_exists(ZipArchive::class)) {
            throw new RuntimeException('Ekstensi PHP ZipArchive belum aktif.');
        }

        Storage::disk('local')->makeDirectory('backups');

        $timestamp = now()->format('Ymd_His');
        $filename = "full_database_{$timestamp}.zip";
        $relativePath = "backups/{$filename}";
        $absolutePath = Storage::disk('local')->path($relativePath);

        $tables = $this->backupTables();
        $payloadTables = [];
        $manifestTables = [];

        foreach ($tables as $table) {
            $rows = DB::table($table)
                ->orderBy($this->firstColumn($table))
                ->get()
                ->map(fn ($row) => (array) $row)
                ->values()
                ->all();

            $payloadTables[$table] = $rows;
            $manifestTables[] = [
                'name' => $table,
                'rows' => count($rows),
            ];
        }

        $manifest = [
            'type' => 'idi-apps-full-database-backup',
            'version' => 2,
            'format' => 'sql',
            'generated_at' => now()->toIso8601String(),
            'connection' => DB::getDriverName(),
            'tables' => $manifestTables,
        ];

        $database = [
            'tables' => $payloadTables,
        ];

        $zip = new ZipArchive();
        if ($zip->open($absolutePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('File backup tidak bisa dibuat.');
        }

        $zip->addFromString('manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        $zip->addFromString('database.sql', $this->toSqlDump($payloadTables));
        $zip->addFromString('database.json', json_encode($database, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        $zip->close();

        return Backup::query()->create([
            'scope' => 'all',
            'file_path' => $relativePath,
            'created_by' => $userId,
            'created_at' => now(),
        ]);
    }

    public function restoreFromUpload(UploadedFile $file): array
    {
        if (! class_exists(ZipArchive::class)) {
            throw new RuntimeException('Ekstensi PHP ZipArchive belum aktif.');
        }

        $zip = new ZipArchive();
        if ($zip->open($file->getRealPath()) !== true) {
            throw new RuntimeException('File backup tidak bisa dibuka.');
        }

        $manifest = json_decode($zip->getFromName('manifest.json') ?: '', true);
        $sqlDump = $zip->getFromName('database.sql') ?: null;
        $database = json_decode($zip->getFromName('database.json') ?: '', true);
        $zip->close();

        if (($manifest['type'] ?? null) !== 'idi-apps-full-database-backup') {
            throw new RuntimeException('File ini bukan backup full database IDI Apps.');
        }

        if (is_string($sqlDump) && trim($sqlDump) !== '') {
            return $this->restoreSqlDump($manifest, $sqlDump);
        }

        if (! is_array($database['tables'] ?? null)) {
            throw new RuntimeException('Isi backup tidak valid.');
        }

        return $this->restoreJsonDump($manifest, $database['tables']);
    }

    public function backupFileName(Backup $backup): string
    {
        return basename($backup->file_path) ?: Str::afterLast($backup->file_path, '/');
    }

    private function restoreSqlDump(array $manifest, string $sqlDump): array
    {
        $manifestTables = collect($manifest['tables'] ?? [])
            ->pluck('name')
            ->filter(fn ($table) => is_string($table) && $table !== '')
            ->values()
            ->all();

        $tablesToRestore = array_values(array_intersect($this->existingTables($this->tableOrderForDelete($manifestTables)), $manifestTables));

        if (empty($tablesToRestore) || ! in_array('users', $manifestTables, true)) {
            throw new RuntimeException('Backup tidak memuat tabel inti aplikasi.');
        }

        $this->withoutForeignKeys(function () use ($sqlDump) {
            DB::unprepared($sqlDump);
        });

        return [
            'tables' => count($tablesToRestore),
            'rows' => collect($manifest['tables'] ?? [])->sum(fn ($table) => (int) ($table['rows'] ?? 0)),
            'generated_at' => $manifest['generated_at'] ?? null,
        ];
    }

    private function restoreJsonDump(array $manifest, array $backupTables): array
    {
        $knownTables = $this->existingTables($this->tableOrderForDelete(array_keys($backupTables)));
        $tablesToRestore = array_values(array_intersect($knownTables, array_keys($backupTables)));

        if (empty($tablesToRestore) || ! array_key_exists('users', $backupTables)) {
            throw new RuntimeException('Backup tidak memuat tabel inti aplikasi.');
        }

        $this->withoutForeignKeys(function () use ($tablesToRestore, $backupTables) {
            foreach ($tablesToRestore as $table) {
                DB::table($table)->truncate();
            }

            foreach ($this->tableOrderForInsert(array_keys($backupTables)) as $table) {
                if (! array_key_exists($table, $backupTables) || ! Schema::hasTable($table)) {
                    continue;
                }

                $columns = Schema::getColumnListing($table);
                $rows = collect($backupTables[$table])
                    ->map(fn ($row) => array_intersect_key((array) $row, array_flip($columns)))
                    ->values();

                foreach ($rows->chunk(250) as $chunk) {
                    if ($chunk->isNotEmpty()) {
                        DB::table($table)->insert($chunk->all());
                    }
                }
            }
        });

        return [
            'tables' => count($tablesToRestore),
            'rows' => collect($backupTables)->sum(fn ($rows) => is_array($rows) ? count($rows) : 0),
            'generated_at' => $manifest['generated_at'] ?? null,
        ];
    }

    private function toSqlDump(array $tables): string
    {
        $lines = [
            '-- IDI Apps full database backup',
            '-- Generated at: '.now()->toIso8601String(),
            '-- Connection: '.DB::getDriverName(),
            '',
        ];

        foreach ($this->tableOrderForDelete(array_keys($tables)) as $table) {
            if (array_key_exists($table, $tables)) {
                $lines[] = 'DELETE FROM '.$this->wrapTable($table).';';
            }
        }

        $lines[] = '';

        foreach ($this->tableOrderForInsert(array_keys($tables)) as $table) {
            if (! array_key_exists($table, $tables) || empty($tables[$table])) {
                continue;
            }

            $columns = Schema::getColumnListing($table);
            $wrappedColumns = implode(', ', array_map(fn ($column) => $this->wrapColumn($column), $columns));

            foreach ($tables[$table] as $row) {
                $values = array_map(fn ($column) => $this->toSqlValue($row[$column] ?? null), $columns);
                $lines[] = 'INSERT INTO '.$this->wrapTable($table).' ('.$wrappedColumns.') VALUES ('.implode(', ', $values).');';
            }

            $lines[] = '';
        }

        return implode("\n", $lines);
    }

    private function tableOrderForDelete(array $tables = []): array
    {
        $orderedTables = [
            'document_links',
            'letter_versions',
            'letters',
            'letter_sequences',
            'letter_numbering_profiles',
            'letter_templates',
            'agenda',
            'events',
            'member_import_rows',
            'member_import_batches',
            'financial_action_requests',
            'cash_transactions',
            'dues_payment_allocations',
            'dues_payments',
            'dues_invoices',
            'dues_periods',
            'documents',
            'backups',
            'activity_log',
            'members',
            'member_statuses',
            'positions',
            'divisions',
            'payment_statuses',
            'cash_methods',
            'cash_categories',
            'dues_settings',
            'app_settings',
            config('permission.table_names.model_has_permissions', 'model_has_permissions'),
            config('permission.table_names.model_has_roles', 'model_has_roles'),
            config('permission.table_names.role_has_permissions', 'role_has_permissions'),
            config('permission.table_names.roles', 'roles'),
            config('permission.table_names.permissions', 'permissions'),
            'sessions',
            'password_reset_tokens',
            'users',
        ];

        return $this->appendUnorderedTables($orderedTables, $tables);
    }

    private function tableOrderForInsert(array $tables = []): array
    {
        return array_reverse($this->tableOrderForDelete($tables));
    }

    private function backupTables(): array
    {
        return $this->existingTables($this->tableOrderForInsert($this->databaseTables()));
    }

    private function databaseTables(): array
    {
        return collect(Schema::getTableListing())
            ->map(fn ($table) => Str::afterLast($table, '.'))
            ->filter(fn ($table) => $table !== '' && ! str_starts_with($table, 'sqlite_'))
            ->unique()
            ->values()
            ->all();
    }

    private function existingTables(array $tables): array
    {
        return array_values(array_filter(array_unique($tables), fn ($table) => Schema::hasTable($table)));
    }

    private function firstColumn(string $table): string
    {
        return Schema::getColumnListing($table)[0] ?? 'id';
    }

    private function appendUnorderedTables(array $orderedTables, array $tables): array
    {
        $known = array_flip($orderedTables);
        $remaining = array_values(array_filter(array_unique($tables), fn ($table) => ! isset($known[$table])));
        sort($remaining);

        return array_values(array_filter(array_merge($remaining, $orderedTables)));
    }

    private function wrapTable(string $table): string
    {
        return DB::getQueryGrammar()->wrapTable($table);
    }

    private function wrapColumn(string $column): string
    {
        return DB::getQueryGrammar()->wrap($column);
    }

    private function toSqlValue(mixed $value): string
    {
        if ($value === null) {
            return 'NULL';
        }

        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        return DB::getPdo()->quote((string) $value);
    }

    private function withoutForeignKeys(callable $callback): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        }

        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF;');
        }

        try {
            $callback();
        } finally {
            if ($driver === 'mysql' || $driver === 'mariadb') {
                DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            }

            if ($driver === 'sqlite') {
                DB::statement('PRAGMA foreign_keys = ON;');
            }
        }
    }
}
