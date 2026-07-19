<?php

namespace Tests\Feature\WorkPrograms;

use App\Models\Division;
use App\Models\Member;
use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramRisk;
use App\Models\WorkProgramTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class WorkProgramMonitoringTest extends TestCase
{
    use RefreshDatabase;

    public function test_weighted_progress_uses_leaf_tasks_without_double_counting(): void
    {
        [$program, $user] = $this->programAndUser(['work_program.view_own_field']);
        $parent = WorkProgramTask::factory()->create([
            'work_program_id' => $program->id,
            'progress' => 10,
            'weight' => 100,
        ]);
        WorkProgramTask::factory()->create([
            'work_program_id' => $program->id,
            'parent_task_id' => $parent->id,
            'progress' => 20,
            'weight' => 1,
        ]);
        WorkProgramTask::factory()->create([
            'work_program_id' => $program->id,
            'parent_task_id' => $parent->id,
            'progress' => 100,
            'weight' => 3,
        ]);

        $this->actingAs($user)
            ->getJson(route('work-programs.monitoring', $program))
            ->assertOk()
            ->assertJsonPath('progress.value', 80)
            ->assertJsonPath('progress.formula', 'weighted_leaf_tasks')
            ->assertJsonPath('progress.leaf_task_count', 2)
            ->assertJsonPath('progress.total_task_count', 3);
    }

    public function test_average_progress_is_used_when_leaf_tasks_have_no_weight(): void
    {
        [$program, $user] = $this->programAndUser(['work_program.view_own_field']);
        WorkProgramTask::factory()->create(['work_program_id' => $program->id, 'progress' => 20, 'weight' => 0]);
        WorkProgramTask::factory()->create(['work_program_id' => $program->id, 'progress' => 100, 'weight' => 0]);

        $this->actingAs($user)
            ->getJson(route('work-programs.monitoring', $program))
            ->assertOk()
            ->assertJsonPath('progress.value', 60)
            ->assertJsonPath('progress.formula', 'average_leaf_tasks');
    }

    public function test_progress_update_history_is_stored(): void
    {
        [$program] = $this->programAndUser(['work_program.view_own_field']);
        $pic = $this->userWithPermissions(['work_program.update_progress']);
        $program->update(['status' => WorkProgram::STATUS_IN_PROGRESS]);
        $task = WorkProgramTask::factory()->create([
            'work_program_id' => $program->id,
            'pic_user_id' => $pic->id,
            'status' => WorkProgramTask::STATUS_IN_PROGRESS,
            'progress' => 10,
        ]);

        $this->actingAs($pic)
            ->patchJson(route('work-programs.tasks.progress', [$program, $task]), [
                'progress' => 45,
                'status' => WorkProgramTask::STATUS_IN_PROGRESS,
                'notes' => 'Update lapangan',
                'lock_version' => $task->lock_version,
            ])
            ->assertOk();

        $this->assertDatabaseHas('work_program_progress_updates', [
            'work_program_id' => $program->id,
            'work_program_task_id' => $task->id,
            'progress_before' => 10,
            'progress_after' => 45,
            'notes' => 'Update lapangan',
        ]);

        $this->actingAs($pic)
            ->getJson(route('work-programs.monitoring', $program))
            ->assertOk()
            ->assertJsonPath('progress_history.0.progress_before', 10)
            ->assertJsonPath('progress_history.0.progress_after', 45);
    }

    public function test_overdue_blocked_and_approaching_deadline_are_detected(): void
    {
        [$program, $user] = $this->programAndUser(['work_program.view_own_field']);
        WorkProgramTask::factory()->create([
            'work_program_id' => $program->id,
            'planned_start_date' => now()->subDays(5)->format('Y-m-d'),
            'planned_end_date' => now()->subDays(2)->format('Y-m-d'),
            'status' => WorkProgramTask::STATUS_IN_PROGRESS,
        ]);
        WorkProgramTask::factory()->create([
            'work_program_id' => $program->id,
            'planned_start_date' => now()->format('Y-m-d'),
            'planned_end_date' => now()->addDays(3)->format('Y-m-d'),
            'status' => WorkProgramTask::STATUS_TODO,
        ]);
        WorkProgramTask::factory()->create([
            'work_program_id' => $program->id,
            'status' => WorkProgramTask::STATUS_BLOCKED,
        ]);

        $this->actingAs($user)
            ->getJson(route('work-programs.monitoring', $program))
            ->assertOk()
            ->assertJsonPath('summary.overdue_tasks', 1)
            ->assertJsonPath('summary.approaching_deadline_tasks', 1)
            ->assertJsonPath('summary.blocked_tasks', 1)
            ->assertJsonCount(1, 'overdue_tasks')
            ->assertJsonCount(1, 'blocked_tasks');
    }

    public function test_risk_register_calculates_level_and_can_be_updated(): void
    {
        [$program, $user] = $this->programAndUser(['work_program.view_own_field', 'work_program.manage_tasks']);
        $task = WorkProgramTask::factory()->create(['work_program_id' => $program->id]);

        $response = $this->actingAs($user)
            ->postJson(route('work-programs.risks.store', $program), [
                'work_program_task_id' => $task->id,
                'type' => WorkProgramRisk::TYPE_RISK,
                'title' => 'Vendor belum pasti',
                'category' => 'Vendor',
                'likelihood' => 5,
                'impact' => 4,
                'status' => 'open',
                'mitigation_plan' => 'Siapkan vendor cadangan',
                'follow_up' => 'Kontak vendor kedua',
                'owner_user_id' => $user->id,
                'due_date' => now()->addWeek()->format('Y-m-d'),
            ])
            ->assertCreated()
            ->assertJsonPath('data.level', WorkProgramRisk::LEVEL_EXTREME);

        $riskId = $response->json('data.id');
        $this->assertDatabaseHas('work_program_risks', [
            'id' => $riskId,
            'level' => WorkProgramRisk::LEVEL_EXTREME,
            'severity' => 'critical',
        ]);

        $this->actingAs($user)
            ->patchJson(route('work-programs.risks.update', [$program, $riskId]), [
                'type' => WorkProgramRisk::TYPE_RISK,
                'title' => 'Vendor sudah ada opsi',
                'category' => 'Vendor',
                'likelihood' => 2,
                'impact' => 2,
                'status' => 'mitigating',
                'mitigation_plan' => 'Konfirmasi vendor cadangan',
            ])
            ->assertOk()
            ->assertJsonPath('data.level', WorkProgramRisk::LEVEL_LOW);
    }

    public function test_monitoring_scope_access_is_enforced(): void
    {
        [$program] = $this->programAndUser(['work_program.view_own_field']);
        $otherDivision = Division::factory()->create();
        $otherUser = $this->userWithPermissions(['work_program.view_own_field'], $otherDivision);

        $this->actingAs($otherUser)
            ->getJson(route('work-programs.monitoring', $program))
            ->assertForbidden();
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
