<?php

namespace App\Http\Controllers;

use App\Models\LetterSignature;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicLetterSignatureController extends Controller
{
    public function show(Request $request, LetterSignature $signature): Response
    {
        $code = $request->string('k')->toString();
        $isCodeValid = $code !== '' && hash_equals($signature->verification_code, $code);

        $status = 'INVALID';
        if ($isCodeValid) {
            $status = $signature->revoked_at ? 'REVOKED' : 'VALID';
        }

        $letter = $signature->letter;

        return Inertia::render('Public/VerifySignature', [
            'payload' => [
                'status' => $status,
                'signer_name' => $signature->signer_name_snapshot,
                'signer_role' => $signature->signer_role_snapshot,
                'number' => $letter?->number,
                'date' => optional($letter?->date)->toDateString(),
                'subject' => $letter?->subject,
                'signed_at' => optional($signature->signed_at)->toDateTimeString(),
            ],
        ]);
    }
}
