<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('dues_settings', function (Blueprint $table) {
            $table->string('dues_start_period', 7)->nullable()->after('dues_amount');
            $table->index('dues_start_period');
        });
    }

    public function down(): void
    {
        Schema::table('dues_settings', function (Blueprint $table) {
            $table->dropIndex(['dues_start_period']);
            $table->dropColumn('dues_start_period');
        });
    }
};
