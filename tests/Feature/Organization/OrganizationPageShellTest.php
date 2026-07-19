<?php

namespace Tests\Feature\Organization;

use App\Models\Member;
use App\Models\OrganizationAssignment;
use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Models\OrganizationUnitPosition;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OrganizationPageShellTest extends TestCase
{
    use RefreshDatabase;

    public function test_page_requires_organization_read_permission(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('secretariat.organization.index'))
            ->assertForbidden();
    }

    public function test_active_period_shell_contains_header_statistics_tabs_and_actions(): void
    {
        $user = $this->userWithPermissions([
            'organization.view',
            'organization.history.view',
            'organization.period.create',
            'organization.structure.manage',
            'organization.assignment.manage',
            'organization.assignment.replace',
            'organization.period.end',
            'users.update',
        ]);
        $period = OrganizationPeriod::factory()->active()->create([
            'name' => 'Kepengurusan Aktif 2026–2029',
            'start_date' => '2026-01-01',
            'end_date' => '2029-12-31',
        ]);
        $coreUnit = OrganizationUnit::factory()->core()->create(['period_id' => $period->id]);
        $otherUnit = OrganizationUnit::factory()->create(['period_id' => $period->id]);
        $filledPosition = Position::factory()->create();
        $emptyPosition = Position::factory()->create();
        $filledSlot = OrganizationUnitPosition::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $coreUnit->id,
            'position_id' => $filledPosition->id,
        ]);
        OrganizationUnitPosition::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $otherUnit->id,
            'position_id' => $emptyPosition->id,
        ]);
        $member = Member::factory()->create();
        $role = Role::create(['name' => 'shell-manager', 'guard_name' => 'web']);
        OrganizationAssignment::factory()->active()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $coreUnit->id,
            'unit_position_id' => $filledSlot->id,
            'member_id' => $member->id,
            'portal_role_id' => $role->id,
        ]);

        $this->actingAs($user)
            ->get(route('secretariat.organization.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Organization/Index')
                ->where('selectedPeriod.id', $period->id)
                ->where('selectedPeriod.status', OrganizationPeriod::STATUS_ACTIVE)
                ->where('selectedTab', 'structure')
                ->where('summary.total_managers', 1)
                ->where('summary.core_units', 1)
                ->where('summary.total_units', 2)
                ->where('summary.positions_filled', 1)
                ->where('summary.positions_empty', 1)
                ->where('content.has_structure', true)
                ->where('content.has_assignments', true)
                ->where('actions.manage_structure', true)
                ->where('actions.manage_assignments', true)
                ->where('actions.replace_assignments', true)
                ->where('actions.manage_accounts', true)
                ->where('actions.create_period', true)
                ->where('actions.end_period', true)
                ->has('filterOptions.units', 2)
                ->has('filterOptions.positions', 2)
                ->has('filterOptions.roles', 1)
                ->has('content.root_units', 2)
            );
    }

    public function test_period_and_tab_query_are_preserved_in_page_props(): void
    {
        $user = $this->userWithPermissions(['organization.view', 'organization.history.view']);
        $draft = OrganizationPeriod::factory()->create(['name' => 'Draft Pilihan']);
        $ended = OrganizationPeriod::factory()->ended()->create(['name' => 'Riwayat Pilihan']);

        $this->actingAs($user)
            ->get(route('secretariat.organization.index', [
                'period_id' => $ended->id,
                'tab' => 'history',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Organization/Index')
                ->where('selectedPeriod.id', $ended->id)
                ->where('selectedTab', 'history')
                ->has('periods', 2)
            );

        $this->assertNotSame($draft->id, $ended->id);
    }

    public function test_shell_has_explicit_empty_state_payload_when_no_period_exists(): void
    {
        $user = $this->userWithPermissions(['organization.view']);

        $this->actingAs($user)
            ->get(route('secretariat.organization.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Organization/Index')
                ->where('selectedPeriod', null)
                ->where('summary.total_managers', 0)
                ->where('content.has_structure', false)
                ->where('content.has_assignments', false)
                ->has('periods', 0)
            );
    }

    public function test_ended_period_keeps_historical_metrics_and_exposes_read_only_actions(): void
    {
        $user = $this->userWithPermissions([
            'organization.view',
            'organization.history.view',
            'organization.structure.manage',
            'organization.assignment.manage',
            'organization.assignment.replace',
            'organization.period.update',
            'organization.period.publish',
            'organization.period.activate',
            'organization.period.end',
        ]);
        $period = OrganizationPeriod::factory()->ended()->create();
        $unit = OrganizationUnit::factory()->create(['period_id' => $period->id]);
        $slot = OrganizationUnitPosition::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $unit->id,
            'position_id' => Position::factory(),
        ]);
        OrganizationAssignment::factory()->ended()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $unit->id,
            'unit_position_id' => $slot->id,
            'member_id' => Member::factory(),
        ]);

        $this->actingAs($user)
            ->get(route('secretariat.organization.index', ['period_id' => $period->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('selectedPeriod.id', $period->id)
                ->where('selectedPeriod.status', OrganizationPeriod::STATUS_ENDED)
                ->where('summary.total_managers', 1)
                ->where('summary.positions_filled', 1)
                ->where('content.has_assignments', true)
                ->where('actions.manage_structure', false)
                ->where('actions.manage_assignments', false)
                ->where('actions.replace_assignments', false)
                ->where('actions.publish_period', false)
                ->where('actions.activate_period', false)
                ->where('actions.end_period', false)
            );
    }

    private function userWithPermissions(array $permissions): User
    {
        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $user = User::factory()->create();
        $user->givePermissionTo($permissions);

        return $user;
    }
}
