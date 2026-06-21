<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasColumn('dues_settings', 'allow_partial')) {
            Schema::table('dues_settings', function (Blueprint $table) {
                $table->dropColumn('allow_partial');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('dues_settings', 'allow_partial')) {
            Schema::table('dues_settings', function (Blueprint $table) {
                $table->boolean('allow_partial')->default(false)->after('auto_mark_arrears');
            });
        }
    }
};
