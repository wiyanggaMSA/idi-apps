<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('letters', function (Blueprint $table) {
            $table->id();

            $table->string('type', 10);   // in|out
            $table->string('status', 20); // draft|sent|received|archived

            $table->string('letter_no')->nullable();
            $table->string('subject');
            $table->date('letter_date')->nullable();
            $table->date('received_date')->nullable();

            $table->string('sender_name')->nullable();
            $table->text('sender_address')->nullable();
            $table->string('recipient_name')->nullable();
            $table->text('recipient_address')->nullable();

            $table->foreignId('template_id')->nullable()->constrained('letter_templates')->nullOnDelete();

            $table->longText('content')->nullable();
            $table->longText('meta')->nullable(); // JSON string

            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();

            $table->timestamps();

            $table->unique('letter_no'); // nomor surat unik (nullable OK)
            $table->index('type');
            $table->index('status');
            $table->index('letter_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letters');
    }
};
