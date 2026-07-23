<?php

namespace Tests\Feature\Organization;

use App\Models\Division;
use App\Models\Member;
use App\Models\OrganizationAssignment;
use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Models\OrganizationUnitPosition;
use App\Models\Position;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OrganizationApiAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_organization_routes_require_authentication_and_permission(): void
    {
        $period = OrganizationPeriod::factory()->create();

        $this->getJson(route('organization.periods.index'))->assertUnauthorized();

        $memberUser = $this->userWithRole('anggota');
        $this->actingAs($memberUser)
            ->getJson(route('organization.periods.index'))
            ->assertForbidden();
        $this->actingAs($memberUser)
            ->getJson(route('organization.periods.show', $period))
            ->assertForbidden();
    }

    public function test_role_seed_maps_read_and_edit_permissions_to_existing_roles(): void
    {
        $this->seed(RolePermissionSeeder::class);

        foreach (['superadmin', 'admin', 'sekretaris', 'ketua'] as $roleName) {
            $role = Role::findByName($roleName);
            $this->assertTrue($role->hasPermissionTo('organization.view'));
            $this->assertTrue($role->hasPermissionTo('organization.history.view'));
            $this->assertTrue($role->hasPermissionTo('organization.structure.manage'));
            $this->assertTrue($role->hasPermissionTo('organization.assignment.replace'));
        }

        $this->assertTrue(Role::findByName('bendahara')->hasPermissionTo('organization.view'));
        $this->assertFalse(Role::findByName('bendahara')->hasPermissionTo('organization.structure.manage'));
        $this->assertFalse(Role::findByName('anggota')->hasPermissionTo('organization.view'));
    }

    public function test_role_seed_normalizes_default_role_name_casing(): void
    {
        foreach (['Superadmin', 'Admin', 'Sekretaris', 'Ketua', 'Bendahara', 'Anggota'] as $roleName) {
            Role::create(['name' => $roleName, 'guard_name' => 'web']);
        }

        $this->seed(RolePermissionSeeder::class);

        foreach (['superadmin', 'admin', 'sekretaris', 'ketua', 'bendahara', 'anggota'] as $roleName) {
            $this->assertDatabaseHas('roles', ['name' => $roleName, 'guard_name' => 'web']);
            $this->assertDatabaseMissing('roles', ['name' => ucfirst($roleName), 'guard_name' => 'web']);
        }

        $this->assertTrue(Role::findByName('sekretaris')->hasPermissionTo('organization.view'));
        $this->assertTrue(Role::findByName('ketua')->hasPermissionTo('work_program.approve'));
        $this->assertTrue(Role::findByName('bendahara')->hasPermissionTo('dues.manage'));
        $this->assertTrue(Role::findByName('anggota')->hasPermissionTo('work_program.update_progress'));
    }

    public function test_portal_manager_can_read_period_chart_and_assignment_contracts(): void
    {
        $viewer = $this->userWithRole('bendahara');
        $context = $this->draftStructure();
        $member = Member::factory()->create(['email' => 'chart-member@example.test']);
        $assignment = OrganizationAssignment::factory()->create([
            'period_id' => $context['period']->id,
            'organization_unit_id' => $context['child']->id,
            'unit_position_id' => $context['slot']->id,
            'member_id' => $member->id,
            'portal_role_id' => Role::findByName('bendahara')->id,
        ]);

        $this->actingAs($viewer)
            ->getJson(route('organization.periods.index'))
            ->assertOk()
            ->assertJsonPath('data.0.id', $context['period']->id)
            ->assertJsonMissingPath('data.0.password');

        $this->actingAs($viewer)
            ->getJson(route('organization.periods.chart', $context['period']))
            ->assertOk()
            ->assertJsonPath('data.0.name', $context['root']->name)
            ->assertJsonPath('data.0.children.0.name', $context['child']->name)
            ->assertJsonPath('data.0.children.0.positions.0.assignment.member.id', $member->id)
            ->assertJsonMissingPath('data.0.children.0.positions.0.assignment.member.address');

        $this->actingAs($viewer)
            ->getJson(route('organization.assignments.show', $assignment))
            ->assertOk()
            ->assertJsonPath('data.member.full_name', $member->full_name)
            ->assertJsonMissingPath('data.member.password');

        $this->actingAs($viewer)
            ->getJson(route('organization.periods.assignments.index', [
                'organizationPeriod' => $context['period'],
                'sort' => 'member',
                'direction' => 'asc',
            ]))
            ->assertOk()
            ->assertJsonPath('data.0.id', $assignment->id)
            ->assertJsonStructure(['data', 'links', 'meta']);
    }

    public function test_sekretaris_can_manage_period_structure_and_audit_is_recorded(): void
    {
        $actor = $this->userWithRole('sekretaris');

        $periodResponse = $this->actingAs($actor)->postJson(route('organization.periods.store'), [
            'name' => 'Periode API 2030–2033',
            'start_date' => '2030-01-01',
            'end_date' => '2033-12-31',
            'notes' => 'Dibuat melalui API',
        ])->assertCreated()
            ->assertJsonPath('data.status', OrganizationPeriod::STATUS_DRAFT);
        $period = OrganizationPeriod::findOrFail($periodResponse->json('data.id'));
        $division = Division::factory()->create();
        $position = Position::factory()->create();

        $unitResponse = $this->actingAs($actor)->postJson(
            route('organization.periods.units.store', $period),
            [
                'name' => 'Unit API Dinamis',
                'unit_type' => 'custom_dynamic_type',
                'master_unit_id' => $division->id,
                'is_core_structure' => true,
            ]
        )->assertCreated()
            ->assertJsonPath('data.unit_type', 'custom_dynamic_type');
        $unit = OrganizationUnit::findOrFail($unitResponse->json('data.id'));

        $this->actingAs($actor)->postJson(route('organization.units.positions.store', $unit), [
            'position_id' => $position->id,
            'custom_title' => 'Jabatan API',
            'is_required' => true,
        ])->assertCreated()
            ->assertJsonPath('data.title', 'Jabatan API');

        $events = Activity::query()->where('log_name', 'organization')->pluck('event');
        $this->assertContains('organization.period.created', $events);
        $this->assertContains('organization.unit.created', $events);
        $this->assertContains('organization.position.created', $events);

        $activity = Activity::query()->where('event', 'organization.unit.created')->firstOrFail();
        $this->assertSame($actor->id, $activity->properties->get('actor_user_id'));
        $this->assertSame('organization.unit.created', $activity->properties->get('event'));
        $this->assertNotNull($activity->properties->get('ip_address'));
        $this->assertArrayNotHasKey('password', $activity->properties->get('new_values'));
    }

    public function test_read_only_role_cannot_mutate_structure_or_assignment(): void
    {
        $viewer = $this->userWithRole('bendahara');
        $context = $this->draftStructure();
        $member = Member::factory()->create(['email' => 'denied@example.test']);

        $this->actingAs($viewer)->postJson(
            route('organization.periods.units.store', $context['period']),
            ['name' => 'Ditolak', 'unit_type' => 'other']
        )->assertForbidden();

        $this->actingAs($viewer)->postJson(route('organization.assignments.store'), [
            ...$this->assignmentPayload($context, $member),
        ])->assertForbidden();

        $this->assertDatabaseMissing('organization_units', ['name' => 'Ditolak']);
        $this->assertDatabaseMissing('organization_assignments', ['member_id' => $member->id]);
    }

    public function test_assignment_api_synchronizes_account_and_domain_errors_are_field_level(): void
    {
        $actor = $this->userWithRole('admin');
        $context = $this->activeStructure();
        $member = Member::factory()->create(['email' => 'api-assignment@example.test']);

        $response = $this->actingAs($actor)
            ->postJson(route('organization.assignments.store'), $this->assignmentPayload($context, $member))
            ->assertCreated()
            ->assertJsonPath('data.status', OrganizationAssignment::STATUS_ACTIVE)
            ->assertJsonPath('data.member.account.exists', true)
            ->assertJsonMissingPath('data.member.account.password');
        $assignment = OrganizationAssignment::findOrFail($response->json('data.id'));

        $this->actingAs($actor)
            ->getJson(route('organization.units.positions.index', $context['child']))
            ->assertOk()
            ->assertJsonPath('data.0.assignment.id', $assignment->id)
            ->assertJsonPath('data.0.assignment.member.id', $member->id)
            ->assertJsonPath('data.0.assignment.member.account.exists', true);

        $this->actingAs($actor)->patchJson(route('organization.assignments.update', $assignment), [
            'appointment_number' => 'SK/API/UPDATED',
            'notes' => 'Metadata diperbarui tanpa mengganti member',
        ])->assertOk()
            ->assertJsonPath('data.appointment_number', 'SK/API/UPDATED');
        $this->assertDatabaseHas('activity_log', [
            'event' => 'organization.assignment.updated',
            'subject_id' => $assignment->id,
        ]);

        $secondMember = Member::factory()->create(['email' => 'api-conflict@example.test']);
        $this->actingAs($actor)
            ->postJson(route('organization.assignments.store'), $this->assignmentPayload($context, $secondMember))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Data organisasi tidak valid.')
            ->assertJsonValidationErrors('unit_position_id');

        $this->actingAs($actor)->postJson(route('organization.assignments.end', $assignment), [
            'ended_at' => '2028-01-01',
            'reason' => 'Akhir penugasan API',
        ])->assertOk()
            ->assertJsonPath('data.status', OrganizationAssignment::STATUS_ENDED);

        $this->assertNull($member->fresh()->division_id);
        $this->assertTrue($member->fresh()->user->hasRole('anggota'));
    }

    public function test_member_search_eligibility_and_history_are_paginated_and_minimal(): void
    {
        $viewer = $this->userWithRole('ketua');
        $context = $this->draftStructure();
        $member = Member::factory()->create([
            'full_name' => 'Dokter Autocomplete Unik',
            'education' => 'Sp.PD',
            'email' => 'autocomplete@example.test',
            'address' => 'Data sensitif tidak dikirim',
            'notes' => 'Catatan internal',
        ]);
        $account = User::factory()->create(['is_active' => true]);
        $member->update(['user_id' => $account->id]);
        OrganizationAssignment::factory()->ended()->create([
            'period_id' => $context['period']->id,
            'organization_unit_id' => $context['child']->id,
            'unit_position_id' => $context['slot']->id,
            'member_id' => $member->id,
            'portal_role_id' => Role::findByName('ketua')->id,
            'started_at' => '2027-01-01',
            'ended_at' => '2028-01-01',
        ]);

        $this->actingAs($viewer)->getJson(route('organization.members.search', [
            'q' => 'Autocomplete',
            'period_id' => $context['period']->id,
        ]))->assertOk()
            ->assertJsonPath('data.0.id', $member->id)
            ->assertJsonPath('data.0.education', 'Sp.PD')
            ->assertJsonPath('data.0.account.exists', true)
            ->assertJsonPath('data.0.account.is_active', true)
            ->assertJsonMissingPath('data.0.address')
            ->assertJsonMissingPath('data.0.notes')
            ->assertJsonStructure(['data', 'links', 'meta']);

        $this->actingAs($viewer)->getJson(route('organization.members.eligibility', [
            'member' => $member,
            'period_id' => $context['period']->id,
        ]))->assertOk()
            ->assertJsonPath('data.eligible', true);

        $this->actingAs($viewer)
            ->getJson(route('organization.members.history', $member))
            ->assertOk()
            ->assertJsonPath('data.0.status', OrganizationAssignment::STATUS_ENDED)
            ->assertJsonStructure(['data', 'links', 'meta']);
    }

    public function test_member_search_accepts_one_character_and_raw_active_status(): void
    {
        $viewer = $this->userWithRole('ketua');
        $context = $this->draftStructure();
        $member = Member::factory()->create([
            'npa' => 'R-001',
            'full_name' => 'Raka Raw Status',
            'email' => 'raka.raw@example.test',
            'status' => 'aktif',
        ]);

        $this->actingAs($viewer)->getJson(route('organization.members.search', [
            'q' => 'r',
            'period_id' => $context['period']->id,
        ]))->assertOk()
            ->assertJsonPath('data.0.id', $member->id);

        $this->actingAs($viewer)->getJson(route('organization.members.eligibility', [
            'member' => $member,
            'period_id' => $context['period']->id,
        ]))->assertOk()
            ->assertJsonPath('data.eligible', true);
    }

    public function test_structure_edit_updates_parent_atomically_and_rejects_cycles(): void
    {
        $actor = $this->userWithRole('sekretaris');
        $context = $this->draftStructure();
        $newParent = OrganizationUnit::factory()->create([
            'period_id' => $context['period']->id,
            'parent_id' => null,
            'display_order' => 3,
        ]);

        $this->actingAs($actor)
            ->patchJson(route('organization.units.update', $context['child']), [
                'parent_id' => $newParent->id,
                'name' => 'Unit Dipindahkan',
                'display_order' => 7,
            ])
            ->assertOk()
            ->assertJsonPath('data.parent.id', $newParent->id)
            ->assertJsonPath('data.name', 'Unit Dipindahkan')
            ->assertJsonPath('data.display_order', 7);

        $this->actingAs($actor)
            ->patchJson(route('organization.units.update', $newParent), [
                'parent_id' => $context['child']->id,
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Data organisasi tidak valid.')
            ->assertJsonValidationErrors('parent_id');

        $this->assertNull($newParent->fresh()->parent_id);
        $this->assertSame($newParent->id, $context['child']->fresh()->parent_id);
    }

    public function test_non_superadmin_cannot_assign_superadmin_role(): void
    {
        $actor = $this->userWithRole('admin');
        $context = $this->draftStructure();
        $member = Member::factory()->create(['email' => 'no-escalation@example.test']);
        $payload = $this->assignmentPayload($context, $member);
        $payload['portal_role_id'] = Role::findByName('superadmin')->id;

        $this->actingAs($actor)
            ->postJson(route('organization.assignments.store'), $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('portal_role_id');

        $this->assertDatabaseMissing('organization_assignments', [
            'member_id' => $member->id,
        ]);
    }

    private function userWithRole(string $role): User
    {
        if (! Role::query()->where('name', $role)->exists()) {
            $this->seed(RolePermissionSeeder::class);
        }

        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function draftStructure(): array
    {
        $this->seedRolesIfNeeded();
        $period = OrganizationPeriod::factory()->create([
            'start_date' => '2026-01-01',
            'end_date' => '2029-12-31',
        ]);

        return $this->structure($period);
    }

    /**
     * @return array<string, mixed>
     */
    private function activeStructure(): array
    {
        $this->seedRolesIfNeeded();
        $period = OrganizationPeriod::factory()->active()->create([
            'start_date' => '2026-01-01',
            'end_date' => '2029-12-31',
        ]);

        return $this->structure($period);
    }

    /**
     * @return array<string, mixed>
     */
    private function structure(OrganizationPeriod $period): array
    {
        $division = Division::factory()->create();
        $position = Position::factory()->create();
        $root = OrganizationUnit::factory()->core()->create([
            'period_id' => $period->id,
            'master_unit_id' => $division->id,
            'display_order' => 1,
        ]);
        $child = OrganizationUnit::factory()->create([
            'period_id' => $period->id,
            'parent_id' => $root->id,
            'master_unit_id' => $division->id,
            'display_order' => 2,
        ]);
        $slot = OrganizationUnitPosition::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $child->id,
            'position_id' => $position->id,
        ]);

        return compact('period', 'division', 'position', 'root', 'child', 'slot');
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function assignmentPayload(array $context, Member $member): array
    {
        return [
            'period_id' => $context['period']->id,
            'organization_unit_id' => $context['child']->id,
            'unit_position_id' => $context['slot']->id,
            'member_id' => $member->id,
            'portal_role_id' => Role::findByName('bendahara')->id,
            'started_at' => '2027-01-01',
            'appointment_number' => 'SK/API/001',
        ];
    }

    private function seedRolesIfNeeded(): void
    {
        if (! Role::query()->where('name', 'admin')->exists()) {
            $this->seed(RolePermissionSeeder::class);
        }
    }
}
