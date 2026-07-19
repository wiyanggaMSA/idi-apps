<?php

namespace Tests\Feature\WorkPrograms;

use App\Models\Division;
use App\Models\Member;
use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramApproval;
use App\Models\WorkProgramTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class WorkProgramWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_draft_can_be_submitted_and_withdrawn(): void
    {
        $division = Division::factory()->create();
        $submitter = $this->userWithPermissions([
            'work_program.view_own_field',
            'work_program.submit',
            'work_program.withdraw',
        ], $division);
        $program = $this->completeDraftProgram($division, $submitter);

        $this->actingAs($submitter)
            ->post(route('work-programs.submit', $program))
            ->assertRedirect();

        $program->refresh();
        $this->assertSame(WorkProgram::STATUS_SUBMITTED, $program->status);
        $this->assertSame($submitter->id, $program->submitted_by);
        $this->assertNotNull($program->submitted_at);

        $this->actingAs($submitter)
            ->post(route('work-programs.withdraw', $program), ['note' => 'Perlu koreksi'])
            ->assertRedirect();

        $program->refresh();
        $this->assertSame(WorkProgram::STATUS_DRAFT, $program->status);
        $this->assertNull($program->submitted_by);
        $this->assertDatabaseHas('work_program_approvals', [
            'work_program_id' => $program->id,
            'action' => WorkProgramApproval::ACTION_SUBMITTED,
            'from_status' => WorkProgram::STATUS_DRAFT,
            'to_status' => WorkProgram::STATUS_SUBMITTED,
        ]);
        $this->assertDatabaseHas('work_program_approvals', [
            'work_program_id' => $program->id,
            'action' => WorkProgramApproval::ACTION_WITHDRAWN,
            'from_status' => WorkProgram::STATUS_SUBMITTED,
            'to_status' => WorkProgram::STATUS_DRAFT,
        ]);
    }

    public function test_submitted_program_can_enter_review_and_request_revision_then_resubmit(): void
    {
        [$program, $submitter, $reviewer] = $this->submittedProgramWithReviewer();

        $this->actingAs($reviewer)
            ->post(route('work-programs.start-review', $program), ['note' => 'Mulai review'])
            ->assertRedirect();

        $program->refresh();
        $this->assertSame(WorkProgram::STATUS_UNDER_REVIEW, $program->status);

        $this->actingAs($reviewer)
            ->post(route('work-programs.request-revision', $program), ['note' => 'Lengkapi indikator'])
            ->assertRedirect();

        $program->refresh();
        $this->assertSame(WorkProgram::STATUS_REVISION_REQUESTED, $program->status);

        $this->actingAs($submitter)
            ->post(route('work-programs.submit', $program))
            ->assertRedirect();

        $program->refresh();
        $this->assertSame(WorkProgram::STATUS_SUBMITTED, $program->status);
        $this->assertSame(4, $program->approvals()->count());
        $this->assertDatabaseHas('work_program_approvals', [
            'work_program_id' => $program->id,
            'action' => WorkProgramApproval::ACTION_REVISION_REQUESTED,
            'note' => 'Lengkapi indikator',
        ]);
    }

    public function test_under_review_program_can_be_approved(): void
    {
        [$program, , $reviewer] = $this->underReviewProgram();

        $this->actingAs($reviewer)
            ->post(route('work-programs.approve', $program), ['note' => 'Disetujui'])
            ->assertRedirect();

        $program->refresh();
        $this->assertSame(WorkProgram::STATUS_APPROVED, $program->status);
        $this->assertSame($reviewer->id, $program->approved_by);
        $this->assertNotNull($program->approved_at);
        $this->assertDatabaseHas('work_program_approvals', [
            'work_program_id' => $program->id,
            'action' => WorkProgramApproval::ACTION_APPROVED,
            'from_status' => WorkProgram::STATUS_UNDER_REVIEW,
            'to_status' => WorkProgram::STATUS_APPROVED,
            'note' => 'Disetujui',
        ]);
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'work_program',
            'description' => 'work_program.approved',
            'subject_id' => $program->id,
        ]);
    }

    public function test_under_review_program_can_be_rejected_with_reason(): void
    {
        [$program, , $reviewer] = $this->underReviewProgram();

        $this->actingAs($reviewer)
            ->post(route('work-programs.reject', $program), ['note' => 'Tidak sesuai prioritas'])
            ->assertRedirect();

        $program->refresh();
        $this->assertSame(WorkProgram::STATUS_REJECTED, $program->status);
        $this->assertSame($reviewer->id, $program->rejected_by);
        $this->assertDatabaseHas('work_program_approvals', [
            'work_program_id' => $program->id,
            'action' => WorkProgramApproval::ACTION_REJECTED,
            'note' => 'Tidak sesuai prioritas',
        ]);
    }

    public function test_revision_and_rejection_require_reason(): void
    {
        [$program, , $reviewer] = $this->underReviewProgram();

        $this->actingAs($reviewer)
            ->from(route('work-programs.show', $program))
            ->post(route('work-programs.request-revision', $program), [])
            ->assertRedirect(route('work-programs.show', $program))
            ->assertSessionHasErrors(['note']);

        $this->actingAs($reviewer)
            ->from(route('work-programs.show', $program))
            ->post(route('work-programs.reject', $program), [])
            ->assertRedirect(route('work-programs.show', $program))
            ->assertSessionHasErrors(['note']);
    }

    public function test_illegal_transition_and_duplicate_approval_are_rejected(): void
    {
        [$program, , $reviewer] = $this->underReviewProgram();

        $this->actingAs($reviewer)
            ->post(route('work-programs.approve', $program), ['note' => 'Ok'])
            ->assertRedirect();

        $program->refresh();
        $this->assertSame(WorkProgram::STATUS_APPROVED, $program->status);

        $this->actingAs($reviewer)
            ->post(route('work-programs.approve', $program), ['note' => 'Duplikat'])
            ->assertForbidden();

        $this->actingAs($reviewer)
            ->post(route('work-programs.request-revision', $program), ['note' => 'Tidak boleh'])
            ->assertForbidden();

        $this->assertSame(1, $program->approvals()->where('action', WorkProgramApproval::ACTION_APPROVED)->count());
    }

    public function test_unauthorized_reviewer_is_rejected(): void
    {
        [$program] = $this->submittedProgramWithReviewer();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('work-programs.start-review', $program))
            ->assertForbidden();
    }

    public function test_self_approval_is_rejected(): void
    {
        $division = Division::factory()->create();
        $submitter = $this->userWithPermissions([
            'work_program.view',
            'work_program.submit',
            'work_program.approve',
        ], $division);
        $program = $this->completeDraftProgram($division, $submitter);

        $this->actingAs($submitter)
            ->post(route('work-programs.submit', $program))
            ->assertRedirect();

        $program->forceFill(['status' => WorkProgram::STATUS_UNDER_REVIEW])->save();

        $this->actingAs($submitter)
            ->post(route('work-programs.approve', $program), ['note' => 'Self approve'])
            ->assertForbidden();

        $this->assertSame(WorkProgram::STATUS_UNDER_REVIEW, $program->fresh()->status);
    }

    public function test_submit_requires_complete_program_data(): void
    {
        $division = Division::factory()->create();
        $submitter = $this->userWithPermissions([
            'work_program.view_own_field',
            'work_program.submit',
        ], $division);
        $program = WorkProgram::factory()->create([
            'division_id' => $division->id,
            'created_by' => $submitter->id,
            'primary_pic_user_id' => null,
            'success_indicators' => null,
            'objectives' => null,
        ]);

        $this->actingAs($submitter)
            ->post(route('work-programs.submit', $program))
            ->assertSessionHasErrors(['workflow']);

        $this->assertSame(WorkProgram::STATUS_DRAFT, $program->fresh()->status);
    }

    public function test_approved_program_can_run_complete_evaluate_and_archive(): void
    {
        [$program, , $actor] = $this->underReviewProgram();

        $actor->givePermissionTo([
            Permission::firstOrCreate(['name' => 'work_program.manage_tasks', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'work_program.update_progress', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'work_program.evaluate', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'work_program.archive', 'guard_name' => 'web']),
        ]);

        $this->actingAs($actor)
            ->post(route('work-programs.approve', $program), ['note' => 'Disetujui'])
            ->assertRedirect();

        $program->refresh();
        $task = WorkProgramTask::factory()->create([
            'work_program_id' => $program->id,
            'planned_start_date' => now()->format('Y-m-d'),
            'planned_end_date' => now()->addDays(3)->format('Y-m-d'),
            'status' => WorkProgramTask::STATUS_TODO,
            'progress' => 0,
            'weight' => 10,
            'pic_user_id' => $actor->id,
        ]);

        $this->actingAs($actor)
            ->post(route('work-programs.schedule', $program), ['note' => 'Siap dijadwalkan'])
            ->assertRedirect();
        $this->assertSame(WorkProgram::STATUS_SCHEDULED, $program->fresh()->status);

        $this->actingAs($actor)
            ->post(route('work-programs.start-execution', $program), ['note' => 'Mulai'])
            ->assertRedirect();
        $this->assertSame(WorkProgram::STATUS_IN_PROGRESS, $program->fresh()->status);
        $this->assertNotNull($program->fresh()->actual_start_date);

        $this->actingAs($actor)
            ->post(route('work-programs.complete', $program), ['note' => 'Belum selesai'])
            ->assertSessionHasErrors(['workflow']);
        $this->assertSame(WorkProgram::STATUS_IN_PROGRESS, $program->fresh()->status);

        $this->actingAs($actor)
            ->post(route('work-programs.hold', $program), ['note' => 'Menunggu vendor'])
            ->assertRedirect();
        $this->assertSame(WorkProgram::STATUS_ON_HOLD, $program->fresh()->status);

        $this->actingAs($actor)
            ->post(route('work-programs.resume', $program), ['note' => 'Vendor siap'])
            ->assertRedirect();
        $this->assertSame(WorkProgram::STATUS_IN_PROGRESS, $program->fresh()->status);

        $task->update([
            'status' => WorkProgramTask::STATUS_COMPLETED,
            'progress' => 100,
        ]);

        $this->actingAs($actor)
            ->post(route('work-programs.complete', $program), ['note' => 'Semua task selesai'])
            ->assertRedirect();
        $this->assertSame(WorkProgram::STATUS_COMPLETED, $program->fresh()->status);
        $this->assertNotNull($program->fresh()->completed_at);

        $this->actingAs($actor)
            ->postJson(route('work-programs.evaluation.upsert', $program), [
                'result_summary' => 'Program selesai baik.',
                'objective_achievement' => 'Tujuan tercapai.',
                'indicator_result' => 'Indikator terpenuhi.',
                'target_vs_realization' => 'Target sesuai realisasi.',
                'time_evaluation' => 'Tepat waktu.',
                'budget_result' => 'Sesuai anggaran.',
                'lessons_learned' => 'Koordinasi perlu dipertahankan.',
                'recommendations' => 'Lanjutkan program.',
                'follow_up' => 'Susun rencana lanjutan.',
                'evaluated_at' => now()->format('Y-m-d H:i:s'),
                'mark_evaluated' => true,
            ])
            ->assertOk()
            ->assertJsonPath('program_status', WorkProgram::STATUS_EVALUATED);

        $this->actingAs($actor)
            ->post(route('work-programs.archive', $program), ['note' => 'Arsip final'])
            ->assertRedirect();
        $this->assertSame(WorkProgram::STATUS_ARCHIVED, $program->fresh()->status);
        $this->assertNotNull($program->fresh()->archived_at);

        foreach ([
            WorkProgramApproval::ACTION_APPROVED,
            WorkProgramApproval::ACTION_SCHEDULED,
            WorkProgramApproval::ACTION_STARTED,
            WorkProgramApproval::ACTION_HELD,
            WorkProgramApproval::ACTION_RESUMED,
            WorkProgramApproval::ACTION_COMPLETED,
            WorkProgramApproval::ACTION_EVALUATED,
            WorkProgramApproval::ACTION_ARCHIVED,
        ] as $action) {
            $this->assertDatabaseHas('work_program_approvals', [
                'work_program_id' => $program->id,
                'action' => $action,
            ]);
        }
    }

    public function test_completed_program_can_be_reopened_for_revision_by_reviewer(): void
    {
        [$program, $submitter, $reviewer] = $this->underReviewProgram();

        $reviewer->givePermissionTo([
            Permission::firstOrCreate(['name' => 'work_program.manage_tasks', 'guard_name' => 'web']),
            Permission::firstOrCreate(['name' => 'work_program.update_progress', 'guard_name' => 'web']),
        ]);

        $this->actingAs($reviewer)
            ->post(route('work-programs.approve', $program), ['note' => 'Disetujui'])
            ->assertRedirect();

        $program->refresh();
        WorkProgramTask::factory()->create([
            'work_program_id' => $program->id,
            'planned_start_date' => now()->format('Y-m-d'),
            'planned_end_date' => now()->addDays(3)->format('Y-m-d'),
            'status' => WorkProgramTask::STATUS_COMPLETED,
            'progress' => 100,
            'weight' => 10,
            'pic_user_id' => $reviewer->id,
        ]);

        $this->actingAs($reviewer)
            ->post(route('work-programs.schedule', $program), ['note' => 'Siap'])
            ->assertRedirect();

        $this->actingAs($reviewer)
            ->post(route('work-programs.start-execution', $program), ['note' => 'Mulai'])
            ->assertRedirect();

        $this->actingAs($reviewer)
            ->post(route('work-programs.complete', $program), ['note' => 'Selesai'])
            ->assertRedirect();
        $this->assertSame(WorkProgram::STATUS_COMPLETED, $program->fresh()->status);
        $this->assertNotNull($program->fresh()->completed_at);

        $this->actingAs($submitter)
            ->post(route('work-programs.request-revision', $program), ['note' => 'Saya revisi sendiri'])
            ->assertForbidden();

        $this->actingAs($reviewer)
            ->post(route('work-programs.request-revision', $program), ['note' => 'Perlu revisi laporan final'])
            ->assertRedirect();

        $this->assertSame(WorkProgram::STATUS_REVISION_REQUESTED, $program->fresh()->status);
        $this->assertNull($program->fresh()->completed_at);
        $this->assertDatabaseHas('work_program_approvals', [
            'work_program_id' => $program->id,
            'action' => WorkProgramApproval::ACTION_REVISION_REQUESTED,
            'from_status' => WorkProgram::STATUS_COMPLETED,
            'to_status' => WorkProgram::STATUS_REVISION_REQUESTED,
        ]);
    }

    /**
     * @return array{0:WorkProgram,1:User,2:User}
     */
    private function underReviewProgram(): array
    {
        [$program, $submitter, $reviewer] = $this->submittedProgramWithReviewer();

        $this->actingAs($reviewer)
            ->post(route('work-programs.start-review', $program), ['note' => 'Review'])
            ->assertRedirect();

        return [$program->fresh(), $submitter, $reviewer];
    }

    /**
     * @return array{0:WorkProgram,1:User,2:User}
     */
    private function submittedProgramWithReviewer(): array
    {
        $division = Division::factory()->create();
        $submitter = $this->userWithPermissions([
            'work_program.view_own_field',
            'work_program.submit',
            'work_program.withdraw',
        ], $division);
        $reviewer = $this->userWithPermissions([
            'work_program.view',
            'work_program.review',
            'work_program.approve',
            'work_program.reject',
            'work_program.request_revision',
        ]);
        $program = $this->completeDraftProgram($division, $submitter);

        $this->actingAs($submitter)
            ->post(route('work-programs.submit', $program))
            ->assertRedirect();

        return [$program->fresh(), $submitter, $reviewer];
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
