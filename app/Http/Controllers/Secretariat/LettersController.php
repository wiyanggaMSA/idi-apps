<?php

namespace App\Http\Controllers\Secretariat;

use App\Http\Controllers\Controller;
use App\Http\Requests\Secretariat\LetterDraftRequest;
use App\Http\Requests\Secretariat\LetterFinalizeRequest;
use App\Models\Letter;
use App\Models\LetterNumberingProfile;
use App\Models\LetterTemplate;
use App\Models\Member;
use App\Services\Secretariat\ArchiveService;
use App\Services\Secretariat\LetterDraftWorkflowService;
use App\Services\Secretariat\LetterFinalizeWorkflowService;
use App\Services\Secretariat\LetterNumberGeneratorService;
use App\Services\Secretariat\LetterPdfService;
use App\Services\Secretariat\LetterRenderDataService;
use App\Services\Secretariat\LetterWorkflowException;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\Process\Exception\ProcessTimedOutException;

class LettersController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $classification = $request->string('classification')->toString();
        $status = $request->string('status')->toString();
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $query = Letter::query()->with('template:id,name,classification')->withCount(['versions', 'documents'])->latest();

        if ($classification !== '') {
            $query->where('classification', $classification);
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        if ($dateFrom) {
            $query->whereDate('date', '>=', Carbon::parse($dateFrom));
        }

        if ($dateTo) {
            $query->whereDate('date', '<=', Carbon::parse($dateTo));
        }

        if ($search !== '') {
            $driver = DB::connection()->getDriverName();
            if (in_array($driver, ['mysql', 'mariadb'], true)) {
                $query->whereFullText(
                    ['content_plaintext', 'subject', 'recipient_text', 'cc_text', 'number'],
                    $search
                );
            } else {
                $query->where(function ($q) use ($search) {
                    $q->where('subject', 'like', "%{$search}%")
                        ->orWhere('recipient_text', 'like', "%{$search}%")
                        ->orWhere('cc_text', 'like', "%{$search}%")
                        ->orWhere('number', 'like', "%{$search}%")
                        ->orWhere('content_plaintext', 'like', "%{$search}%");
                });
            }
        }

        return Inertia::render('Secretariat/Letters/Index', [
            'letters' => $query->paginate(10)->withQueryString(),
            'templates' => LetterTemplate::query()
                ->where('is_active', true)
                ->get(['id', 'name', 'classification', 'numbering_profile_id', 'number_format', 'blocks_json']),
            'summary' => [
                'draft' => Letter::query()->where('status', 'draft')->count(),
                'finalized' => Letter::query()->where('status', 'finalized')->count(),
                'archived' => Letter::query()->where('status', 'archived')->count(),
            ],
            'filters' => [
                'search' => $search,
                'classification' => $classification,
                'status' => $status,
                'date_from' => $dateFrom ?: null,
                'date_to' => $dateTo ?: null,
            ],
        ]);
    }

    public function dashboard(): Response
    {
        return Inertia::render('Secretariat/Dashboard', [
            'summary' => [
                'draft' => Letter::query()->where('status', 'draft')->count(),
                'finalized' => Letter::query()->where('status', 'finalized')->count(),
                'archived' => Letter::query()->where('status', 'archived')->count(),
                'templates' => LetterTemplate::query()->where('is_active', true)->count(),
            ],
            'latestLetters' => Letter::query()
                ->with('template:id,name')
                ->latest()
                ->limit(6)
                ->get(['id', 'template_id', 'number', 'subject', 'date', 'status', 'created_at']),
            'upcomingAgenda' => \App\Models\Agenda::query()
                ->where('status', 'planned')
                ->where('start_at', '>=', now()->subDay())
                ->orderBy('start_at')
                ->limit(5)
                ->get(['id', 'title', 'start_at', 'location', 'status']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Secretariat/Letters/Builder', [
            'templates' => $this->builderTemplates(),
            'numberingProfiles' => $this->builderNumberingProfiles(),
            'signerMembers' => $this->signerMembersOptions(),
            'placeholders' => [
                'org.name',
                'org.address',
                'letter.number',
                'letter.date',
                'letter.subject',
                'letter.signer_name',
                'letter.signer_title',
                'letter.cc',
                'recipient.name',
                'qr',
            ],
        ]);
    }

    public function edit(Letter $letter): Response
    {
        return Inertia::render('Secretariat/Letters/Builder', [
            'letter' => $letter->load('template:id,name,classification,numbering_profile_id,number_format,number_reset_policy,last_number,blocks_json,layout_json,content_text,signer_name,signer_title,signers_json,qr_enabled'),
            'templates' => $this->builderTemplates(),
            'numberingProfiles' => $this->builderNumberingProfiles(),
            'signerMembers' => $this->signerMembersOptions(),
            'placeholders' => [
                'org.name',
                'org.address',
                'letter.number',
                'letter.date',
                'letter.subject',
                'letter.signer_name',
                'letter.signer_title',
                'letter.cc',
                'recipient.name',
                'qr',
            ],
        ]);
    }

    public function show(Letter $letter): Response
    {
        $letter->load([
            'template:id,name,classification,number_format',
            'documents' => fn ($query) => $query->latest(),
            'latestSignature',
        ])->loadCount(['versions', 'documents']);

        return Inertia::render('Secretariat/Letters/Show', [
            'letter' => $this->serializeLetter($letter),
        ]);
    }

    public function builder(Letter $letter): Response
    {
        return Inertia::render('Secretariat/Letters/GridBuilder', [
            'letter' => $letter,
            'signerMembers' => $this->signerMembersOptions(),
            'numberingProfiles' => LetterNumberingProfile::query()->where('is_active', true)->get(),
        ]);
    }

    public function storeDraft(LetterDraftRequest $request, LetterDraftWorkflowService $draftWorkflow): RedirectResponse
    {
        $startedAt = microtime(true);
        $letter = $draftWorkflow->createFromRequest($request, $request->user()->id);
        app(ArchiveService::class)->attachUploads($letter, $request->file('attachments', []), $request->user()->id, [
            'category' => 'lampiran-surat',
            'source' => 'letter_attachment',
        ]);
        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);
        $this->logDraftMetric('letters.draft.store', [
            'letter_id' => $letter->id,
            'user_id' => $request->user()->id,
            'duration_ms' => $durationMs,
            'blocks_count' => is_array($request->input('blocks')) ? count($request->input('blocks')) : 0,
            'layout_count' => is_array($request->input('layout')) ? count($request->input('layout')) : 0,
        ]);

        return redirect()->route('secretariat.letters.show', $letter)->with('success', 'Draft surat disimpan.');
    }

    public function updateDraft(
        LetterDraftRequest $request,
        Letter $letter,
        LetterDraftWorkflowService $draftWorkflow
    ): RedirectResponse {
        $startedAt = microtime(true);
        $draftWorkflow->updateFromRequest($request, $letter, $request->user()->id);
        app(ArchiveService::class)->attachUploads($letter, $request->file('attachments', []), $request->user()->id, [
            'category' => 'lampiran-surat',
            'source' => 'letter_attachment',
        ]);
        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);
        $this->logDraftMetric('letters.draft.update', [
            'letter_id' => $letter->id,
            'user_id' => $request->user()->id,
            'duration_ms' => $durationMs,
            'blocks_count' => is_array($request->input('blocks')) ? count($request->input('blocks')) : 0,
            'layout_count' => is_array($request->input('layout')) ? count($request->input('layout')) : 0,
        ]);

        return redirect()->route('secretariat.letters.show', $letter)->with('success', 'Draft surat diperbarui.');
    }

    public function saveLayout(Request $request, Letter $letter): RedirectResponse
    {
        $data = $request->validate([
            'layout' => ['required', 'array'],
            'blocks' => ['required', 'array'],
        ]);

        $letter->update([
            'layout_json' => $data['layout'],
            'blocks_json' => $data['blocks'],
            'updated_by' => $request->user()->id,
        ]);

        return redirect()->back()->with('success', 'Layout surat berhasil disimpan.');
    }

    public function finalize(
        LetterFinalizeRequest $request,
        Letter $letter,
        LetterFinalizeWorkflowService $finalizeWorkflow
    ): RedirectResponse {
        try {
            $result = $finalizeWorkflow->finalize($letter, $request->all(), $request->user()->id);
            $number = $result['number'];
            $version = $result['version'];
        } catch (LetterWorkflowException $e) {
            return redirect()->back()->withErrors([
                $e->field() => $e->getMessage(),
            ]);
        } catch (\Throwable $e) {
            report($e);

            return redirect()->back()->withErrors([
                'pdf' => $this->pdfGenerationErrorMessage($e),
            ]);
        }

        return redirect()
            ->route('secretariat.letters.show', ['letter' => $letter->id, 'v' => $version])
            ->with('success', "Surat berhasil difinalisasi dengan nomor {$number}.");
    }

    public function archive(Letter $letter, Request $request): RedirectResponse
    {
        abort_unless(in_array($letter->status, ['finalized', 'archived'], true), 422, 'Hanya surat final yang bisa diarsipkan.');

        $letter->update([
            'status' => 'archived',
            'archived_at' => now(),
            'updated_by' => $request->user()->id,
        ]);

        return redirect()->route('secretariat.letters.show', $letter)->with('success', 'Surat dipindahkan ke arsip.');
    }

    public function storeAttachments(Letter $letter, LetterDraftRequest $request, ArchiveService $archiveService): RedirectResponse
    {
        $archiveService->attachUploads($letter, $request->file('attachments', []), $request->user()->id, [
            'category' => 'lampiran-surat',
            'source' => 'letter_attachment',
        ]);

        return redirect()->back()->with('success', 'Lampiran berhasil diunggah.');
    }

    public function previewPdf(Request $request, Letter $letter, LetterPdfService $pdfService, LetterRenderDataService $renderDataService)
    {
        return $this->pdfResponse($request, $letter, $pdfService, $renderDataService, true);
    }

    public function versions(Letter $letter): Response
    {
        return Inertia::render('Secretariat/Letters/Versions', [
            'letter' => $letter,
            'versions' => $letter->versions()->latest()->get(),
        ]);
    }

    public function showHtml(Request $request, Letter $letter, LetterRenderDataService $renderDataService)
    {
        return $this->renderDocument($request, $letter, $renderDataService);
    }

    public function renderDocument(Request $request, Letter $letter, LetterRenderDataService $renderDataService)
    {
        $layout = $letter->layout_json ?? [];
        $blocks = $letter->blocks_json ?? [];

        if (empty($layout) || empty($blocks)) {
            abort(404);
        }

        return response()->view('letters.render', [
            'renderData' => $renderDataService->build($letter),
        ]);
    }

    public function downloadPdf(
        Request $request,
        Letter $letter,
        LetterPdfService $pdfService,
        LetterRenderDataService $renderDataService
    ) {
        return $this->pdfResponse($request, $letter, $pdfService, $renderDataService, false);
    }

    public function regeneratePdf(Letter $letter, LetterPdfService $pdfService, LetterRenderDataService $renderDataService): RedirectResponse
    {
        abort_unless(in_array($letter->status, ['finalized', 'archived'], true), 422, 'PDF hanya bisa dibuat untuk surat final.');
        abort_if(empty($letter->layout_json) || empty($letter->blocks_json), 404);

        $path = $letter->pdf_path ?: "letters/{$letter->id}/v".max(1, (int) $letter->versions()->max('version')).'.pdf';
        Storage::disk('public')->makeDirectory("letters/{$letter->id}");
        $renderData = $renderDataService->build($letter);
        $html = view('letters.render-mpdf', compact('renderData'))->render();
        $pdfService->generateFromHtml($html, storage_path('app/public/'.$path), $renderData);
        $letter->update(['pdf_path' => $path]);

        return redirect()->back()->with('success', 'PDF berhasil dibuat ulang.');
    }

    public function generateNumber(
        Request $request,
        Letter $letter,
        LetterNumberGeneratorService $numberGenerator
    ): JsonResponse {
        $data = $request->validate([
            'template_id' => ['nullable', 'integer', 'exists:letter_templates,id'],
            'date' => ['required', 'date'],
            'classification' => ['nullable', 'string', 'max:120'],
        ]);

        $template = LetterTemplate::query()->find($data['template_id'] ?? $letter->template_id);
        abort_unless($template, 422, 'Pilih template surat terlebih dahulu.');

        $date = Carbon::parse($data['date']);
        $number = $numberGenerator->preview($template, $date, $data['classification'] ?? $template->classification);

        return response()->json(['number' => $number]);
    }

    private function pdfResponse(
        Request $request,
        Letter $letter,
        LetterPdfService $pdfService,
        LetterRenderDataService $renderDataService,
        bool $inline
    ) {
        $version = $request->integer('v');
        $path = $letter->pdf_path;

        if ($version) {
            $path = $letter->versions()->where('version', $version)->value('pdf_path');
        }

        if ($path && Storage::disk('public')->exists($path)) {
            $size = (int) Storage::disk('public')->size($path);
            if ($size > 0) {
                $filename = $this->pdfFilename($letter);

                return $inline
                    ? response()->file(storage_path('app/public/'.$path), [
                        'Content-Type' => 'application/pdf',
                        'Content-Disposition' => 'inline; filename="'.$filename.'"',
                    ])
                    : response()->download(storage_path('app/public/'.$path), $filename);
            }
        }

        $layout = $letter->layout_json ?? [];
        $blocks = $letter->blocks_json ?? [];

        if (empty($layout) || empty($blocks)) {
            abort(404);
        }

        try {
            $renderData = $renderDataService->build($letter);
            $html = view('letters.render-mpdf', compact('renderData'))->render();
            $pdfContent = $pdfService->generateFromHtmlContent($html, $renderData);
        } catch (\Throwable $e) {
            report($e);
            abort(503, $this->pdfGenerationErrorMessage($e));
        }

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => ($inline ? 'inline' : 'attachment').'; filename="'.$this->pdfFilename($letter).'"',
        ]);
    }

    public function revoke(Letter $letter, Request $request): RedirectResponse
    {
        $letter->update([
            'is_revoked' => true,
            'updated_by' => $request->user()->id,
        ]);

        return redirect()->route('secretariat.letters.index')->with('success', 'Surat berhasil dicabut.');
    }

    private function pdfGenerationErrorMessage(\Throwable $e): string
    {
        $message = $e->getMessage();

        if ($e instanceof ProcessTimedOutException) {
            return 'PDF timeout. Jika memakai "php artisan serve", jalankan dengan worker > 1 (contoh: PHP_CLI_SERVER_WORKERS=4 php artisan serve) atau gunakan web server (Nginx/Apache).';
        }

        if (str_contains($message, 'temporary files directory') || str_contains($message, 'is not writable')) {
            return 'Gagal membuat PDF. Pastikan folder storage/framework dapat ditulis oleh aplikasi.';
        }

        if (str_contains($message, 'pcre.backtrack_limit')) {
            return 'Gagal membuat PDF. HTML surat terlalu besar untuk batas pcre.backtrack_limit server.';
        }

        return 'Gagal membuat PDF. Periksa format HTML surat dan konfigurasi mPDF pada server.';
    }

    private function signerMembersOptions()
    {
        return Member::query()
            ->select(['id', 'full_name', 'position_id'])
            ->with(['position:id,name'])
            ->orderBy('full_name')
            ->get()
            ->map(fn ($member) => [
                'id' => $member->id,
                'full_name' => $member->full_name,
                'position_name' => $member->position?->name,
            ])
            ->values();
    }

    private function logDraftMetric(string $event, array $context): void
    {
        if (app()->environment('testing')) {
            return;
        }

        Log::debug($event, $context);
    }

    private function builderTemplates()
    {
        return LetterTemplate::query()
            ->where('is_active', true)
            ->select([
                'id',
                'name',
                'classification',
                'numbering_profile_id',
                'number_format',
                'number_reset_policy',
                'last_number',
                'blocks_json',
                'layout_json',
                'content_text',
                'signer_name',
                'signer_title',
                'signers_json',
                'qr_enabled',
            ])
            ->orderBy('name')
            ->get();
    }

    private function builderNumberingProfiles()
    {
        return LetterNumberingProfile::query()
            ->where('is_active', true)
            ->select(['id', 'name'])
            ->orderBy('name')
            ->get();
    }

    private function serializeLetter(Letter $letter): array
    {
        return [
            ...$letter->toArray(),
            'preview_url' => route('secretariat.letters.pdf.preview', $letter),
            'download_url' => route('secretariat.letters.pdf', $letter),
            'verify_url' => $letter->public_hash ? route('letters.verify', $letter->public_hash) : null,
            'documents' => $letter->documents->map(fn ($document) => [
                'id' => $document->id,
                'title' => $document->title,
                'category' => $document->category,
                'document_number' => $document->document_number,
                'document_date' => optional($document->document_date)->toDateString(),
                'mime_type' => $document->mime_type,
                'size' => $document->size,
                'source' => $document->source,
                'original_name' => $document->original_name,
                'preview_url' => route('secretariat.documents.preview', $document),
                'download_url' => route('secretariat.documents.download', $document),
            ])->values(),
        ];
    }

    private function pdfFilename(Letter $letter): string
    {
        $number = preg_replace('/[^A-Za-z0-9\\-_]+/', '-', $letter->number ?: 'surat');

        return trim($number, '-').'.pdf';
    }
}
