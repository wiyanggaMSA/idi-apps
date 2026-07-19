<?php

namespace Tests\Feature\WorkPrograms;

use App\Models\Division;
use App\Models\Member;
use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class WorkProgramCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_draft_work_program(): void
    {
        $division = Division::factory()->create();
        $period = WorkProgramPeriod::factory()->create();
        $pic = User::factory()->create();
        $user = $this->userWithPermissions(['work_program.create', 'work_program.view_own_field'], $division);

        $response = $this->actingAs($user)->post(route('work-programs.store'), [
            'name' => 'Program Edukasi Diabetes',
            'work_program_period_id' => $period->id,
            'year' => 2026,
            'division_id' => $division->id,
            'category' => 'Edukasi',
            'nature' => WorkProgram::NATURE_STRATEGIC,
            'source' => WorkProgram::SOURCE_FIELD_PROPOSAL,
            'priority' => WorkProgram::PRIORITY_HIGH,
            'planned_start_date' => '2026-08-01',
            'planned_end_date' => '2026-08-31',
            'primary_pic_user_id' => $pic->id,
            'estimated_budget' => 1500000,
        ]);

        $program = WorkProgram::query()->first();

        $response->assertRedirect(route('work-programs.show', $program));
        $this->assertNotNull($program);
        $this->assertSame(WorkProgram::STATUS_DRAFT, $program->status);
        $this->assertSame('Program Edukasi Diabetes', $program->name);
        $this->assertSame($division->id, $program->division_id);
        $this->assertNotEmpty($program->program_code);
    }

    public function test_user_can_update_draft_work_program(): void
    {
        $division = Division::factory()->create();
        $user = $this->userWithPermissions(['work_program.view_own_field', 'work_program.update'], $division);
        $program = WorkProgram::factory()->create([
            'division_id' => $division->id,
            'status' => WorkProgram::STATUS_DRAFT,
        ]);

        $this->actingAs($user)
            ->patch(route('work-programs.update', $program), [
                'name' => 'Program Edukasi Hipertensi',
                'priority' => WorkProgram::PRIORITY_CRITICAL,
            ])
            ->assertRedirect();

        $program->refresh();
        $this->assertSame('Program Edukasi Hipertensi', $program->name);
        $this->assertSame(WorkProgram::PRIORITY_CRITICAL, $program->priority);
        $this->assertSame(1, $program->lock_version);
    }

    public function test_submitted_program_cannot_be_updated_by_crud_endpoint(): void
    {
        $division = Division::factory()->create();
        $user = $this->userWithPermissions(['work_program.view_own_field', 'work_program.update'], $division);
        $program = WorkProgram::factory()->create([
            'division_id' => $division->id,
            'status' => WorkProgram::STATUS_SUBMITTED,
        ]);

        $this->actingAs($user)
            ->patch(route('work-programs.update', $program), ['name' => 'Tidak boleh berubah'])
            ->assertForbidden();

        $this->assertNotSame('Tidak boleh berubah', $program->fresh()->name);
    }

    public function test_validation_rejects_invalid_create_payload(): void
    {
        $division = Division::factory()->create();
        $period = WorkProgramPeriod::factory()->create();
        $user = $this->userWithPermissions(['work_program.create', 'work_program.view_own_field'], $division);

        $this->actingAs($user)
            ->from(route('work-programs.index'))
            ->post(route('work-programs.store'), [
                'work_program_period_id' => $period->id,
                'year' => 2026,
                'division_id' => $division->id,
                'nature' => WorkProgram::NATURE_ROUTINE,
                'source' => WorkProgram::SOURCE_FIELD_PROPOSAL,
                'priority' => WorkProgram::PRIORITY_MEDIUM,
                'planned_start_date' => '2026-09-10',
                'planned_end_date' => '2026-09-01',
            ])
            ->assertRedirect(route('work-programs.index'))
            ->assertSessionHasErrors(['name', 'planned_end_date']);
    }

    public function test_user_without_permission_cannot_access_crud(): void
    {
        $user = User::factory()->create();
        $program = WorkProgram::factory()->create();

        $this->actingAs($user)->get(route('work-programs.index'))->assertForbidden();
        $this->actingAs($user)->get(route('work-programs.show', $program))->assertForbidden();
        $this->actingAs($user)->post(route('work-programs.store'), [])->assertForbidden();
    }

    public function test_detail_response_is_scoped_and_serialized(): void
    {
        $division = Division::factory()->create();
        $user = $this->userWithPermissions(['work_program.view_own_field'], $division);
        $program = WorkProgram::factory()->create([
            'division_id' => $division->id,
            'name' => 'Program Detail',
        ]);

        $this->actingAs($user)
            ->get(route('work-programs.show', $program))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('WorkPrograms/Show', false)
                ->where('program.id', $program->id)
                ->where('program.name', 'Program Detail')
                ->has('options.periods')
            );
    }

    public function test_filter_sort_and_pagination_work(): void
    {
        $user = $this->userWithPermissions(['work_program.view']);
        $period = WorkProgramPeriod::factory()->create();
        $division = Division::factory()->create();

        WorkProgram::factory()->create([
            'work_program_period_id' => $period->id,
            'division_id' => $division->id,
            'name' => 'Alpha Program',
            'year' => 2026,
            'status' => WorkProgram::STATUS_DRAFT,
            'priority' => WorkProgram::PRIORITY_HIGH,
            'category' => 'Edukasi',
        ]);
        WorkProgram::factory()->create([
            'work_program_period_id' => $period->id,
            'division_id' => $division->id,
            'name' => 'Beta Program',
            'year' => 2026,
            'status' => WorkProgram::STATUS_APPROVED,
            'priority' => WorkProgram::PRIORITY_LOW,
            'category' => 'Rapat',
        ]);

        $this->actingAs($user)
            ->get(route('work-programs.index', [
                'search' => 'Alpha',
                'year' => 2026,
                'period_id' => $period->id,
                'division_id' => $division->id,
                'status' => WorkProgram::STATUS_DRAFT,
                'priority' => WorkProgram::PRIORITY_HIGH,
                'category' => 'Edukasi',
                'sortBy' => 'name',
                'sortDir' => 'asc',
                'perPage' => 1,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('WorkPrograms/Index', false)
                ->has('programs.data', 1)
                ->where('programs.data.0.name', 'Alpha Program')
                ->where('programs.per_page', 1)
            );
    }

    public function test_delete_draft_program(): void
    {
        $division = Division::factory()->create();
        $user = $this->userWithPermissions(['work_program.view', 'work_program.delete'], $division);
        $program = WorkProgram::factory()->create([
            'division_id' => $division->id,
            'status' => WorkProgram::STATUS_DRAFT,
        ]);

        $this->actingAs($user)
            ->delete(route('work-programs.destroy', $program))
            ->assertRedirect(route('work-programs.index'));

        $this->assertSoftDeleted('work_programs', ['id' => $program->id]);
    }

    public function test_cross_division_access_is_rejected_for_own_field_user(): void
    {
        $ownDivision = Division::factory()->create();
        $otherDivision = Division::factory()->create();
        $user = $this->userWithPermissions(['work_program.view_own_field', 'work_program.create'], $ownDivision);
        $otherProgram = WorkProgram::factory()->create(['division_id' => $otherDivision->id]);
        $period = WorkProgramPeriod::factory()->create();

        $this->actingAs($user)
            ->get(route('work-programs.show', $otherProgram))
            ->assertForbidden();

        $this->actingAs($user)
            ->from(route('work-programs.index'))
            ->post(route('work-programs.store'), [
                'name' => 'Lintas Bidang',
                'work_program_period_id' => $period->id,
                'year' => 2026,
                'division_id' => $otherDivision->id,
                'nature' => WorkProgram::NATURE_ROUTINE,
                'source' => WorkProgram::SOURCE_FIELD_PROPOSAL,
                'priority' => WorkProgram::PRIORITY_MEDIUM,
            ])
            ->assertRedirect(route('work-programs.index'))
            ->assertSessionHasErrors(['division_id']);
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
