<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('document_links', function (Blueprint $table) {
            $table->id();

            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete();

            // polymorphic link: letters/events/cash_transactions/members/...
            $table->morphs('linkable'); // creates linkable_type + linkable_id + index

            $table->timestamps();

            $table->index('document_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_links');
    }
};
