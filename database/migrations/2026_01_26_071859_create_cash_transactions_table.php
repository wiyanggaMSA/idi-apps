<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cash_transactions', function (Blueprint $table) {
            $table->id();

            $table->dateTime('tx_date');
            $table->string('type', 10); // in|out

            $table->foreignId('category_id')->constrained('cash_categories')->restrictOnDelete();
            $table->foreignId('method_id')->nullable()->constrained('cash_methods')->nullOnDelete();

            $table->unsignedBigInteger('amount');
            $table->text('description')->nullable();
            $table->string('reference_no')->nullable();

            $table->foreignId('member_id')->nullable()->constrained('members')->nullOnDelete();
            $table->foreignId('dues_payment_id')->nullable()->constrained('dues_payments')->nullOnDelete();
            $table->foreignId('attachment_document_id')->nullable()->constrained('documents')->nullOnDelete();

            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->dateTime('voided_at')->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index('tx_date');
            $table->index('type');
            $table->index('voided_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_transactions');
    }
};
