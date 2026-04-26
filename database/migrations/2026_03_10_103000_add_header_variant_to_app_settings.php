<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('app_settings', 'org_unit')) {
                $table->string('org_unit', 150)->nullable()->after('org_name');
            }
            if (!Schema::hasColumn('app_settings', 'header_variant')) {
                $table->string('header_variant', 30)->default('logo_left')->after('logo_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            if (Schema::hasColumn('app_settings', 'org_unit')) {
                $table->dropColumn('org_unit');
            }
            if (Schema::hasColumn('app_settings', 'header_variant')) {
                $table->dropColumn('header_variant');
            }
        });
    }
};
