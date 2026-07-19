<?php

namespace Tests\Feature\WorkPrograms;

use App\Models\Division;
use App\Models\Member;
use App\Models\User;
use App\Models\WorkProgram;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class WorkProgramAdministrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_document_upload_and_authorized_download(): void
    {
        Storage::fake('local');
        [$program, $user] = $this->programAndUser(['work_program.view_own_field', 'work_program.upload_document']);

        $response = $this->actingAs($user)->postJson(route('work-programs.documents.store', $program), [
            'title' => 'Proposal Program',
            'category' => 'proposal',
            'document_date' => '2026-08-01',
            'attachment' => UploadedFile::fake()->create('proposal.pdf', 120, 'application/pdf'),
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.title', 'Proposal Program')
            ->assertJsonPath('data.category', 'proposal');

        $documentId = $response->json('data.id');
        $this->assertDatabaseHas('documents', [
            'id' => $documentId,
            'disk' => 'local',
        ]);
        $this->assertDatabaseHas('document_links', [
            'document_id' => $documentId,
            'linkable_type' => WorkProgram::class,
            'linkable_id' => $program->id,
        ]);

        $this->actingAs($user)
            ->get(route('work-programs.documents.download', [$program, $documentId]))
            ->assertOk();
    }

    public function test_document_download_scope_and_invalid_mime_are_rejected(): void
    {
        Storage::fake('local');
        [$program, $user] = $this->programAndUser(['work_program.view_own_field', 'work_program.upload_document']);
        $otherUser = $this->userWithPermissions(['work_program.view_own_field'], Division::factory()->create());

        $this->actingAs($user)->postJson(route('work-programs.documents.store', $program), [
            'title' => 'Script',
            'category' => 'lainnya',
            'attachment' => UploadedFile::fake()->create('script.exe', 12, 'application/x-msdownload'),
        ])->assertJsonValidationErrors(['attachment']);

        $response = $this->actingAs($user)->postJson(route('work-programs.documents.store', $program), [
            'title' => 'Laporan',
            'category' => 'laporan',
            'attachment' => UploadedFile::fake()->create('laporan.pdf', 100, 'application/pdf'),
        ])->assertCreated();

        $this->actingAs($otherUser)
            ->get(route('work-programs.documents.download', [$program, $response->json('data.id')]))
            ->assertForbidden();
    }

    public function test_budget_update_is_audited(): void
    {
        [$program, $user] = $this->programAndUser(['work_program.view_own_field', 'work_program.manage_budget']);

        $this->actingAs($user)
            ->patchJson(route('work-programs.budget.update', $program), [
                'estimated_budget' => 1500000,
                'realized_budget' => 500000,
                'budget_source' => 'Kas organisasi',
                'internal_notes' => 'Revisi RAB',
            ])
            ->assertOk()
            ->assertJsonPath('data.estimated_budget', '1500000.00')
            ->assertJsonPath('data.realized_budget', '500000.00');

        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'work_program',
            'description' => 'work_program.budget.updated',
            'subject_id' => $program->id,
        ]);
    }

    public function test_completed_program_locks_budget_and_documents_but_allows_evaluation(): void
    {
        Storage::fake('local');
        [$program, $user] = $this->programAndUser([
            'work_program.view_own_field',
            'work_program.manage_budget',
            'work_program.upload_document',
            'work_program.evaluate',
        ]);
        $program->update(['status' => WorkProgram::STATUS_COMPLETED]);

        $this->actingAs($user)
            ->patchJson(route('work-programs.budget.update', $program), [
                'estimated_budget' => 1500000,
                'realized_budget' => 500000,
            ])
            ->assertForbidden();

        $this->actingAs($user)
            ->postJson(route('work-programs.documents.store', $program), [
                'title' => 'Laporan',
                'category' => 'laporan',
                'attachment' => UploadedFile::fake()->create('laporan.pdf', 100, 'application/pdf'),
            ])
            ->assertForbidden();

        $this->actingAs($user)
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
                'evaluated_at' => '2026-09-01 10:00:00',
                'mark_evaluated' => false,
            ])
            ->assertOk();
    }

    public function test_evaluation_validation_and_evaluated_transition(): void
    {
        [$program, $user] = $this->programAndUser(['work_program.view_own_field', 'work_program.evaluate']);
        $program->update(['status' => WorkProgram::STATUS_COMPLETED]);

        $this->actingAs($user)
            ->postJson(route('work-programs.evaluation.upsert', $program), [
                'result_summary' => '',
                'mark_evaluated' => true,
            ])
            ->assertJsonValidationErrors(['result_summary', 'objective_achievement']);

        $payload = [
            'result_summary' => 'Program berjalan baik.',
            'objective_achievement' => 'Tujuan tercapai.',
            'indicator_result' => 'Indikator utama terpenuhi.',
            'target_vs_realization' => 'Target 100 peserta, realisasi 120 peserta.',
            'time_evaluation' => 'Waktu sesuai rencana.',
            'budget_result' => 'Realisasi sesuai RAB.',
            'constraints' => 'Koordinasi awal lambat.',
            'supporting_factors' => 'Tim bidang aktif.',
            'inhibiting_factors' => 'Vendor terbatas.',
            'lessons_learned' => 'Mulai koordinasi lebih awal.',
            'recommendations' => 'Replikasi untuk wilayah lain.',
            'follow_up' => 'Susun program lanjutan.',
            'evaluated_at' => '2026-09-01 10:00:00',
            'mark_evaluated' => true,
        ];

        $this->actingAs($user)
            ->postJson(route('work-programs.evaluation.upsert', $program), $payload)
            ->assertOk()
            ->assertJsonPath('program_status', WorkProgram::STATUS_EVALUATED)
            ->assertJsonPath('data.objective_achievement', 'Tujuan tercapai.');

        $this->assertDatabaseHas('work_program_evaluations', [
            'work_program_id' => $program->id,
            'objective_achievement' => 'Tujuan tercapai.',
        ]);
        $this->assertSame(WorkProgram::STATUS_EVALUATED, $program->fresh()->status);
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
