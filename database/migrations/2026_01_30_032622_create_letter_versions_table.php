<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('letter_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('letter_id')->constrained('letters')->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->string('number')->nullable();
            $table->date('date')->nullable();
            $table->string('subject');
            $table->text('recipient_text')->nullable();
            $table->text('cc_text')->nullable();
            $table->string('signer_name')->nullable();
            $table->string('signer_title')->nullable();
            $table->json('content_blocks_json')->nullable();
            $table->longText('content_plaintext')->nullable();
            $table->string('pdf_path')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['letter_id', 'version']);
            $table->fullText(['content_plaintext', 'subject', 'recipient_text', 'cc_text', 'number'], 'letter_versions_fulltext');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letter_versions');
    }
};
