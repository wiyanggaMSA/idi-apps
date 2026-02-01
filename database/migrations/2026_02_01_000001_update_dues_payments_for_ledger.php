<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('dues_payments', function (Blueprint $table) {
            $table->foreignId('dues_invoice_id')->nullable()->change();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('voided_at')->nullable();
            $table->text('void_reason')->nullable();
            $table->text('last_action_note')->nullable();

            $table->index('voided_at');
        });
    }

    public function down(): void
    {
        Schema::table('dues_payments', function (Blueprint $table) {
            $table->dropIndex(['voided_at']);
            $table->dropColumn(['voided_at', 'void_reason', 'last_action_note', 'updated_by']);
            $table->foreignId('dues_invoice_id')->nullable(false)->change();
        });
    }
};
