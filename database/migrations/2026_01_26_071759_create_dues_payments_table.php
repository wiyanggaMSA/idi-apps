<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dues_payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('dues_invoice_id')->constrained('dues_invoices')->cascadeOnDelete();
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();

            $table->dateTime('paid_at');
            $table->unsignedBigInteger('amount');

            $table->string('method')->nullable(); // cash|transfer|ewallet|other (atau bebas)
            $table->string('reference_no')->nullable();
            $table->text('notes')->nullable();

            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();

            $table->timestamps();

            $table->index('created_by');
            $table->index('member_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dues_payments');
    }
};
