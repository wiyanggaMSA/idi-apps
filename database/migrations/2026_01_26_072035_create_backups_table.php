<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('backups', function (Blueprint $table) {
            $table->id();

            $table->string('scope', 20); // members|finance|all
            $table->string('file_path');

            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();

            $table->timestamp('created_at')->useCurrent();

            $table->index('scope');
            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backups');
    }
};
