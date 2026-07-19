<?php

namespace Tests\Feature\WorkPrograms;

use App\Models\Division;
use App\Models\Member;
use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramNotification;
use App\Services\WorkPrograms\WorkProgramNotificationService;
use App\Services\WorkPrograms\WorkProgramTaskService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class WorkProgramNotificationReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_submit_notifies_reviewer_once(): void
    {
        $division = Division::factory()->create();
        $submitter = $this->userWithPermissions(['work_program.view_own_field', 'work_program.submit'], $division);
        $reviewer = $this->userWithPermissions(['work_program.view', 'work_program.review']);
        $program = $this->completeDraftProgram($division, $submitter);

        $this->actingAs($submitter)
            ->post(route('work-programs.submit', $program))
            ->assertRedirect();

        $this->assertDatabaseHas('work_program_notifications', [
            'work_program_id' => $program->id,
            'recipient_user_id' => $reviewer->id,
            'type' => 'program_submitted',
        ]);

        app(WorkProgramNotificationService::class)->notifyWorkflow($program->fresh(), 'program_submitted', $submitter);

        $this->assertSame(1, WorkProgramNotification::query()
            ->where('work_program_id', $program->id)
            ->where('recipient_user_id', $reviewer->id)
            ->where('type', 'program_submitted')
            ->count());
    }

    public function test_task_assignment_notifies_pic_and_assignees_without_duplicates(): void
    {
        $division = Division::factory()->create();
        $actor = $this->userWithPermissions(['work_program.view', 'work_program.manage_tasks'], $division);
        $pic = User::factory()->create();
        $assignee = User::factory()->create();
        $program = WorkProgram::factory()->create([
            'division_id' => $division->id,
            'created_by' => $actor->id,
            'primary_pic_user_id' => $actor->id,
            'status' => WorkProgram::STATUS_APPROVED,
        ]);

        $task = app(WorkProgramTaskService::class)->create($program, [
            'name' => 'Koordinasi lintas bidang',
            'planned_start_date' => now()->format('Y-m-d'),
            'planned_end_date' => now()->addWeek()->format('Y-m-d'),
            'pic_user_id' => $pic->id,
            'assignee_user_ids' => [$assignee->id, $assignee->id],
        ], $actor);

        $this->assertDatabaseHas('work_program_notifications', [
            'work_program_id' => $program->id,
            'work_program_task_id' => $task->id,
            'recipient_user_id' => $pic->id,
            'type' => 'task_assigned',
        ]);
        $this->assertDatabaseHas('work_program_notifications', [
            'work_program_id' => $program->id,
            'work_program_task_id' => $task->id,
            'recipient_user_id' => $assignee->id,
            'type' => 'task_assigned',
        ]);

        app(WorkProgramNotificationService::class)->notifyTaskAssigned($task->fresh(['program', 'pic', 'assignees.user']), $actor);

        $this->assertSame(2, WorkProgramNotification::query()
            ->where('work_program_task_id', $task->id)
            ->where('type', 'task_assigned')
            ->count());
    }

    public function test_report_export_follows_active_status_filter(): void
    {
        $division = Division::factory()->create();
        $user = $this->userWithPermissions(['work_program.view', 'work_program.export'], $division);
        WorkProgram::factory()->create([
            'name' => 'Program Disetujui Filter',
            'division_id' => $division->id,
            'status' => WorkProgram::STATUS_APPROVED,
            'estimated_budget' => 1000000,
        ]);
        WorkProgram::factory()->create([
            'name' => 'Program Draft Tidak Masuk',
            'division_id' => $division->id,
            'status' => WorkProgram::STATUS_DRAFT,
            'estimated_budget' => 2000000,
        ]);

        $response = $this->actingAs($user)
            ->get(route('work-programs.report.export', [
                'format' => 'csv',
                'status' => WorkProgram::STATUS_APPROVED,
            ]))
            ->assertOk();

        $content = file_get_contents($response->baseResponse->getFile()->getPathname());
        $this->assertStringContainsString('Program Disetujui Filter', $content);
        $this->assertStringNotContainsString('Program Draft Tidak Masuk', $content);
    }

    public function test_report_export_respects_user_scope(): void
    {
        $ownDivision = Division::factory()->create();
        $otherDivision = Division::factory()->create();
        $user = $this->userWithPermissions(['work_program.view_own_field', 'work_program.export'], $ownDivision);

        WorkProgram::factory()->create([
            'name' => 'Program Bidang Sendiri',
            'division_id' => $ownDivision->id,
            'status' => WorkProgram::STATUS_APPROVED,
        ]);
        WorkProgram::factory()->create([
            'name' => 'Program Bidang Lain',
            'division_id' => $otherDivision->id,
            'status' => WorkProgram::STATUS_APPROVED,
        ]);

        $response = $this->actingAs($user)
            ->get(route('work-programs.report.export', ['format' => 'csv']))
            ->assertOk();

        $content = file_get_contents($response->baseResponse->getFile()->getPathname());
        $this->assertStringContainsString('Program Bidang Sendiri', $content);
        $this->assertStringNotContainsString('Program Bidang Lain', $content);
    }

    public function test_report_export_can_target_single_program(): void
    {
        $division = Division::factory()->create();
        $user = $this->userWithPermissions(['work_program.view', 'work_program.export'], $division);
        $selected = WorkProgram::factory()->create([
            'name' => 'Program Spesifik Export',
            'division_id' => $division->id,
            'status' => WorkProgram::STATUS_APPROVED,
        ]);
        WorkProgram::factory()->create([
            'name' => 'Program Lain Tidak Masuk',
            'division_id' => $division->id,
            'status' => WorkProgram::STATUS_APPROVED,
        ]);

        $response = $this->actingAs($user)
            ->get(route('work-programs.report.export', [
                'format' => 'csv',
                'program_id' => $selected->id,
            ]))
            ->assertOk();

        $content = file_get_contents($response->baseResponse->getFile()->getPathname());
        $this->assertStringContainsString('Program Spesifik Export', $content);
        $this->assertStringNotContainsString('Program Lain Tidak Masuk', $content);
    }

    public function test_report_export_requires_export_permission(): void
    {
        $user = $this->userWithPermissions(['work_program.view']);

        $this->actingAs($user)
            ->get(route('work-programs.report.export', ['format' => 'csv']))
            ->assertForbidden();
    }

    public function test_xlsx_export_returns_valid_download_response(): void
    {
        $division = Division::factory()->create();
        $user = $this->userWithPermissions(['work_program.view', 'work_program.export'], $division);
        WorkProgram::factory()->create([
            'name' => 'Program Export XLSX',
            'division_id' => $division->id,
            'status' => WorkProgram::STATUS_APPROVED,
        ]);

        $response = $this->actingAs($user)
            ->get(route('work-programs.report.export', ['format' => 'xlsx']))
            ->assertOk();

        $this->assertStringContainsString(
            '.xlsx',
            $response->headers->get('content-disposition')
        );
    }

    private function completeDraftProgram(Division $division, User $submitter): WorkProgram
    {
        return WorkProgram::factory()->create([
            'division_id' => $division->id,
            'created_by' => $submitter->id,
            'primary_pic_user_id' => $submitter->id,
            'objectives' => 'Meningkatkan capaian program.',
            'success_indicators' => 'Indikator terukur tersedia.',
            'status' => WorkProgram::STATUS_DRAFT,
        ]);
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
