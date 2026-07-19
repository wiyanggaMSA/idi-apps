<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('work_program_progress_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_program_id')->constrained('work_programs')->cascadeOnDelete();
            $table->foreignId('work_program_task_id')->nullable()->constrained('work_program_tasks')->nullOnDelete();
            $table->unsignedTinyInteger('progress_before')->default(0);
            $table->unsignedTinyInteger('progress_after')->default(0);
            $table->string('status_before')->nullable();
            $table->string('status_after')->nullable();
            $table->date('planned_start_date')->nullable();
            $table->date('planned_end_date')->nullable();
            $table->date('actual_start_date')->nullable();
            $table->date('actual_end_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('updated_at_snapshot');
            $table->timestamps();

            $table->index('work_program_id');
            $table->index('work_program_task_id');
            $table->index('updated_by');
            $table->index('updated_at_snapshot');
        });

        Schema::table('work_program_risks', function (Blueprint $table) {
            $table->string('category')->nullable()->after('description');
            $table->unsignedTinyInteger('likelihood')->default(3)->after('category');
            $table->unsignedTinyInteger('impact')->default(3)->after('likelihood');
            $table->enum('level', ['low', 'medium', 'high', 'extreme'])->default('medium')->after('impact');
            $table->text('follow_up')->nullable()->after('mitigation_plan');
            $table->text('evidence_note')->nullable()->after('follow_up');

            $table->index('category');
            $table->index('level');
        });
    }

    public function down(): void
    {
        Schema::table('work_program_risks', function (Blueprint $table) {
            $table->dropIndex(['category']);
            $table->dropIndex(['level']);
            $table->dropColumn([
                'category',
                'likelihood',
                'impact',
                'level',
                'follow_up',
                'evidence_note',
            ]);
        });

        Schema::dropIfExists('work_program_progress_updates');
    }
};
