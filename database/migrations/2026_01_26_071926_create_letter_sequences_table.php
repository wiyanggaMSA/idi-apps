<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('letter_sequences', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('year');
            $table->string('type', 10)->nullable(); // in|out (optional)
            $table->string('prefix')->nullable();
            $table->unsignedInteger('current_number')->default(0);
            $table->timestamps();

            $table->unique(['year', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letter_sequences');
    }
};
