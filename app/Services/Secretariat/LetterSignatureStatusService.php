<?php

namespace App\Services\Secretariat;

use App\Models\Letter;
use App\Models\LetterSignature;
use App\Support\Secretariat\LetterSignerNormalizer;

class LetterSignatureStatusService
{
    public function summary(Letter $letter): array
    {
        $signatures = $letter->relationLoaded('signatures')
            ? $letter->signatures
            : $letter->signatures()->get();
        $currentSignerMemberIds = collect(LetterSignerNormalizer::normalize(
            $letter->signers_json,
            $letter->signer_name,
            $letter->signer_title
        ))
            ->pluck('member_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $required = $signatures
            ->filter(fn (LetterSignature $signature) => $signature->revoked_at === null)
            ->when($currentSignerMemberIds->isNotEmpty(), fn ($collection) => $collection
                ->filter(fn (LetterSignature $signature) => $currentSignerMemberIds->contains((int) $signature->signer_member_id)))
            ->values();
        $signed = $required->filter(fn (LetterSignature $signature) => $signature->signed_at !== null)->values();
        $pending = $required->filter(fn (LetterSignature $signature) => $signature->signed_at === null)->values();
        $orderedRequired = $currentSignerMemberIds->isEmpty()
            ? $required
            : $currentSignerMemberIds
                ->map(fn (int $memberId) => $required->firstWhere('signer_member_id', $memberId))
                ->filter()
                ->values();

        $total = $required->count();
        $signedCount = $signed->count();
        $isComplete = $total > 0 && $pending->isEmpty();

        return [
            'status' => $isComplete ? 'SIGNED_COMPLETE' : ($total > 0 ? 'PENDING_SIGNATURES' : 'NO_SIGNATURE_REQUESTS'),
            'is_complete' => $isComplete,
            'required_count' => $total,
            'signed_count' => $signedCount,
            'pending_count' => $pending->count(),
            'verified_at' => $isComplete ? optional($signed->max('signed_at'))->toISOString() : null,
            'signers' => $orderedRequired
                ->map(fn (LetterSignature $signature) => [
                    'id' => $signature->id,
                    'name' => $signature->signer_name_snapshot,
                    'role' => $signature->signer_role_snapshot,
                    'status' => $signature->signed_at ? 'signed' : 'pending',
                    'signed_at' => optional($signature->signed_at)->toDateTimeString(),
                ])
                ->values()
                ->all(),
            'pending_signers' => $pending
                ->map(fn (LetterSignature $signature) => [
                    'id' => $signature->id,
                    'name' => $signature->signer_name_snapshot,
                    'role' => $signature->signer_role_snapshot,
                ])
                ->values()
                ->all(),
            'signed_signers' => $signed
                ->map(fn (LetterSignature $signature) => [
                    'id' => $signature->id,
                    'name' => $signature->signer_name_snapshot,
                    'role' => $signature->signer_role_snapshot,
                    'signed_at' => optional($signature->signed_at)->toDateTimeString(),
                ])
                ->values()
                ->all(),
        ];
    }

    public function refreshLetterPayload(Letter $letter): void
    {
        $summary = $this->summary($letter);
        $payload = is_array($letter->qr_payload_json) ? $letter->qr_payload_json : [];

        $letter->forceFill([
            'qr_payload_json' => [
                ...$payload,
                'signature_verification' => $summary,
                'signature_metadata_generated_at' => $summary['is_complete'] ? now()->toISOString() : null,
            ],
        ])->save();
    }
}
