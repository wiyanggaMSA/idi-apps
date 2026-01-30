<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('letter_sequences', function (Blueprint $table) {
            $table->foreignId('numbering_profile_id')
                ->nullable()
                ->after('id')
                ->constrained('letter_numbering_profiles')
                ->nullOnDelete();
            $table->unsignedInteger('month')->nullable()->after('year');
            $table->unsignedInteger('last_seq')->default(0)->after('month');
        });

        Schema::table('letter_sequences', function (Blueprint $table) {
            $table->unique(['numbering_profile_id', 'year', 'month'], 'letter_sequences_profile_year_month_unique');
        });
    }

    public function down(): void
    {
        Schema::table('letter_sequences', function (Blueprint $table) {
            $table->dropUnique('letter_sequences_profile_year_month_unique');
            $table->dropConstrainedForeignId('numbering_profile_id');
            $table->dropColumn(['month', 'last_seq']);
        });
    }
};
