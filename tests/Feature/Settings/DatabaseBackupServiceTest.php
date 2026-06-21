<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use App\Services\Settings\DatabaseBackupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

class DatabaseBackupServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_full_backup_zip_contains_sql_dump_for_all_database_tables(): void
    {
        if (! class_exists(ZipArchive::class)) {
            $this->markTestSkipped('ZipArchive extension is not available.');
        }

        Storage::fake('local');

        $user = User::factory()->create();

        $backup = app(DatabaseBackupService::class)->createFullBackup($user->id);

        Storage::disk('local')->assertExists($backup->file_path);

        $zip = new ZipArchive();
        $this->assertTrue($zip->open(Storage::disk('local')->path($backup->file_path)));

        $manifest = json_decode($zip->getFromName('manifest.json') ?: '', true);
        $sql = $zip->getFromName('database.sql');
        $json = $zip->getFromName('database.json');
        $zip->close();

        $this->assertSame('idi-apps-full-database-backup', $manifest['type'] ?? null);
        $this->assertSame('sql', $manifest['format'] ?? null);
        $this->assertIsString($sql);
        $this->assertStringContainsString('DELETE FROM "users";', $sql);
        $this->assertStringContainsString('INSERT INTO "users"', $sql);
        $this->assertIsString($json);
    }

    public function test_sql_backup_can_be_restored_from_uploaded_zip(): void
    {
        if (! class_exists(ZipArchive::class)) {
            $this->markTestSkipped('ZipArchive extension is not available.');
        }

        Storage::fake('local');

        $user = User::factory()->create(['email' => 'before@example.test']);
        $service = app(DatabaseBackupService::class);

        $backup = $service->createFullBackup($user->id);
        User::factory()->create(['email' => 'after@example.test']);

        $summary = $service->restoreFromUpload(new UploadedFile(
            Storage::disk('local')->path($backup->file_path),
            'backup.zip',
            'application/zip',
            null,
            true,
        ));

        $this->assertGreaterThan(0, $summary['tables']);
        $this->assertDatabaseHas('users', ['email' => 'before@example.test']);
        $this->assertDatabaseMissing('users', ['email' => 'after@example.test']);
    }
}
