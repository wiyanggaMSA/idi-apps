<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_program_periods', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->nullable()->unique();
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_active');
            $table->index(['start_date', 'end_date']);
        });

        Schema::create('work_programs', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('program_code')->unique();
            $table->string('name');
            $table->foreignId('work_program_period_id')->constrained('work_program_periods')->restrictOnDelete();
            $table->unsignedSmallInteger('year');
            $table->foreignId('division_id')->constrained('divisions')->restrictOnDelete();
            $table->string('category')->nullable();
            $table->string('type')->nullable();
            $table->enum('nature', ['routine', 'incidental', 'strategic', 'collaborative'])->default('routine');
            $table->enum('source', ['field_proposal', 'organizational_mandate', 'work_meeting_result', 'evaluation_follow_up'])->default('field_proposal');
            $table->enum('status', [
                'draft',
                'submitted',
                'under_review',
                'revision_requested',
                'approved',
                'rejected',
                'scheduled',
                'in_progress',
                'on_hold',
                'completed',
                'cancelled',
                'evaluated',
                'archived',
            ])->default('draft');
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->text('description')->nullable();
            $table->text('background')->nullable();
            $table->text('objectives')->nullable();
            $table->text('target_audience')->nullable();
            $table->text('success_indicators')->nullable();
            $table->text('expected_output')->nullable();
            $table->string('location')->nullable();
            $table->date('planned_start_date')->nullable();
            $table->date('planned_end_date')->nullable();
            $table->date('actual_start_date')->nullable();
            $table->date('actual_end_date')->nullable();
            $table->decimal('estimated_budget', 15, 2)->default(0);
            $table->decimal('realized_budget', 15, 2)->default(0);
            $table->string('budget_source')->nullable();
            $table->foreignId('primary_pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('evaluated_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->text('internal_notes')->nullable();
            $table->unsignedInteger('lock_version')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('year');
            $table->index('status');
            $table->index('priority');
            $table->index(['division_id', 'status']);
            $table->index(['year', 'division_id', 'status']);
        });

        Schema::create('work_program_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_program_id')->constrained('work_programs')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->enum('role', ['primary_pic', 'member', 'reviewer', 'observer'])->default('member');
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();

            $table->unique(['work_program_id', 'user_id', 'role'], 'work_program_assignments_unique');
            $table->index('user_id');
            $table->index('role');
        });

        Schema::create('work_program_collaborator_divisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_program_id')->constrained('work_programs')->cascadeOnDelete();
            $table->foreignId('division_id')->constrained('divisions')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['work_program_id', 'division_id'], 'work_program_collab_divisions_unique');
            $table->index('division_id');
        });

        Schema::create('work_program_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_program_id')->constrained('work_programs')->cascadeOnDelete();
            $table->foreignId('parent_task_id')->nullable()->constrained('work_program_tasks')->nullOnDelete();
            $table->string('task_code')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('name');
            $table->text('description')->nullable();
            $table->date('planned_start_date')->nullable();
            $table->date('planned_end_date')->nullable();
            $table->date('actual_start_date')->nullable();
            $table->date('actual_end_date')->nullable();
            $table->unsignedInteger('duration_days')->nullable();
            $table->unsignedTinyInteger('progress')->default(0);
            $table->decimal('weight', 8, 2)->default(0);
            $table->enum('status', ['todo', 'in_progress', 'blocked', 'completed', 'cancelled'])->default('todo');
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->boolean('is_milestone')->default(false);
            $table->foreignId('pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('estimated_cost', 15, 2)->default(0);
            $table->decimal('realized_cost', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->unsignedInteger('lock_version')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['work_program_id', 'task_code'], 'work_program_tasks_program_code_unique');
            $table->index('status');
            $table->index('pic_user_id');
            $table->index(['work_program_id', 'parent_task_id', 'sort_order'], 'work_program_tasks_tree_order_index');
        });

        Schema::create('work_program_task_assignees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_program_task_id')->constrained('work_program_tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('role')->nullable();
            $table->timestamps();

            $table->unique(['work_program_task_id', 'user_id'], 'work_program_task_assignees_unique');
            $table->index('user_id');
        });

        Schema::create('work_program_task_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_program_id')->constrained('work_programs')->cascadeOnDelete();
            $table->foreignId('predecessor_task_id')->constrained('work_program_tasks')->cascadeOnDelete();
            $table->foreignId('successor_task_id')->constrained('work_program_tasks')->cascadeOnDelete();
            $table->enum('type', ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'])->default('finish_to_start');
            $table->integer('lag_days')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['predecessor_task_id', 'successor_task_id', 'type'], 'work_program_task_dependencies_unique');
            $table->index('work_program_id');
            $table->index('predecessor_task_id');
            $table->index('successor_task_id');
        });

        Schema::create('work_program_budget_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_program_id')->constrained('work_programs')->cascadeOnDelete();
            $table->string('category')->nullable();
            $table->string('description');
            $table->unsignedInteger('quantity')->default(1);
            $table->string('unit')->nullable();
            $table->decimal('unit_cost', 15, 2)->default(0);
            $table->decimal('estimated_amount', 15, 2)->default(0);
            $table->decimal('realized_amount', 15, 2)->default(0);
            $table->string('budget_source')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('work_program_id');
            $table->index('category');
        });

        Schema::create('work_program_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_program_id')->constrained('work_programs')->cascadeOnDelete();
            $table->enum('action', [
                'created',
                'submitted',
                'withdrawn',
                'review_started',
                'revision_requested',
                'approved',
                'rejected',
                'scheduled',
                'started',
                'held',
                'resumed',
                'completed',
                'cancelled',
                'evaluated',
                'archived',
            ]);
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('acted_at');
            $table->timestamps();

            $table->index(['work_program_id', 'acted_at']);
            $table->index('actor_id');
            $table->index('action');
            $table->index('to_status');
        });

        Schema::create('work_program_risks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_program_id')->constrained('work_programs')->cascadeOnDelete();
            $table->foreignId('work_program_task_id')->nullable()->constrained('work_program_tasks')->nullOnDelete();
            $table->enum('type', ['risk', 'issue'])->default('risk');
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('status', ['open', 'mitigating', 'resolved', 'closed'])->default('open');
            $table->text('mitigation_plan')->nullable();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('due_date')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('work_program_id');
            $table->index('work_program_task_id');
            $table->index('severity');
            $table->index('status');
            $table->index('owner_user_id');
        });

        Schema::create('work_program_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_program_id')->unique()->constrained('work_programs')->cascadeOnDelete();
            $table->text('result_summary')->nullable();
            $table->text('indicator_result')->nullable();
            $table->text('budget_result')->nullable();
            $table->text('lessons_learned')->nullable();
            $table->text('recommendations')->nullable();
            $table->foreignId('evaluated_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('evaluated_at');
            $table->timestamps();

            $table->index('evaluated_by');
            $table->index('evaluated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_program_evaluations');
        Schema::dropIfExists('work_program_risks');
        Schema::dropIfExists('work_program_approvals');
        Schema::dropIfExists('work_program_budget_items');
        Schema::dropIfExists('work_program_task_dependencies');
        Schema::dropIfExists('work_program_task_assignees');
        Schema::dropIfExists('work_program_tasks');
        Schema::dropIfExists('work_program_collaborator_divisions');
        Schema::dropIfExists('work_program_assignments');
        Schema::dropIfExists('work_programs');
        Schema::dropIfExists('work_program_periods');
    }
};
