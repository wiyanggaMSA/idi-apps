<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('member_import_rows', function (Blueprint $table) {
            $table->id();
            $table->uuid('batch_id');
            $table->unsignedInteger('row_number')->nullable();
            $table->string('npa')->nullable();
            $table->string('full_name')->nullable();
            $table->string('education')->nullable();
            $table->string('phone')->nullable();
            $table->string('gender', 10)->nullable();
            $table->string('birth_place')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('email')->nullable();
            $table->string('division_name')->nullable();
            $table->string('position_name')->nullable();
            $table->foreignId('division_id')->nullable()->constrained('divisions')->nullOnDelete();
            $table->foreignId('position_id')->nullable()->constrained('positions')->nullOnDelete();
            $table->date('join_date')->nullable();
            $table->string('status', 20)->nullable();
            $table->text('address')->nullable();
            $table->text('notes')->nullable();
            $table->json('conflict_type')->nullable();
            $table->json('conflict_member_ids')->nullable();
            $table->string('action')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign('batch_id')->references('id')->on('member_import_batches')->cascadeOnDelete();
            $table->index(['batch_id', 'row_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_import_rows');
    }
};
