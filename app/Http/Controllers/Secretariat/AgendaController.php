<?php

namespace App\Http\Controllers\Secretariat;

use App\Http\Controllers\Controller;
use App\Http\Requests\Secretariat\AgendaRequest;
use App\Models\Agenda;
use App\Services\Secretariat\ArchiveService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AgendaController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $status = $request->string('status')->toString();
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $query = Agenda::query()
            ->with(['documents' => fn ($documents) => $documents->latest()->limit(5)])
            ->withCount('documents')
            ->latest('start_at');

        $query
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('title', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhere('pic_name', 'like', "%{$search}%");
            }))
            ->when($status !== '', fn ($q) => $q->where('status', $status))
            ->when($dateFrom, fn ($q) => $q->whereDate('start_at', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->whereDate('start_at', '<=', $dateTo));

        return Inertia::render('Secretariat/Agenda/Index', [
            'agendas' => $query->paginate(10)->withQueryString()->through(fn (Agenda $agenda) => [
                'id' => $agenda->id,
                'title' => $agenda->title,
                'type' => $agenda->type,
                'status' => $agenda->status,
                'start_at' => optional($agenda->start_at)->toDateTimeString(),
                'end_at' => optional($agenda->end_at)->toDateTimeString(),
                'location' => $agenda->location,
                'pic_name' => $agenda->pic_name,
                'notes' => $agenda->notes,
                'documents_count' => $agenda->documents_count,
                'documents' => $agenda->documents->map(fn ($document) => [
                    'id' => $document->id,
                    'title' => $document->title,
                    'mime_type' => $document->mime_type,
                    'original_name' => $document->original_name,
                    'preview_url' => route('secretariat.documents.preview', $document),
                    'download_url' => route('secretariat.documents.download', $document),
                ])->values(),
            ]),
            'filters' => [
                'search' => $search,
                'status' => $status,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }

    public function store(AgendaRequest $request, ArchiveService $archiveService): RedirectResponse
    {
        $data = $request->safe()->except('attachments');

        $data['created_by'] = $request->user()->id;

        $agenda = Agenda::create($data);
        $archiveService->attachUploads($agenda, $request->file('attachments', []), $request->user()->id, [
            'category' => 'lampiran-agenda',
            'source' => 'agenda',
        ]);

        return redirect()->route('secretariat.agenda.index')->with('success', 'Agenda disimpan.');
    }

    public function update(AgendaRequest $request, Agenda $agenda, ArchiveService $archiveService): RedirectResponse
    {
        $data = $request->safe()->except('attachments');

        $agenda->update($data);
        $archiveService->attachUploads($agenda, $request->file('attachments', []), $request->user()->id, [
            'category' => 'lampiran-agenda',
            'source' => 'agenda',
        ]);

        return redirect()->route('secretariat.agenda.index')->with('success', 'Agenda diperbarui.');
    }

    public function destroy(Agenda $agenda): RedirectResponse
    {
        $agenda->delete();

        return redirect()->route('secretariat.agenda.index')->with('success', 'Agenda dihapus.');
    }
}
