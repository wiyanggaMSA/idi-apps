<?php

namespace App\Http\Controllers\Secretariat;

use App\Http\Controllers\Controller;
use App\Http\Requests\Secretariat\LetterTemplateRequest;
use App\Models\LetterNumberingProfile;
use App\Models\LetterTemplate;
use App\Models\Member;
use App\Support\Secretariat\LetterSignerNormalizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class LetterTemplatesController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Secretariat/Templates/Index', [
            'templates' => LetterTemplate::query()
                ->latest()
                ->get()
                ->map(fn (LetterTemplate $template) => [
                    ...$template->toArray(),
                    'header_image_url' => $template->header_image_path ? Storage::url($template->header_image_path) : null,
                ]),
            'numberingProfiles' => LetterNumberingProfile::query()->where('is_active', true)->get(),
            'signerMembers' => $this->signerMembersOptions(),
            'placeholders' => $this->placeholders(),
        ]);
    }

    public function store(LetterTemplateRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $data['code'] = $data['code'] ?? Str::upper(Str::slug($data['name'], '_'));
        $data['created_by'] = $request->user()->id;
        $data['placeholders_schema_json'] = $data['placeholders_schema_json'] ?? $this->placeholders();
        $data['document_mode'] = $data['document_mode'] ?? 'flow';
        $data = $this->normalizeSigners($data);
        $data = $this->storeHeaderImage($request, $data);

        LetterTemplate::create($data);

        return redirect()->route('secretariat.templates.index')->with('success', 'Template disimpan.');
    }

    public function update(LetterTemplateRequest $request, LetterTemplate $template): RedirectResponse
    {
        $data = $request->validated();

        if (empty($data['code'])) {
            $data['code'] = $template->code;
        }
        $data['document_mode'] = $data['document_mode'] ?? 'flow';
        $data = $this->normalizeSigners($data);
        $data = $this->storeHeaderImage($request, $data, $template);

        $template->update($data);

        return redirect()->route('secretariat.templates.index')->with('success', 'Template diperbarui.');
    }

    public function builder(LetterTemplate $template): Response
    {
        return Inertia::render('Secretariat/Templates/Builder', [
            'template' => $template,
        ]);
    }

    public function saveLayout(Request $request, LetterTemplate $template): RedirectResponse
    {
        $data = $request->validate([
            'layout' => ['required', 'array'],
            'blocks' => ['required', 'array'],
            'settings' => ['nullable', 'array'],
            'settings.font_family' => ['nullable', 'string', 'max:120'],
            'settings.font_size' => ['nullable', 'numeric', 'min:10', 'max:20'],
            'settings.line_height' => ['nullable', 'numeric', 'min:1.1', 'max:2.2'],
            'settings.paragraph_spacing' => ['nullable', 'numeric', 'min:0', 'max:32'],
            'settings.repeat_header' => ['nullable', 'boolean'],
            'settings.signature_qr_position' => ['nullable', 'string', 'in:left,right'],
            'settings.header_height_px' => ['nullable', 'integer', 'min:80', 'max:260'],
            'settings.document_mode' => ['nullable', 'string', 'in:flow,grid'],
            'settings.margin_left_px' => ['nullable', 'integer', 'min:32', 'max:140'],
            'settings.margin_right_px' => ['nullable', 'integer', 'min:32', 'max:140'],
            'settings.margin_bottom_px' => ['nullable', 'integer', 'min:40', 'max:160'],
            'settings.content_top_gap_px' => ['nullable', 'integer', 'min:16', 'max:120'],
        ]);

        $styleSettings = [
            'font_family' => $data['settings']['font_family'] ?? 'Times New Roman',
            'font_size' => (float) ($data['settings']['font_size'] ?? 12),
            'line_height' => (float) ($data['settings']['line_height'] ?? 1.35),
            'paragraph_spacing' => (float) ($data['settings']['paragraph_spacing'] ?? 4),
            'repeat_header' => (bool) ($data['settings']['repeat_header'] ?? true),
            'signature_qr_position' => $data['settings']['signature_qr_position'] ?? 'right',
            'document_mode' => $data['settings']['document_mode'] ?? 'flow',
            'margin_left_px' => (int) ($data['settings']['margin_left_px'] ?? 64),
            'margin_right_px' => (int) ($data['settings']['margin_right_px'] ?? 64),
            'margin_bottom_px' => (int) ($data['settings']['margin_bottom_px'] ?? 72),
            'content_top_gap_px' => (int) ($data['settings']['content_top_gap_px'] ?? 54),
        ];

        $bodyText = null;
        foreach ($data['blocks'] as $block) {
            if (($block['type'] ?? null) === 'isi_surat') {
                $bodyText = $block['content'] ?? null;
                break;
            }
        }

        $template->update([
            'layout_json' => $data['layout'],
            'blocks_json' => $data['blocks'],
            'margin_json' => $styleSettings,
            'content_text' => $bodyText,
            'header_height_px' => (int) ($data['settings']['header_height_px'] ?? $template->header_height_px ?? 132),
            'document_mode' => $data['settings']['document_mode'] ?? $template->document_mode ?? 'flow',
        ]);

        return redirect()->back()->with('success', 'Layout template berhasil disimpan.');
    }

    public function destroy(LetterTemplate $template): RedirectResponse
    {
        $template->delete();

        return redirect()->route('secretariat.templates.index')->with('success', 'Template dihapus.');
    }

    private function placeholders(): array
    {
        return [
            '{nomor_surat}',
            '{tanggal_surat}',
            '{nama_penerima}',
            '{jabatan_penerima}',
            '{perihal}',
            '{isi_surat}',
            '{nama_penandatangan}',
            '{jabatan_penandatangan}',
        ];
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

    private function storeHeaderImage(LetterTemplateRequest $request, array $data, ?LetterTemplate $template = null): array
    {
        unset($data['header_image']);

        if (! $request->hasFile('header_image')) {
            return $data;
        }

        if ($template?->header_image_path) {
            Storage::disk('public')->delete($template->header_image_path);
        }

        $data['header_image_path'] = $request->file('header_image')->store('secretariat/templates/headers', 'public');

        return $data;
    }

    private function normalizeSigners(array $data): array
    {
        $signers = LetterSignerNormalizer::normalize(
            $data['signers'] ?? $data['signers_json'] ?? null,
            $data['signer_name'] ?? null,
            $data['signer_title'] ?? null,
            'right',
            (bool) ($data['qr_enabled'] ?? true)
        );

        $first = LetterSignerNormalizer::first($signers);

        $data['signers_json'] = $signers;
        $data['signer_name'] = $first['name'];
        $data['signer_title'] = $first['title'];

        unset($data['signers']);

        return $data;
    }
}
