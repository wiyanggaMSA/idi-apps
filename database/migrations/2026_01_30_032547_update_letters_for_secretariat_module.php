<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('letters', function (Blueprint $table) {
            $table->string('classification')->nullable()->after('template_id');
            $table->string('number')->nullable()->after('classification');
            $table->date('date')->nullable()->after('number');
            $table->text('recipient_text')->nullable()->after('subject');
            $table->json('attachments_meta_json')->nullable()->after('recipient_text');
            $table->text('cc_text')->nullable()->after('attachments_meta_json');
            $table->string('signer_name')->nullable()->after('cc_text');
            $table->string('signer_title')->nullable()->after('signer_name');
            $table->boolean('stamp_enabled')->default(false)->after('signer_title');
            $table->string('stamp_image_path')->nullable()->after('stamp_enabled');
            $table->json('content_blocks_json')->nullable()->after('stamp_image_path');
            $table->longText('content_plaintext')->nullable()->after('content_blocks_json');
            $table->string('public_hash')->nullable()->unique()->after('content_plaintext');
            $table->json('qr_payload_json')->nullable()->after('public_hash');
            $table->string('pdf_path')->nullable()->after('qr_payload_json');
            $table->boolean('is_revoked')->default(false)->after('pdf_path');
            $table->foreignId('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
        });

        Schema::table('letters', function (Blueprint $table) {
            $table->fullText(['content_plaintext', 'subject', 'recipient_text', 'cc_text', 'number'], 'letters_fulltext');
        });
    }

    public function down(): void
    {
        Schema::table('letters', function (Blueprint $table) {
            $table->dropFullText('letters_fulltext');
            $table->dropConstrainedForeignId('updated_by');
            $table->dropColumn([
                'classification',
                'number',
                'date',
                'recipient_text',
                'attachments_meta_json',
                'cc_text',
                'signer_name',
                'signer_title',
                'stamp_enabled',
                'stamp_image_path',
                'content_blocks_json',
                'content_plaintext',
                'public_hash',
                'qr_payload_json',
                'pdf_path',
                'is_revoked',
            ]);
        });
    }
};
