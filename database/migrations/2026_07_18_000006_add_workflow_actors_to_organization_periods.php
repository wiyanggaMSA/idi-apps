<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organization_periods', function (Blueprint $table) {
            $table->foreignId('published_by')->nullable()->after('published_at')->constrained('users')->nullOnDelete();
            $table->timestamp('activated_at')->nullable()->after('published_by');
            $table->foreignId('activated_by')->nullable()->after('activated_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('organization_periods', function (Blueprint $table) {
            $table->dropConstrainedForeignId('activated_by');
            $table->dropColumn('activated_at');
            $table->dropConstrainedForeignId('published_by');
        });
    }
};
