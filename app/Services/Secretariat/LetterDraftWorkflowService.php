<?php

namespace App\Services\Secretariat;

use App\Http\Requests\Secretariat\LetterDraftRequest;
use App\Models\Letter;
use App\Models\LetterTemplate;
use App\Support\Secretariat\LetterSignerNormalizer;
use Carbon\Carbon;

class LetterDraftWorkflowService
{
    public function __construct(private readonly LetterPlaintextService $plaintextService) {}

    public function createFromRequest(LetterDraftRequest $request, int $userId): Letter
    {
        [$layout, $gridBlocks, $legacyBlocks] = $this->resolveStructure(
            $request->input('template_id'),
            $request->input('layout', []),
            $request->input('blocks', []),
            $request->input('content_blocks_json', [])
        );

        $plaintextSource = ! empty($gridBlocks) ? $gridBlocks : $legacyBlocks;
        $signers = LetterSignerNormalizer::normalize(
            $request->input('signers'),
            $request->input('signer_name'),
            $request->input('signer_title')
        );
        $primarySigner = LetterSignerNormalizer::first($signers);

        return Letter::create([
            'type' => $request->input('type', 'out'),
            'template_id' => $request->input('template_id'),
            'classification' => $request->input('classification'),
            'number' => $request->input('number'),
            'date' => $request->input('date') ? Carbon::parse($request->input('date')) : null,
            'subject' => $request->input('subject') ?? '(Draft)',
            'recipient_text' => $request->input('recipient_text'),
            'attachments_meta_json' => $request->input('attachments_meta_json'),
            'cc_text' => $request->input('cc_text'),
            'signer_name' => $primarySigner['name'],
            'signer_title' => $primarySigner['title'],
            'signers_json' => $signers,
            'stamp_enabled' => $request->boolean('stamp_enabled'),
            'stamp_image_path' => $request->input('stamp_image_path'),
            'content_blocks_json' => $legacyBlocks,
            'content_plaintext' => $this->plaintextService->extract($plaintextSource),
            'layout_json' => $layout,
            'blocks_json' => $gridBlocks,
            'status' => 'draft',
            'created_by' => $userId,
        ]);
    }

    public function updateFromRequest(LetterDraftRequest $request, Letter $letter, int $userId): Letter
    {
        $legacyBlocks = $request->input('content_blocks_json', $letter->content_blocks_json ?? []);
        $gridBlocks = $request->input('blocks', $letter->blocks_json ?? []);
        $layout = $request->input('layout', $letter->layout_json ?? []);
        if (empty($legacyBlocks) && ! empty($gridBlocks)) {
            $legacyBlocks = $gridBlocks;
        }
        $plaintextSource = ! empty($gridBlocks) ? $gridBlocks : $legacyBlocks;
        $signers = LetterSignerNormalizer::normalize(
            $request->input('signers'),
            $request->input('signer_name'),
            $request->input('signer_title')
        );
        $primarySigner = LetterSignerNormalizer::first($signers);

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
            'signer_name' => $primarySigner['name'],
            'signer_title' => $primarySigner['title'],
            'signers_json' => $signers,
            'stamp_enabled' => $request->boolean('stamp_enabled'),
            'stamp_image_path' => $request->input('stamp_image_path'),
            'content_blocks_json' => $legacyBlocks,
            'content_plaintext' => $this->plaintextService->extract($plaintextSource),
            'layout_json' => $layout,
            'blocks_json' => $gridBlocks,
            'updated_by' => $userId,
        ]);

        return $letter->refresh();
    }

    private function resolveStructure(
        ?int $templateId,
        array $layout,
        array $gridBlocks,
        array $legacyBlocks
    ): array {
        $template = $templateId
            ? LetterTemplate::query()->find($templateId)
            : null;

        $templateLayout = is_array($template?->layout_json) ? $template->layout_json : [];
        $templateBlocks = is_array($template?->blocks_json) ? $template->blocks_json : [];

        if (empty($layout) && ! empty($templateLayout)) {
            $layout = $templateLayout;
        }
        if (empty($gridBlocks) && ! empty($templateBlocks)) {
            $gridBlocks = $templateBlocks;
        }
        if (empty($legacyBlocks) && ! empty($gridBlocks)) {
            $legacyBlocks = $gridBlocks;
        }

        return [$layout, $gridBlocks, $legacyBlocks];
    }
}
