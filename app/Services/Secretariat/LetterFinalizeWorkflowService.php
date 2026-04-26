<?php

namespace App\Services\Secretariat;

use App\Models\Letter;
use App\Models\LetterNumberingProfile;
use App\Models\LetterSignature;
use App\Models\LetterTemplate;
use App\Models\Member;
use App\Support\Secretariat\LetterSignerNormalizer;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LetterFinalizeWorkflowService
{
    public function __construct(
        private readonly LetterNumberService $numberService,
        private readonly LetterNumberGeneratorService $numberGenerator,
        private readonly LetterPlaintextService $plaintextService,
        private readonly LetterPdfService $pdfService,
        private readonly LetterVersionService $versionService,
        private readonly LetterRenderDataService $renderDataService,
        private readonly ArchiveService $archiveService
    ) {}

    public function finalize(Letter $letter, array $input, int $userId): array
    {
        $incomingLayout = $input['layout'] ?? null;
        $incomingBlocks = $input['blocks'] ?? null;
        if (is_array($incomingLayout) && ! empty($incomingLayout)) {
            $letter->layout_json = $incomingLayout;
        }
        if (is_array($incomingBlocks) && ! empty($incomingBlocks)) {
            $letter->blocks_json = $incomingBlocks;
        }

        $date = Carbon::parse($input['date']);
        $number = trim((string) ($input['number'] ?? ''));

        if (! $number) {
            $template = $this->resolveTemplate($letter, $input);
            if ($template) {
                $number = $this->numberGenerator->commit(
                    $template,
                    $date,
                    $input['classification'] ?? $template->classification,
                    $letter->id
                );
            } else {
                $profileId = $input['numbering_profile_id'] ?? null;
                $profile = $profileId ? LetterNumberingProfile::query()->find($profileId) : null;
                if ($profile) {
                    $number = $this->numberService->commitNextNumber($profile, $date, $input['classification'] ?? null);
                }
            }
        }

        if (! $number) {
            throw new LetterWorkflowException('number', 'Nomor surat wajib diisi atau pilih profil penomoran.');
        }
        $this->numberGenerator->assertUnique($number, $letter->id);

        $publicHash = $letter->public_hash ?: Str::uuid()->toString();
        $version = (int) $letter->versions()->max('version');
        $version += 1;

        $layout = is_array($letter->layout_json) ? $letter->layout_json : [];
        $gridBlocks = is_array($letter->blocks_json) ? $letter->blocks_json : [];
        $legacyBlocks = $input['content_blocks_json'] ?? ($letter->content_blocks_json ?? []);
        if (empty($legacyBlocks) && ! empty($gridBlocks)) {
            $legacyBlocks = $gridBlocks;
        }

        if (empty($layout) || empty($gridBlocks)) {
            throw new LetterWorkflowException(
                'layout',
                'Layout grid surat belum lengkap. Lengkapi komponen surat di Grid Builder sebelum finalisasi.'
            );
        }

        $plaintext = $this->plaintextService->extract(! empty($gridBlocks) ? $gridBlocks : $legacyBlocks);
        $path = "letters/{$letter->id}/v{$version}.pdf";
        $signers = LetterSignerNormalizer::normalize(
            $input['signers'] ?? $letter->signers_json,
            $input['signer_name'] ?? $letter->signer_name,
            $input['signer_title'] ?? $letter->signer_title
        );
        if ($signers === []) {
            throw new LetterWorkflowException('signers', 'Minimal satu penandatangan wajib diisi sebelum finalisasi.');
        }
        $primarySigner = LetterSignerNormalizer::first($signers);

        $letter->fill([
            'classification' => $input['classification'] ?? null,
            'number' => $number,
            'date' => $date,
            'subject' => $input['subject'] ?? '',
            'recipient_text' => $input['recipient_text'] ?? '',
            'cc_text' => $input['cc_text'] ?? null,
            'signer_name' => $primarySigner['name'],
            'signer_title' => $primarySigner['title'],
            'signers_json' => $signers,
            'content_blocks_json' => $legacyBlocks,
            'content_plaintext' => $plaintext,
            'layout_json' => $layout,
            'blocks_json' => $gridBlocks,
            'public_hash' => $publicHash,
            'qr_payload_json' => [
                'signers' => $signers,
                'generated_at' => now()->toISOString(),
            ],
            'is_revoked' => false,
            'updated_by' => $userId,
            'finalized_at' => now(),
        ]);
        $letter->save();
        $this->syncSignerSignatureRecords($letter, $signers);

        Storage::disk('public')->makeDirectory("letters/{$letter->id}");
        $html = view('letters.render', [
            'renderData' => $this->renderDataService->build($letter),
        ])->render();
        $this->pdfService->generateFromHtml($html, storage_path('app/public/'.$path));

        $letter->update([
            'pdf_path' => $path,
            'status' => 'finalized',
            'is_revoked' => false,
        ]);

        $this->versionService->createSnapshot($letter, $version, $userId);
        $this->archiveService->archiveFinalizedLetter($letter->refresh(), $userId);

        return [
            'number' => $number,
            'version' => $version,
        ];
    }

    private function resolveTemplate(Letter $letter, array $input): ?LetterTemplate
    {
        $templateId = $input['template_id'] ?? $letter->template_id;

        return $templateId ? LetterTemplate::query()->find($templateId) : null;
    }

    private function syncSignerSignatureRecords(Letter $letter, array $signers): void
    {
        $memberIds = collect($signers)
            ->pluck('member_id')
            ->filter()
            ->unique()
            ->values();

        if ($memberIds->isEmpty()) {
            return;
        }

        $members = Member::query()
            ->with('position:id,name')
            ->whereIn('id', $memberIds)
            ->get()
            ->keyBy('id');

        foreach ($signers as $signer) {
            $memberId = $signer['member_id'] ?? null;
            if (! $memberId || ! $members->has($memberId)) {
                continue;
            }

            $member = $members->get($memberId);
            $signature = LetterSignature::query()->firstOrNew([
                'letter_id' => $letter->id,
                'signer_member_id' => $member->id,
            ]);

            $signature->signer_name_snapshot = $signer['name'] ?: $member->full_name;
            $signature->signer_role_snapshot = $signer['title'] ?: $member->position?->name;
            $signature->verification_code = $signature->verification_code ?: Str::random(32);
            $signature->save();
        }
    }
}
