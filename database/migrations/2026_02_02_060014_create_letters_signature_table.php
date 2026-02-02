<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('letter_signatures', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('letter_id')->constrained()->cascadeOnDelete();
            $table->foreignId('signer_member_id')->constrained('members')->cascadeOnDelete();
            $table->string('signer_name_snapshot');
            $table->string('signer_role_snapshot')->nullable();
            $table->string('verification_code');
            $table->timestamp('signed_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->unique(['letter_id', 'signer_member_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letter_signatures');
    }
};
