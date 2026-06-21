<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Backup;
use App\Services\Settings\DatabaseBackupService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Throwable;

class BackupController extends Controller
{
    public function store(Request $request, DatabaseBackupService $service): RedirectResponse
    {
        try {
            $backup = $service->createFullBackup($request->user()->id);
        } catch (Throwable $exception) {
            return redirect()
                ->back()
                ->withErrors(['backup' => $exception->getMessage()]);
        }

        return redirect()
            ->back()
            ->with('success', "Backup full database berhasil dibuat: {$service->backupFileName($backup)}");
    }

    public function download(Backup $backup, DatabaseBackupService $service)
    {
        abort_unless(Storage::disk('local')->exists($backup->file_path), 404);

        return Storage::disk('local')->download(
            $backup->file_path,
            $service->backupFileName($backup),
            ['Content-Type' => 'application/zip'],
        );
    }

    public function restore(Request $request, DatabaseBackupService $service): RedirectResponse
    {
        $data = $request->validate([
            'backup_file' => ['required', 'file', 'mimes:zip', 'max:51200'],
            'confirmation' => ['required', 'in:RESTORE DATABASE'],
        ]);

        try {
            $summary = $service->restoreFromUpload($data['backup_file']);
        } catch (Throwable $exception) {
            return redirect()
                ->back()
                ->withErrors(['backup_file' => $exception->getMessage()]);
        }

        return redirect()
            ->route('settings.index')
            ->with('success', "Restore database berhasil. {$summary['tables']} tabel dipulihkan.");
    }
}
