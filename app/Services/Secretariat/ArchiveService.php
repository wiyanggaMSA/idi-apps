<?php

namespace App\Services\Secretariat;

use App\Models\Document;
use App\Models\Letter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ArchiveService
{
    /**
     * @param  array<int, UploadedFile>  $files
     * @return array<int, Document>
     */
    public function attachUploads(Model $owner, array $files, int $userId, array $meta = []): array
    {
        $documents = [];

        foreach ($files as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $category = $meta['category'] ?? $this->defaultCategory($owner);
            $directory = $this->directory($owner, $category);
            $storedPath = $file->storeAs(
                $directory,
                Str::uuid()->toString().'.'.strtolower($file->getClientOriginalExtension()),
                'public'
            );

            $document = Document::create([
                'title' => $meta['title'] ?? pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
                'category' => $category,
                'document_number' => $meta['document_number'] ?? ($owner instanceof Letter ? $owner->number : null),
                'document_date' => $meta['document_date'] ?? ($owner instanceof Letter ? $owner->date : null),
                'file_path' => $storedPath,
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
                'description' => $meta['description'] ?? null,
                'source' => $meta['source'] ?? 'manual',
                'disk' => 'public',
                'original_name' => $file->getClientOriginalName(),
                'uploaded_by' => $userId,
            ]);

            if (method_exists($owner, 'documents')) {
                $owner->documents()->syncWithoutDetaching([$document->id]);
            }

            $documents[] = $document;
        }

        return $documents;
    }

    public function archiveFinalizedLetter(Letter $letter, int $userId): ?Document
    {
        if (! $letter->pdf_path || ! Storage::disk('public')->exists($letter->pdf_path)) {
            return null;
        }

        $existing = $letter->documents()
            ->where('source', 'letter_finalized')
            ->where('file_path', $letter->pdf_path)
            ->first();

        if ($existing) {
            return $existing;
        }

        $document = Document::create([
            'title' => $letter->subject ?: 'Surat Final',
            'category' => 'surat',
            'document_number' => $letter->number,
            'document_date' => $letter->date,
            'file_path' => $letter->pdf_path,
            'mime_type' => 'application/pdf',
            'size' => Storage::disk('public')->size($letter->pdf_path),
            'description' => 'Arsip otomatis dari surat yang sudah difinalisasi.',
            'source' => 'letter_finalized',
            'disk' => 'public',
            'original_name' => Str::slug($letter->number ?: 'surat').'.pdf',
            'uploaded_by' => $userId,
        ]);

        $letter->documents()->syncWithoutDetaching([$document->id]);

        return $document;
    }

    private function defaultCategory(Model $owner): string
    {
        return match (true) {
            $owner instanceof Letter => 'lampiran-surat',
            default => 'arsip',
        };
    }

    private function directory(Model $owner, string $category): string
    {
        if ($owner instanceof Letter) {
            return "secretariat/letters/{$owner->id}/attachments";
        }

        return 'secretariat/archive/'.Str::slug($category ?: 'manual');
    }
}
