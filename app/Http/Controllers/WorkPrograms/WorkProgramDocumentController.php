<?php

namespace App\Http\Controllers\WorkPrograms;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkPrograms\StoreWorkProgramDocumentRequest;
use App\Models\Document;
use App\Models\DocumentLink;
use App\Models\WorkProgram;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WorkProgramDocumentController extends Controller
{
    public function index(WorkProgram $workProgram): JsonResponse
    {
        $this->authorize('view', $workProgram);

        return response()->json([
            'data' => $this->documents($workProgram),
        ]);
    }

    public function store(StoreWorkProgramDocumentRequest $request, WorkProgram $workProgram): JsonResponse
    {
        $this->authorize('uploadDocument', $workProgram);

        $file = $request->file('attachment');
        $path = $file->storeAs(
            "work-programs/{$workProgram->id}/documents",
            Str::uuid()->toString().'.'.strtolower($file->getClientOriginalExtension()),
            'local'
        );

        $document = Document::query()->create([
            'title' => $request->validated('title'),
            'category' => $request->validated('category'),
            'document_number' => $request->validated('document_number'),
            'document_date' => $request->validated('document_date'),
            'description' => $request->validated('description'),
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'source' => 'work_program',
            'disk' => 'local',
            'original_name' => $file->getClientOriginalName(),
            'uploaded_by' => $request->user()->id,
        ]);

        DocumentLink::query()->create([
            'document_id' => $document->id,
            'linkable_type' => WorkProgram::class,
            'linkable_id' => $workProgram->id,
        ]);

        activity('work_program')
            ->causedBy($request->user())
            ->performedOn($workProgram)
            ->withProperties(['document_id' => $document->id, 'category' => $document->category])
            ->log('work_program.document.uploaded');

        return response()->json(['data' => $this->serialize($document)], 201);
    }

    public function download(WorkProgram $workProgram, Document $document): StreamedResponse
    {
        $this->authorize('view', $workProgram);
        $this->ensureLinked($workProgram, $document);
        $this->ensureExists($document);

        return Storage::disk($document->disk ?: 'public')->download(
            $document->file_path,
            $this->safeFilename($document)
        );
    }

    public function preview(WorkProgram $workProgram, Document $document): StreamedResponse
    {
        $this->authorize('view', $workProgram);
        $this->ensureLinked($workProgram, $document);
        $this->ensureExists($document);

        return Storage::disk($document->disk ?: 'public')->response($document->file_path, $this->safeFilename($document), [
            'Content-Type' => $document->mime_type ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="'.$this->safeFilename($document).'"',
        ]);
    }

    public function destroy(WorkProgram $workProgram, Document $document): JsonResponse
    {
        $this->authorize('uploadDocument', $workProgram);
        $this->ensureLinked($workProgram, $document);

        DocumentLink::query()
            ->where('document_id', $document->id)
            ->where('linkable_type', WorkProgram::class)
            ->where('linkable_id', $workProgram->id)
            ->delete();

        activity('work_program')
            ->causedBy(request()->user())
            ->performedOn($workProgram)
            ->withProperties(['document_id' => $document->id])
            ->log('work_program.document.detached');

        return response()->json(['message' => 'Dokumen program kerja berhasil dilepas.']);
    }

    private function documents(WorkProgram $workProgram)
    {
        return Document::query()
            ->whereHas('links', fn ($query) => $query
                ->where('linkable_type', WorkProgram::class)
                ->where('linkable_id', $workProgram->id))
            ->latest()
            ->get()
            ->map(fn (Document $document) => $this->serialize($document))
            ->values();
    }

    private function serialize(Document $document): array
    {
        return [
            'id' => $document->id,
            'title' => $document->title,
            'category' => $document->category,
            'document_number' => $document->document_number,
            'document_date' => optional($document->document_date)->format('Y-m-d'),
            'mime_type' => $document->mime_type,
            'size' => $document->size,
            'description' => $document->description,
            'original_name' => $document->original_name,
            'preview_url' => route('work-programs.documents.preview', [$document->links()->where('linkable_type', WorkProgram::class)->value('linkable_id'), $document]),
            'download_url' => route('work-programs.documents.download', [$document->links()->where('linkable_type', WorkProgram::class)->value('linkable_id'), $document]),
            'created_at' => optional($document->created_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function ensureLinked(WorkProgram $workProgram, Document $document): void
    {
        abort_unless(DocumentLink::query()
            ->where('document_id', $document->id)
            ->where('linkable_type', WorkProgram::class)
            ->where('linkable_id', $workProgram->id)
            ->exists(), 404);
    }

    private function ensureExists(Document $document): void
    {
        abort_unless(Storage::disk($document->disk ?: 'public')->exists($document->file_path), 404);
    }

    private function safeFilename(Document $document): string
    {
        $name = $document->original_name ?: basename($document->file_path);

        return Str::of($name)
            ->basename()
            ->replaceMatches('/[^A-Za-z0-9._ -]/', '_')
            ->limit(180, '')
            ->toString() ?: 'document';
    }
}
