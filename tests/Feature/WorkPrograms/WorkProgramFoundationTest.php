<?php

namespace Tests\Feature\WorkPrograms;

use App\Models\Division;
use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramPeriod;
use App\Models\WorkProgramTask;
use App\Models\WorkProgramTaskDependency;
use App\Services\WorkPrograms\WorkProgramDependencyValidator;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class WorkProgramFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_work_program_foundation_tables_exist(): void
    {
        foreach ([
            'work_program_periods',
            'work_programs',
            'work_program_assignments',
            'work_program_collaborator_divisions',
            'work_program_tasks',
            'work_program_task_assignees',
            'work_program_task_dependencies',
            'work_program_approvals',
            'work_program_risks',
            'work_program_evaluations',
        ] as $table) {
            $this->assertTrue(Schema::hasTable($table), "Missing table {$table}");
        }

        $this->assertTrue(Schema::hasColumns('work_programs', [
            'uuid',
            'program_code',
            'work_program_period_id',
            'division_id',
            'status',
            'lock_version',
        ]));
        $this->assertTrue(Schema::hasColumns('work_program_tasks', [
            'work_program_id',
            'parent_task_id',
            'progress',
            'status',
            'lock_version',
        ]));
    }

    public function test_model_mapping_and_relations_work(): void
    {
        $user = User::factory()->create();
        $division = Division::factory()->create();
        $period = WorkProgramPeriod::factory()->create();
        $program = WorkProgram::factory()->create([
            'work_program_period_id' => $period->id,
            'division_id' => $division->id,
            'primary_pic_user_id' => $user->id,
        ]);
        $task = WorkProgramTask::factory()->create([
            'work_program_id' => $program->id,
            'pic_user_id' => $user->id,
        ]);

        $this->assertTrue($program->period->is($period));
        $this->assertTrue($program->division->is($division));
        $this->assertTrue($program->primaryPic->is($user));
        $this->assertTrue($program->tasks->first()->is($task));
        $this->assertTrue($task->program->is($program));
    }

    public function test_unique_program_code_constraint_is_active(): void
    {
        $program = WorkProgram::factory()->create(['program_code' => 'PROKER-UNIQUE']);

        $this->expectException(QueryException::class);

        WorkProgram::factory()->create([
            'program_code' => $program->program_code,
        ]);
    }

    public function test_foreign_key_constraint_is_active(): void
    {
        $period = WorkProgramPeriod::factory()->create();

        $this->expectException(QueryException::class);

        WorkProgram::factory()->create([
            'work_program_period_id' => $period->id,
            'division_id' => 999999,
        ]);
    }

    public function test_status_enum_and_domain_validation_are_active(): void
    {
        $this->assertContains(WorkProgram::STATUS_DRAFT, WorkProgram::STATUSES);
        $this->assertTrue((new WorkProgram(['status' => WorkProgram::STATUS_DRAFT]))->canTransitionTo(WorkProgram::STATUS_SUBMITTED));
        $this->assertFalse((new WorkProgram(['status' => WorkProgram::STATUS_DRAFT]))->canTransitionTo(WorkProgram::STATUS_APPROVED));

        $this->expectException(\InvalidArgumentException::class);

        WorkProgramTask::factory()->create([
            'progress' => 101,
        ]);
    }

    public function test_database_status_constraint_rejects_invalid_program_status(): void
    {
        $period = WorkProgramPeriod::factory()->create();
        $division = Division::factory()->create();

        $this->expectException(QueryException::class);

        DB::table('work_programs')->insert([
            'uuid' => fake()->uuid(),
            'program_code' => 'PROKER-BAD-STATUS',
            'name' => 'Program dengan status invalid',
            'work_program_period_id' => $period->id,
            'year' => 2026,
            'division_id' => $division->id,
            'nature' => WorkProgram::NATURE_ROUTINE,
            'source' => WorkProgram::SOURCE_FIELD_PROPOSAL,
            'status' => 'not_a_status',
            'priority' => WorkProgram::PRIORITY_MEDIUM,
            'estimated_budget' => 0,
            'realized_budget' => 0,
            'lock_version' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_dependency_validator_rejects_hierarchy_and_dependency_cycles(): void
    {
        $program = WorkProgram::factory()->create();
        $taskA = WorkProgramTask::factory()->create(['work_program_id' => $program->id, 'task_code' => 'A']);
        $taskB = WorkProgramTask::factory()->create([
            'work_program_id' => $program->id,
            'task_code' => 'B',
            'parent_task_id' => $taskA->id,
        ]);
        $taskC = WorkProgramTask::factory()->create(['work_program_id' => $program->id, 'task_code' => 'C']);
        $validator = new WorkProgramDependencyValidator;

        try {
            $validator->ensureNoHierarchyCycle($taskA, $taskB->id);
            $this->fail('Circular hierarchy was not rejected.');
        } catch (\InvalidArgumentException $exception) {
            $this->assertSame('Hierarchy task tidak boleh circular.', $exception->getMessage());
        }

        try {
            $validator->ensureNoDependencyCycle($program->id, $taskA->id, $taskB->id);
            WorkProgramTaskDependency::query()->create([
                'work_program_id' => $program->id,
                'predecessor_task_id' => $taskA->id,
                'successor_task_id' => $taskB->id,
                'type' => WorkProgramTaskDependency::TYPE_FINISH_TO_START,
            ]);
            $validator->ensureNoDependencyCycle($program->id, $taskB->id, $taskC->id);
            WorkProgramTaskDependency::query()->create([
                'work_program_id' => $program->id,
                'predecessor_task_id' => $taskB->id,
                'successor_task_id' => $taskC->id,
                'type' => WorkProgramTaskDependency::TYPE_FINISH_TO_START,
            ]);
            $validator->ensureNoDependencyCycle($program->id, $taskC->id, $taskA->id);
        } catch (\InvalidArgumentException $exception) {
            $this->assertSame('Dependency task tidak boleh circular.', $exception->getMessage());

            return;
        }

        $this->fail('Circular dependency was not rejected.');
    }

    public function test_permission_seed_creates_work_program_permissions_and_role_mapping(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $this->assertTrue(Permission::query()->where('name', 'work_program.view')->exists());
        $this->assertTrue(Permission::query()->where('name', 'work_program.manage_tasks')->exists());
        $this->assertTrue(Permission::query()->where('name', 'work_program.view_audit_log')->exists());

        $admin = Role::query()->where('name', 'admin')->firstOrFail();
        $ketua = Role::query()->where('name', 'ketua')->firstOrFail();
        $sekretaris = Role::query()->where('name', 'sekretaris')->firstOrFail();
        $anggota = Role::query()->where('name', 'anggota')->firstOrFail();

        $this->assertTrue($admin->hasPermissionTo('work_program.archive'));
        $this->assertTrue($ketua->hasPermissionTo('work_program.approve'));
        $this->assertTrue($sekretaris->hasPermissionTo('work_program.create'));
        $this->assertTrue($anggota->hasPermissionTo('work_program.update_progress'));
        $this->assertFalse($anggota->hasPermissionTo('work_program.approve'));
    }
}
