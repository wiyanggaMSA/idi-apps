<?php

namespace App\Http\Controllers\Secretariat;

use App\Http\Controllers\Controller;
use App\Http\Requests\Secretariat\ArchiveDocumentRequest;
use App\Models\Document;
use App\Services\Secretariat\ArchiveService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ArchiveController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $category = $request->string('category')->toString();
        $source = $request->string('source')->toString();

        $query = Document::query()
            ->with('uploader:id,name')
            ->withCount('links')
            ->latest();

        $query
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('title', 'like', "%{$search}%")
                    ->orWhere('document_number', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('original_name', 'like', "%{$search}%");
            }))
            ->when($category !== '', fn ($q) => $q->where('category', $category))
            ->when($source !== '', fn ($q) => $q->where('source', $source));

        return Inertia::render('Secretariat/Archive', [
            'documents' => $query->paginate(10)->withQueryString(),
            'filters' => [
                'search' => $search,
                'category' => $category,
                'source' => $source,
            ],
            'categories' => Document::query()->whereNotNull('category')->distinct()->orderBy('category')->pluck('category'),
        ]);
    }

    public function store(ArchiveDocumentRequest $request, ArchiveService $archiveService): RedirectResponse
    {
        $archiveService->attachUploads(new DocumentArchiveOwner, $request->file('attachments', []), $request->user()->id, [
            'title' => $request->string('title')->toString(),
            'category' => $request->input('category') ?: 'arsip',
            'document_number' => $request->input('document_number'),
            'document_date' => $request->input('document_date'),
            'description' => $request->input('description'),
            'source' => 'manual',
        ]);

        return redirect()->route('secretariat.archive.index')->with('success', 'Arsip berhasil diunggah.');
    }

    public function preview(Document $document): StreamedResponse
    {
        $this->ensureExists($document);

        return Storage::disk($document->disk ?: 'public')->response($document->file_path, $document->original_name, [
            'Content-Type' => $document->mime_type ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="'.($document->original_name ?: basename($document->file_path)).'"',
        ]);
    }

    public function download(Document $document): StreamedResponse
    {
        $this->ensureExists($document);

        return Storage::disk($document->disk ?: 'public')->download(
            $document->file_path,
            $document->original_name ?: basename($document->file_path)
        );
    }

    private function ensureExists(Document $document): void
    {
        abort_unless(Storage::disk($document->disk ?: 'public')->exists($document->file_path), 404);
    }
}

class DocumentArchiveOwner extends Document {}
