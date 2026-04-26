<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('letter_templates', function (Blueprint $table) {
            if (! Schema::hasColumn('letter_templates', 'header_image_path')) {
                $table->string('header_image_path')->nullable()->after('paper');
            }
            if (! Schema::hasColumn('letter_templates', 'header_height_px')) {
                $table->unsignedSmallInteger('header_height_px')->default(132)->after('header_image_path');
            }
            if (! Schema::hasColumn('letter_templates', 'document_mode')) {
                $table->string('document_mode', 20)->default('flow')->after('header_height_px');
            }
        });
    }

    public function down(): void
    {
        Schema::table('letter_templates', function (Blueprint $table) {
            $table->dropColumn(['header_image_path', 'header_height_px', 'document_mode']);
        });
    }
};
