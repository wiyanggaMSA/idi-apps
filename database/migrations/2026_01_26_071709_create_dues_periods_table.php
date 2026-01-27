<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dues_periods', function (Blueprint $table) {
            $table->id();
            $table->string('period')->unique(); // YYYY-MM
            $table->string('name')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->date('due_date')->nullable();
            $table->unsignedBigInteger('default_amount')->default(0);
            $table->boolean('is_closed')->default(false);
            $table->timestamps();

            $table->index('is_closed');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dues_periods');
    }
};
