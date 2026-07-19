<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_periods', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['draft', 'published', 'active', 'ended', 'archived'])->default('draft');
            $table->boolean('is_active')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->foreignId('ended_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // NULL values do not collide in a unique index. This generated
            // guard therefore allows unlimited historical/draft periods but
            // prevents more than one active period at database level.
            $table->unsignedTinyInteger('active_guard')
                ->nullable()
                ->storedAs("case when status = 'active' or is_active = 1 then 1 else null end");

            $table->unique('active_guard', 'organization_periods_one_active_unique');
            $table->index('status');
            $table->index('is_active');
            $table->index(['start_date', 'end_date']);
        });

        Schema::create('organization_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained('organization_periods')->restrictOnDelete();
            $table->foreignId('parent_id')->nullable();
            $table->foreignId('master_unit_id')->nullable()->constrained('divisions')->restrictOnDelete();
            $table->string('name');
            $table->string('code')->nullable();
            $table->string('unit_type', 50);
            $table->text('description')->nullable();
            $table->unsignedInteger('display_order')->default(0);
            $table->boolean('is_core_structure')->default(false);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['id', 'period_id'], 'organization_units_id_period_unique');
            $table->foreign(['parent_id', 'period_id'], 'organization_units_parent_period_foreign')
                ->references(['id', 'period_id'])
                ->on('organization_units')
                ->restrictOnDelete();
            $table->index(['period_id', 'parent_id', 'display_order'], 'organization_units_tree_order_index');
            $table->index(['period_id', 'unit_type'], 'organization_units_period_type_index');
            $table->index(['period_id', 'is_core_structure'], 'organization_units_period_core_index');
            $table->index(['period_id', 'is_active'], 'organization_units_period_active_index');
            $table->index('master_unit_id');
        });

        Schema::create('organization_unit_positions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained('organization_periods')->restrictOnDelete();
            $table->foreignId('organization_unit_id');
            $table->foreignId('position_id')->constrained('positions')->restrictOnDelete();
            $table->string('custom_title')->nullable();
            $table->unsignedInteger('display_order')->default(0);
            $table->boolean('is_required')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(
                ['id', 'organization_unit_id', 'period_id'],
                'organization_unit_positions_identity_unique'
            );
            $table->foreign(
                ['organization_unit_id', 'period_id'],
                'organization_unit_positions_unit_period_foreign'
            )
                ->references(['id', 'period_id'])
                ->on('organization_units')
                ->restrictOnDelete();
            $table->index(['period_id', 'organization_unit_id', 'display_order'], 'organization_unit_positions_order_index');
            $table->index(['organization_unit_id', 'is_active'], 'organization_unit_positions_active_index');
            $table->index('position_id');
        });

        Schema::create('organization_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained('organization_periods')->restrictOnDelete();
            $table->foreignId('organization_unit_id');
            $table->foreignId('unit_position_id');
            $table->foreignId('member_id')->constrained('members')->restrictOnDelete();
            $table->foreignId('portal_role_id')->nullable()->constrained('roles')->restrictOnDelete();
            $table->date('started_at');
            $table->date('ended_at')->nullable();
            $table->enum('status', ['draft', 'active', 'replaced', 'ended', 'cancelled'])->default('draft');
            $table->string('appointment_number')->nullable();
            $table->date('appointment_date')->nullable();
            $table->text('notes')->nullable();
            $table->text('end_reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('ended_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('replaced_by_assignment_id')
                ->nullable()
                ->unique()
                ->constrained('organization_assignments')
                ->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Draft and active rows both represent a currently occupied slot.
            // Replaced/ended/cancelled history receives NULL and may repeat.
            $table->unsignedTinyInteger('current_guard')
                ->nullable()
                ->storedAs("case when status in ('draft', 'active') then 1 else null end");

            $table->unique(
                ['period_id', 'member_id', 'current_guard'],
                'organization_assignments_member_current_unique'
            );
            $table->unique(
                ['period_id', 'unit_position_id', 'current_guard'],
                'organization_assignments_slot_current_unique'
            );
            $table->foreign(
                ['organization_unit_id', 'period_id'],
                'organization_assignments_unit_period_foreign'
            )
                ->references(['id', 'period_id'])
                ->on('organization_units')
                ->restrictOnDelete();
            $table->foreign(
                ['unit_position_id', 'organization_unit_id', 'period_id'],
                'organization_assignments_slot_unit_period_foreign'
            )
                ->references(['id', 'organization_unit_id', 'period_id'])
                ->on('organization_unit_positions')
                ->restrictOnDelete();
            $table->index(['period_id', 'status'], 'organization_assignments_period_status_index');
            $table->index(['organization_unit_id', 'status'], 'organization_assignments_unit_status_index');
            $table->index(['member_id', 'started_at'], 'organization_assignments_member_start_index');
            $table->index(['started_at', 'ended_at'], 'organization_assignments_date_range_index');
            $table->index('portal_role_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_assignments');
        Schema::dropIfExists('organization_unit_positions');
        Schema::dropIfExists('organization_units');
        Schema::dropIfExists('organization_periods');
    }
};
