<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('work_program_evaluations', function (Blueprint $table) {
            $table->text('objective_achievement')->nullable()->after('result_summary');
            $table->text('target_vs_realization')->nullable()->after('indicator_result');
            $table->text('time_evaluation')->nullable()->after('target_vs_realization');
            $table->text('constraints')->nullable()->after('budget_result');
            $table->text('supporting_factors')->nullable()->after('constraints');
            $table->text('inhibiting_factors')->nullable()->after('supporting_factors');
            $table->text('follow_up')->nullable()->after('recommendations');
            $table->foreignId('report_document_id')->nullable()->after('follow_up')->constrained('documents')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('work_program_evaluations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('report_document_id');
            $table->dropColumn([
                'objective_achievement',
                'target_vs_realization',
                'time_evaluation',
                'constraints',
                'supporting_factors',
                'inhibiting_factors',
                'follow_up',
            ]);
        });
    }
};
