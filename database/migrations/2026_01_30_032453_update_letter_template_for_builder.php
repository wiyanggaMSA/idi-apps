<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('letter_templates', function (Blueprint $table) {
            $table->string('classification')->nullable()->after('name');
            $table->foreignId('numbering_profile_id')
                ->nullable()
                ->after('classification')
                ->constrained('letter_numbering_profiles')
                ->nullOnDelete();
            $table->string('paper', 20)->default('A4')->after('numbering_profile_id');
            $table->json('margin_json')->nullable()->after('paper');
            $table->json('blocks_json')->nullable()->after('margin_json');
            $table->json('placeholders_schema_json')->nullable()->after('blocks_json');
            $table->foreignId('created_by')->nullable()->after('placeholders_schema_json')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('letter_templates', function (Blueprint $table) {
            $table->dropConstrainedForeignId('numbering_profile_id');
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn([
                'classification',
                'paper',
                'margin_json',
                'blocks_json',
                'placeholders_schema_json',
            ]);
        });
    }
};
