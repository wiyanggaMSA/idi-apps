<?php

namespace App\Http\Controllers\Secretariat;

use App\Http\Controllers\Controller;
use App\Http\Requests\Secretariat\LetterDraftRequest;
use App\Http\Requests\Secretariat\LetterFinalizeRequest;
use App\Models\Letter;
use App\Models\AppSetting;
use App\Models\LetterNumberingProfile;
use App\Models\LetterTemplate;
use App\Services\Secretariat\LetterHtmlRenderer;
use App\Models\Member;
use App\Models\LetterSignature;
use App\Services\Secretariat\LetterNumberService;
use App\Services\Secretariat\LetterPlaintextService;
use App\Services\Secretariat\LetterPdfService;
use App\Services\Secretariat\LetterVersionService;
use App\Services\Secretariat\QrCodeService;

use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class LettersController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $classification = $request->string('classification')->toString();
        $status = $request->string('status')->toString();
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $query = Letter::query()->with('template')->withCount('versions')->latest();

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
                ->get(['id', 'name', 'classification', 'numbering_profile_id', 'blocks_json']),
            'filters' => [
                'search' => $search,
                'classification' => $classification,
                'status' => $status,
                'date_from' => $dateFrom?->toDateString(),
                'date_to' => $dateTo?->toDateString(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Secretariat/Letters/Builder', [
            'templates' => LetterTemplate::query()->where('is_active', true)->get(),
            'numberingProfiles' => LetterNumberingProfile::query()->where('is_active', true)->get(),
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
            'letter' => $letter->load('template'),
            'templates' => LetterTemplate::query()->where('is_active', true)->get(),
            'numberingProfiles' => LetterNumberingProfile::query()->where('is_active', true)->get(),
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

    public function builder(Letter $letter): Response
    {
        $signerMembers = Member::query()
            ->with('position')
            ->orderBy('full_name')
            ->get()
            ->map(fn ($member) => [
                'id' => $member->id,
                'full_name' => $member->full_name,
                'position_name' => $member->position?->name,
            ])
            ->values();
        return Inertia::render('Secretariat/Letters/GridBuilder', [
            'letter' => $letter,
            'signerMembers' => $signerMembers,
        ]);
    }

    public function storeDraft(LetterDraftRequest $request, LetterPlaintextService $plaintextService): RedirectResponse
    {
        $blocks = $request->input('content_blocks_json', []);
        $layout = $request->input('layout', []);
        $gridBlocks = $request->input('blocks', []);

        $letter = Letter::create([
            'type' => $request->input('type', 'out'),
            'template_id' => $request->input('template_id'),
            'classification' => $request->input('classification'),
            'number' => $request->input('number'),
            'date' => $request->input('date') ? Carbon::parse($request->input('date')) : null,
            'subject' => $request->input('subject') ?? '(Draft)',
            'recipient_text' => $request->input('recipient_text'),
            'attachments_meta_json' => $request->input('attachments_meta_json'),
            'cc_text' => $request->input('cc_text'),
            'signer_name' => $request->input('signer_name'),
            'signer_title' => $request->input('signer_title'),
            'stamp_enabled' => $request->boolean('stamp_enabled'),
            'stamp_image_path' => $request->input('stamp_image_path'),
            'content_blocks_json' => $blocks,
            'content_plaintext' => $plaintextService->extract($blocks),
            'layout_json' => $layout,
            'blocks_json' => $gridBlocks,
            'status' => 'DRAFT',
            'created_by' => $request->user()->id,
        ]);

        return redirect()->route('secretariat.letters.edit', $letter)->with('success', 'Draft surat disimpan.');
    }

    public function updateDraft(LetterDraftRequest $request, Letter $letter, LetterPlaintextService $plaintextService): RedirectResponse
    {
        $blocks = $request->input('content_blocks_json', []);

        $letter->update([
            'type' => $request->input('type', $letter->type),
            'template_id' => $request->input('template_id'),
            'classification' => $request->input('classification'),
            'number' => $request->input('number'),
            'date' => $request->input('date') ? Carbon::parse($request->input('date')) : null,
            'subject' => $request->input('subject') ?? '(Draft)',
            'recipient_text' => $request->input('recipient_text'),
            'attachments_meta_json' => $request->input('attachments_meta_json'),
            'cc_text' => $request->input('cc_text'),
            'signer_name' => $request->input('signer_name'),
            'signer_title' => $request->input('signer_title'),
            'stamp_enabled' => $request->boolean('stamp_enabled'),
            'stamp_image_path' => $request->input('stamp_image_path'),
            'content_blocks_json' => $blocks,
            'content_plaintext' => $plaintextService->extract($blocks),
            'updated_by' => $request->user()->id,
        ]);

        return redirect()->route('secretariat.letters.edit', $letter)->with('success', 'Draft surat diperbarui.');
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
        LetterNumberService $numberService,
        LetterPlaintextService $plaintextService,
        QrCodeService $qrCodeService,
        LetterHtmlRenderer $htmlRenderer,
        LetterPdfService $pdfService,
        LetterVersionService $versionService
    ): RedirectResponse {
        $date = Carbon::parse($request->input('date'));
        $number = $request->input('number');

        if (!$number) {
            $profileId = $request->input('numbering_profile_id');
            $profile = $profileId ? LetterNumberingProfile::find($profileId) : null;
            if ($profile) {
                $number = $numberService->commitNextNumber($profile, $date, $request->input('classification'));
            }
        }

        if (!$number) {
            return redirect()->back()->withErrors(['number' => 'Nomor surat wajib diisi atau pilih profil penomoran.']);
        }

        $publicHash = $letter->public_hash ?: Str::uuid()->toString();
        $version = (int) $letter->versions()->max('version');
        $version += 1;

        $blocks = $request->input('content_blocks_json', $letter->content_blocks_json ?? []);
        $plaintext = $plaintextService->extract($blocks);

        $verificationUrl = route('letters.verify', ['public_hash' => $publicHash, 'v' => $version]);
        $logoPath = public_path('images/idi-logo.png');
        $qrDataUri = $qrCodeService->generateQrWithCenterLogo(
            $verificationUrl,
            file_exists($logoPath) ? $logoPath : null
        );

        $placeholders = [
            'org.name' => config('app.name'),
            'org.address' => config('app.org_address', ''),
            'letter.number' => $number,
            'letter.date' => $date->format('d/m/Y'),
            'letter.subject' => $request->input('subject'),
            'letter.signer_name' => $request->input('signer_name'),
            'letter.signer_title' => $request->input('signer_title'),
            'letter.cc' => $request->input('cc_text'),
            'recipient.name' => $request->input('recipient_text'),
            'qr' => $qrDataUri,
        ];

        $margins = $letter->template?->margin_json ?? [
            'top_mm' => 20,
            'right_mm' => 20,
            'bottom_mm' => 20,
            'left_mm' => 20,
        ];

        $html = $htmlRenderer->render($blocks, $margins, $placeholders);

        $path = "letters/{$letter->id}/v{$version}.pdf";
        Storage::disk('public')->makeDirectory("letters/{$letter->id}");
        $pdfService->generateFromHtml($html, storage_path('app/public/' . $path));

        $letter->update([
            'classification' => $request->input('classification'),
            'number' => $number,
            'date' => $date,
            'subject' => $request->input('subject'),
            'recipient_text' => $request->input('recipient_text'),
            'cc_text' => $request->input('cc_text'),
            'signer_name' => $request->input('signer_name'),
            'signer_title' => $request->input('signer_title'),
            'content_blocks_json' => $blocks,
            'content_plaintext' => $plaintext,
            'public_hash' => $publicHash,
            'qr_payload_json' => [
                'signer_name' => $request->input('signer_name'),
                'generated_at' => now()->toISOString(),
            ],
            'pdf_path' => $path,
            'status' => 'ARCHIVED',
            'updated_by' => $request->user()->id,
        ]);

        $versionService->createSnapshot($letter, $version, $request->user()->id);

        return redirect()->route('secretariat.letters.edit', $letter)->with('success', 'Surat berhasil diarsipkan.');
    }

    public function versions(Letter $letter): Response
    {
        return Inertia::render('Secretariat/Letters/Versions', [
            'letter' => $letter,
            'versions' => $letter->versions()->latest()->get(),
        ]);
    }

    public function showHtml(
        Letter $letter,
        LetterHtmlRenderer $htmlRenderer,
        QrCodeService $qrCodeService
    ) {
        $version = (int) ($letter->versions()->max('version') ?? 1);
        $verificationUrl = $letter->public_hash
            ? route('letters.verify', ['public_hash' => $letter->public_hash, 'v' => $version])
            : null;
        $logoPath = public_path('images/idi-logo.png');
        $qrDataUri = $verificationUrl
            ? $qrCodeService->generateQrWithCenterLogo(
                $verificationUrl,
                file_exists($logoPath) ? $logoPath : null
            )
            : '';

        $placeholders = [
            'org.name' => config('app.name'),
            'org.address' => config('app.org_address', ''),
            'letter.number' => $letter->number,
            'letter.date' => optional($letter->date)->format('d/m/Y'),
            'letter.subject' => $letter->subject,
            'letter.signer_name' => $letter->signer_name,
            'letter.signer_title' => $letter->signer_title,
            'letter.cc' => $letter->cc_text,
            'recipient.name' => $letter->recipient_text,
            'qr' => $qrDataUri,
        ];

        $margins = $letter->template?->margin_json ?? [
            'top_mm' => 20,
            'right_mm' => 20,
            'bottom_mm' => 20,
            'left_mm' => 20,
        ];
        $blocks = $letter->content_blocks_json ?? [];
        $html = $htmlRenderer->render($blocks, $margins, $placeholders);

        return response($html)->header('Content-Type', 'text/html');
    }

    public function renderDocument(Request $request, Letter $letter, QrCodeService $qrCodeService)
    {
        $layout = $letter->layout_json ?? [];
        $blocks = $letter->blocks_json ?? [];

        if (empty($layout) || empty($blocks)) {
            abort(404);
        }

        $orgProfile = AppSetting::query()->first();
        $addressLines = $orgProfile?->address
            ? preg_split('/\\r\\n|\\r|\\n/', $orgProfile->address)
            : [];

        $organization = [
            'logo_url' => $orgProfile?->logo_path ? Storage::url($orgProfile->logo_path) : null,
            'org_name' => $orgProfile?->org_name ?? config('app.name'),
            'org_unit' => $orgProfile?->org_unit ?? null,
            'address_lines' => array_values(array_filter($addressLines)),
            'contacts' => [
                'tel' => $orgProfile?->phone,
                'email' => $orgProfile?->email,
                'website' => config('app.url'),
            ],
            'header_variant' => $orgProfile?->header_variant ?? 'classic_center',
        ];

        $signature = LetterSignature::query()
            ->where('letter_id', $letter->id)
            ->latest('updated_at')
            ->first();

        $signaturePayload = null;

        if ($signature) {
            $verificationUrl = route('letters.signature.verify', [
                'signature' => $signature->id,
                'k' => $signature->verification_code,
            ]);
            $logoPath = $orgProfile?->logo_path ? Storage::disk('public')->path($orgProfile->logo_path) : null;
            $qrDataUri = $qrCodeService->generateQrWithCenterLogo(
                $verificationUrl,
                $logoPath && file_exists($logoPath) ? $logoPath : null
            );

            $signaturePayload = [
                'signature_id' => $signature->id,
                'verification_url' => $verificationUrl,
                'qr_data_uri' => $qrDataUri,
                'org_logo_url' => $organization['logo_url'],
            ];
        }

        $renderData = [
            'blocks' => $blocks,
            'layout' => $layout,
            'gridConfig' => [
                'cols' => 12,
                'rowHeight' => 24,
            ],
            'data' => [
                'organization' => $organization,
                'signature' => $signaturePayload,
                'signer' => [
                    'name' => $signature?->signer_name_snapshot ?? $letter->signer_name,
                    'role' => $signature?->signer_role_snapshot ?? $letter->signer_title,
                ],
                'letter' => [
                    'number' => $letter->number ?? '',
                    'date' => optional($letter->date)->format('d/m/Y') ?? '',
                    'subject' => $letter->subject ?? '',
                ],
            ],
        ];

        return response()->view('letters.render', [
            'renderData' => $renderData,
        ]);
    }

    public function downloadPdf(Request $request, Letter $letter, LetterPdfService $pdfService)
    {
        $version = $request->integer('v');
        $path = $letter->pdf_path;

        if ($version) {
            $path = $letter->versions()->where('version', $version)->value('pdf_path');
        }

        if ($path) {
            return response()->download(storage_path('app/public/' . $path));
        }

        $layout = $letter->layout_json ?? [];
        $blocks = $letter->blocks_json ?? [];

        if (empty($layout) || empty($blocks)) {
            abort(404);
        }

       $renderUrl = URL::signedRoute('letters.render', ['letter' => $letter->id]);
        $pdfContent = $pdfService->generateFromUrl($renderUrl);

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename=\"surat-layout.pdf\"',
        ]);
    }

    public function revoke(Letter $letter, Request $request): RedirectResponse
    {
        $letter->update([
            'is_revoked' => true,
            'status' => 'REVOKED',
            'updated_by' => $request->user()->id,
        ]);

        return redirect()->route('secretariat.letters.index')->with('success', 'Surat berhasil dicabut.');
    }
}