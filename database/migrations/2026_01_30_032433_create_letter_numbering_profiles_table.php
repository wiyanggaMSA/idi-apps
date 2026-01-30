<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('letter_numbering_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('pattern');
            $table->string('reset_policy', 20)->default('yearly');
            $table->string('prefix')->nullable();
            $table->string('suffix')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letter_numbering_profiles');
    }
};
