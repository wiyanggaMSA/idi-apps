<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dues_payment_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dues_payment_id')->constrained('dues_payments')->cascadeOnDelete();
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->string('period_ym', 7);
            $table->unsignedBigInteger('amount');
            $table->timestamps();

            $table->unique(['member_id', 'period_ym', 'dues_payment_id'], 'dues_allocations_unique');
            $table->index(['member_id', 'period_ym']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dues_payment_allocations');
    }
};
