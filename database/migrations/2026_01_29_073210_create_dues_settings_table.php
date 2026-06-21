<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dues_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('dues_amount')->default(100000);
            $table->unsignedTinyInteger('due_day')->default(10);
            $table->unsignedTinyInteger('grace_days')->default(7);
            $table->boolean('auto_mark_arrears')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dues_settings');
    }
};
