<?php

namespace App\Services\Secretariat;

use App\Models\Letter;
use App\Models\LetterVersion;

class LetterVersionService
{
    public function createSnapshot(Letter $letter, int $version, int $userId): LetterVersion
    {
        return LetterVersion::create([
            'letter_id' => $letter->id,
            'version' => $version,
            'number' => $letter->number,
            'date' => $letter->date,
            'subject' => $letter->subject,
            'recipient_text' => $letter->recipient_text,
            'cc_text' => $letter->cc_text,
            'signer_name' => $letter->signer_name,
            'signer_title' => $letter->signer_title,
            'content_blocks_json' => $letter->content_blocks_json,
            'content_plaintext' => $letter->content_plaintext,
            'pdf_path' => $letter->pdf_path,
            'created_by' => $userId,
        ]);
    }
}
