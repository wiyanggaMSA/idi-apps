<?php

namespace App\Http\Controllers;

use App\Models\Letter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PublicVerifyLetterController extends Controller
{
    public function show(Request $request, string $public_hash): Response
    {
        $letter = Letter::query()->where('public_hash', $public_hash)->firstOrFail();
        $version = $request->integer('v');

        $payload = [
            'status' => $letter->is_revoked ? 'REVOKED' : 'VALID',
            'signer_name' => $letter->signer_name,
            'number' => $letter->number,
            'date' => optional($letter->date)->toDateString(),
            'subject' => $letter->subject,
            'pdf_url' => $letter->pdf_path ? Storage::disk('public')->url($letter->pdf_path) : null,
            'version' => $version ?: ($letter->versions()->max('version') ?? 1),
        ];

        if ($version) {
            $versionData = $letter->versions()->where('version', $version)->first();
            if ($versionData) {
                $payload['number'] = $versionData->number;
                $payload['date'] = optional($versionData->date)->toDateString();
                $payload['subject'] = $versionData->subject;
                $payload['signer_name'] = $versionData->signer_name;
                $payload['pdf_url'] = $versionData->pdf_path ? Storage::disk('public')->url($versionData->pdf_path) : null;
                $payload['version'] = $versionData->version;
            }
        }

        return Inertia::render('Public/VerifyLetter', [
            'payload' => $payload,
        ]);
    }

    public function download(Request $request, string $public_hash)
    {
        $letter = Letter::query()->where('public_hash', $public_hash)->firstOrFail();
        $version = $request->integer('v');
        $path = $letter->pdf_path;

        if ($version) {
            $path = $letter->versions()->where('version', $version)->value('pdf_path');
        }

        if (!$path) {
            abort(404);
        }

        return Storage::disk('public')->download($path);
    }
}
