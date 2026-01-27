<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dues_invoices', function (Blueprint $table) {
            $table->id();

            $table->foreignId('dues_period_id')->constrained('dues_periods')->cascadeOnDelete();
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();

            $table->unsignedBigInteger('amount_due')->default(0);
            $table->unsignedBigInteger('amount_paid')->default(0);

            $table->foreignId('payment_status_id')->constrained('payment_statuses')->restrictOnDelete();

            $table->date('due_date')->nullable();
            $table->dateTime('paid_at')->nullable();

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['dues_period_id', 'member_id']);
            $table->index('member_id');
            $table->index('payment_status_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dues_invoices');
    }
};
