<?php

namespace Tests\Feature\WorkPrograms;

use App\Models\Division;
use App\Models\Member;
use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramTask;
use App\Models\WorkProgramTaskDependency;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class WorkProgramTaskDependencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_task_with_assignees(): void
    {
        [$program, $user] = $this->programAndUser(['work_program.view_own_field', 'work_program.manage_tasks']);
        $assignee = User::factory()->create();

        $response = $this->actingAs($user)->postJson(route('work-programs.tasks.store', $program), [
            'task_code' => 'T-001',
            'name' => 'Persiapan',
            'planned_start_date' => '2026-08-01',
            'planned_end_date' => '2026-08-05',
            'progress' => 10,
            'weight' => 25,
            'pic_user_id' => $user->id,
            'assignee_user_ids' => [$assignee->id],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Persiapan')
            ->assertJsonPath('data.assignees.0.id', $assignee->id);

        $this->assertDatabaseHas('work_program_tasks', [
            'work_program_id' => $program->id,
            'task_code' => 'T-001',
            'name' => 'Persiapan',
        ]);
    }

    public function test_nested_task_and_hierarchy_cycle_validation(): void
    {
        [$program, $user] = $this->programAndUser(['work_program.view_own_field', 'work_program.manage_tasks']);
        $parent = WorkProgramTask::factory()->create(['work_program_id' => $program->id, 'task_code' => 'P']);

        $childResponse = $this->actingAs($user)->postJson(route('work-programs.tasks.store', $program), [
            'parent_task_id' => $parent->id,
            'task_code' => 'C',
            'name' => 'Nested task',
        ]);

        $childResponse->assertCreated()->assertJsonPath('data.parent_task_id', $parent->id);
        $childId = $childResponse->json('data.id');

        $this->actingAs($user)
            ->patchJson(route('work-programs.tasks.update', [$program, $parent]), [
                'parent_task_id' => $childId,
                'lock_version' => $parent->fresh()->lock_version,
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Hierarchy task tidak boleh circular.');
    }

    public function test_milestone_must_have_same_start_and_end_date(): void
    {
        [$program, $user] = $this->programAndUser(['work_program.view_own_field', 'work_program.manage_tasks']);

        $this->actingAs($user)
            ->postJson(route('work-programs.tasks.store', $program), [
                'name' => 'Milestone selesai',
                'is_milestone' => true,
                'planned_start_date' => '2026-08-01',
                'planned_end_date' => '2026-08-01',
            ])
            ->assertCreated()
            ->assertJsonPath('data.is_milestone', true);

        $this->actingAs($user)
            ->postJson(route('work-programs.tasks.store', $program), [
                'name' => 'Milestone invalid',
                'is_milestone' => true,
                'planned_start_date' => '2026-08-01',
                'planned_end_date' => '2026-08-02',
            ])
            ->assertStatus(422);
    }

    public function test_update_schedule_and_bulk_schedule_update(): void
    {
        [$program, $user] = $this->programAndUser(['work_program.view_own_field', 'work_program.manage_tasks']);
        $taskA = WorkProgramTask::factory()->create(['work_program_id' => $program->id, 'task_code' => 'A']);
        $taskB = WorkProgramTask::factory()->create(['work_program_id' => $program->id, 'task_code' => 'B']);

        $this->actingAs($user)
            ->patchJson(route('work-programs.tasks.update', [$program, $taskA]), [
                'planned_start_date' => '2026-09-01',
                'planned_end_date' => '2026-09-07',
                'sort_order' => 2,
                'lock_version' => $taskA->fresh()->lock_version,
            ])
            ->assertOk()
            ->assertJsonPath('data.planned_start_date', '2026-09-01')
            ->assertJsonPath('data.lock_version', 1);

        $this->actingAs($user)
            ->patchJson(route('work-programs.tasks.bulk-schedule', $program), [
                'tasks' => [
                    [
                        'id' => $taskA->id,
                        'planned_start_date' => '2026-09-03',
                        'planned_end_date' => '2026-09-08',
                        'sort_order' => 3,
                        'lock_version' => 1,
                    ],
                    [
                        'id' => $taskB->id,
                        'planned_start_date' => '2026-09-09',
                        'planned_end_date' => '2026-09-10',
                        'sort_order' => 4,
                        'lock_version' => 0,
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->assertSame(3, $taskA->fresh()->sort_order);
        $this->assertSame(4, $taskB->fresh()->sort_order);
    }

    public function test_pic_can_update_progress_without_manage_tasks(): void
    {
        [$program, $manager] = $this->programAndUser(['work_program.view_own_field', 'work_program.manage_tasks']);
        $pic = $this->userWithPermissions(['work_program.update_progress']);
        $program->update(['status' => WorkProgram::STATUS_IN_PROGRESS]);
        $task = WorkProgramTask::factory()->create([
            'work_program_id' => $program->id,
            'pic_user_id' => $pic->id,
            'status' => WorkProgramTask::STATUS_IN_PROGRESS,
            'progress' => 20,
        ]);

        $this->actingAs($pic)
            ->patchJson(route('work-programs.tasks.progress', [$program, $task]), [
                'progress' => 100,
                'status' => WorkProgramTask::STATUS_COMPLETED,
                'actual_start_date' => '2026-08-01',
                'actual_end_date' => '2026-08-05',
                'lock_version' => $task->lock_version,
            ])
            ->assertOk()
            ->assertJsonPath('data.progress', 100)
            ->assertJsonPath('data.status', WorkProgramTask::STATUS_COMPLETED);

        $this->actingAs($manager)
            ->patchJson(route('work-programs.tasks.update', [$program, $task]), [
                'status' => WorkProgramTask::STATUS_COMPLETED,
                'progress' => 90,
                'lock_version' => $task->fresh()->lock_version,
            ])
            ->assertStatus(422);
    }

    public function test_dependency_all_types_and_invalid_dependencies(): void
    {
        [$program, $user] = $this->programAndUser(['work_program.view_own_field', 'work_program.manage_tasks']);
        $tasks = collect(range(1, 5))->map(fn ($i) => WorkProgramTask::factory()->create([
            'work_program_id' => $program->id,
            'task_code' => "D{$i}",
        ]))->values();

        foreach (WorkProgramTaskDependency::TYPES as $index => $type) {
            $this->actingAs($user)
                ->postJson(route('work-programs.dependencies.store', $program), [
                    'predecessor_task_id' => $tasks[$index]->id,
                    'successor_task_id' => $tasks[$index + 1]->id,
                    'type' => $type,
                    'lag_days' => $index,
                ])
                ->assertCreated()
                ->assertJsonPath('data.type', $type);
        }

        $this->actingAs($user)
            ->postJson(route('work-programs.dependencies.store', $program), [
                'predecessor_task_id' => $tasks[0]->id,
                'successor_task_id' => $tasks[0]->id,
                'type' => WorkProgramTaskDependency::TYPE_FINISH_TO_START,
            ])
            ->assertJsonValidationErrors(['successor_task_id']);

        $this->actingAs($user)
            ->postJson(route('work-programs.dependencies.store', $program), [
                'predecessor_task_id' => $tasks[4]->id,
                'successor_task_id' => $tasks[0]->id,
                'type' => WorkProgramTaskDependency::TYPE_FINISH_TO_START,
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Dependency task tidak boleh circular.');
    }

    public function test_unauthorized_access_is_rejected(): void
    {
        [$program] = $this->programAndUser(['work_program.view_own_field']);
        $task = WorkProgramTask::factory()->create(['work_program_id' => $program->id]);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson(route('work-programs.tasks.store', $program), ['name' => 'Nope'])
            ->assertForbidden();

        $this->actingAs($user)
            ->patchJson(route('work-programs.tasks.update', [$program, $task]), ['name' => 'Nope'])
            ->assertForbidden();
    }

    public function test_gantt_dataset_contains_program_tasks_and_dependencies(): void
    {
        [$program, $user] = $this->programAndUser(['work_program.view_own_field', 'work_program.manage_tasks']);
        $taskA = WorkProgramTask::factory()->create([
            'work_program_id' => $program->id,
            'task_code' => 'GA',
            'progress' => 50,
            'weight' => 1,
        ]);
        $taskB = WorkProgramTask::factory()->create([
            'work_program_id' => $program->id,
            'parent_task_id' => $taskA->id,
            'task_code' => 'GB',
            'progress' => 100,
            'weight' => 1,
        ]);
        WorkProgramTaskDependency::query()->create([
            'work_program_id' => $program->id,
            'predecessor_task_id' => $taskA->id,
            'successor_task_id' => $taskB->id,
            'type' => WorkProgramTaskDependency::TYPE_FINISH_TO_START,
        ]);

        $this->actingAs($user)
            ->getJson(route('work-programs.gantt', $program))
            ->assertOk()
            ->assertJsonPath('program.id', "program:{$program->id}")
            ->assertJsonPath('program.progress', 100)
            ->assertJsonCount(2, 'tasks')
            ->assertJsonPath('tasks.1.parent_id', "task:{$taskA->id}")
            ->assertJsonCount(1, 'dependencies')
            ->assertJsonPath('dependencies.0.source', "task:{$taskA->id}")
            ->assertJsonPath('dependencies.0.target', "task:{$taskB->id}");
    }

    /**
     * @return array{0:WorkProgram,1:User}
     */
    private function programAndUser(array $permissions): array
    {
        $division = Division::factory()->create();
        $user = $this->userWithPermissions($permissions, $division);
        $program = WorkProgram::factory()->create([
            'division_id' => $division->id,
            'created_by' => $user->id,
            'primary_pic_user_id' => $user->id,
            'status' => WorkProgram::STATUS_DRAFT,
        ]);

        return [$program, $user];
    }

    private function userWithPermissions(array $permissions, ?Division $division = null): User
    {
        $user = User::factory()->create();

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $user->givePermissionTo($permissions);

        if ($division) {
            Member::factory()->create([
                'user_id' => $user->id,
                'division_id' => $division->id,
            ]);
            $user->load('member');
        }

        return $user;
    }
}
