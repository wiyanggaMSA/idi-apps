<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('members', function (Blueprint $table) {
            $table->id();

            // future-proof (member tidak login sekarang)
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('npa')->unique();
            $table->string('full_name');
            $table->string('education')->nullable();
            $table->string('phone')->nullable();
            $table->string('gender', 10)->nullable();      // L/P atau M/F
            $table->string('birth_place')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('email')->nullable();

            $table->foreignId('division_id')->nullable()->constrained('divisions')->nullOnDelete();
            $table->foreignId('position_id')->nullable()->constrained('positions')->nullOnDelete();

            $table->date('join_date')->nullable();
            $table->string('status', 20)->default('active'); // active|inactive|leave|alumni

            $table->text('address')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index('email');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('members');
    }
};
