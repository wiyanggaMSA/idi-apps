<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('letters', function (Blueprint $table) {
            if (! Schema::hasColumn('letters', 'signers_json')) {
                $table->json('signers_json')->nullable()->after('signer_title');
            }
        });

        Schema::table('letter_templates', function (Blueprint $table) {
            if (! Schema::hasColumn('letter_templates', 'signers_json')) {
                $table->json('signers_json')->nullable()->after('signer_title');
            }
        });

        Schema::table('letter_versions', function (Blueprint $table) {
            if (! Schema::hasColumn('letter_versions', 'signers_json')) {
                $table->json('signers_json')->nullable()->after('signer_title');
            }
        });
    }

    public function down(): void
    {
        Schema::table('letter_versions', function (Blueprint $table) {
            if (Schema::hasColumn('letter_versions', 'signers_json')) {
                $table->dropColumn('signers_json');
            }
        });

        Schema::table('letter_templates', function (Blueprint $table) {
            if (Schema::hasColumn('letter_templates', 'signers_json')) {
                $table->dropColumn('signers_json');
            }
        });

        Schema::table('letters', function (Blueprint $table) {
            if (Schema::hasColumn('letters', 'signers_json')) {
                $table->dropColumn('signers_json');
            }
        });
    }
};
