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
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OrganizationDirectoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_unit_cards_support_server_filters_sorting_pagination_counts_and_detail_data(): void
    {
        $viewer = $this->viewer();
        $period = OrganizationPeriod::factory()->active()->create();
        $core = OrganizationUnit::factory()->core()->create([
            'period_id' => $period->id,
            'name' => 'Pengurus Inti',
            'display_order' => 1,
        ]);
        $field = OrganizationUnit::factory()->create([
            'period_id' => $period->id,
            'name' => 'Bidang Pelayanan',
            'unit_type' => 'field',
            'display_order' => 2,
        ]);
        OrganizationUnit::factory()->create([
            'period_id' => $period->id,
            'parent_id' => $field->id,
            'name' => 'Subbidang Mutu',
        ]);
        $leadership = Position::factory()->create(['name' => 'Ketua Bidang', 'is_leadership' => true]);
        $memberPosition = Position::factory()->create(['name' => 'Anggota']);
        $filledSlot = OrganizationUnitPosition::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $field->id,
            'position_id' => $leadership->id,
            'display_order' => 1,
        ]);
        OrganizationUnitPosition::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $core->id,
            'position_id' => $memberPosition->id,
        ]);
        $member = Member::factory()->create(['full_name' => 'dr. Koordinator Pelayanan']);
        OrganizationAssignment::factory()->active()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $field->id,
            'unit_position_id' => $filledSlot->id,
            'member_id' => $member->id,
        ]);

        $this->actingAs($viewer)
            ->getJson(route('organization.periods.units.index', [
                'organizationPeriod' => $period,
                'type' => 'field',
                'core' => 0,
                'active' => 1,
                'has_vacancy' => 0,
                'search' => 'Pelayanan',
                'sort' => 'name',
                'direction' => 'asc',
                'per_page' => 1,
            ]))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('data.0.id', $field->id)
            ->assertJsonPath('data.0.positions_count', 1)
            ->assertJsonPath('data.0.filled_positions_count', 1)
            ->assertJsonPath('data.0.children_count', 1)
            ->assertJsonPath('data.0.positions.0.assignment.member.full_name', 'dr. Koordinator Pelayanan')
            ->assertJsonPath('data.0.children.0.name', 'Subbidang Mutu');

        $this->actingAs($viewer)
            ->getJson(route('organization.periods.units.index', [
                'organizationPeriod' => $period,
                'has_vacancy' => 1,
            ]))
            ->assertOk()
            ->assertJsonPath('data.0.id', $core->id)
            ->assertJsonPath('data.0.positions_count', 1)
            ->assertJsonPath('data.0.filled_positions_count', 0);
    }

    public function test_member_table_supports_search_filters_sorting_pagination_and_safe_detail_fields(): void
    {
        $viewer = $this->viewer();
        $period = OrganizationPeriod::factory()->active()->create();
        $unit = OrganizationUnit::factory()->core()->create([
            'period_id' => $period->id,
            'name' => 'Pengurus Inti',
        ]);
        $position = Position::factory()->create(['name' => 'Sekretaris']);
        $slot = OrganizationUnitPosition::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $unit->id,
            'position_id' => $position->id,
        ]);
        $account = User::factory()->create(['is_active' => true]);
        $member = Member::factory()->create([
            'user_id' => $account->id,
            'npa' => 'NPA-STEP8-001',
            'full_name' => 'dr. Sekretaris Utama',
            'education' => 'Sp.A',
            'address' => 'Data sensitif tidak boleh tampil',
        ]);
        $role = Role::create(['name' => 'step8-secretary', 'guard_name' => 'web']);
        $assignment = OrganizationAssignment::factory()->active()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $unit->id,
            'unit_position_id' => $slot->id,
            'member_id' => $member->id,
            'portal_role_id' => $role->id,
            'started_at' => '2026-01-15',
        ]);

        $this->actingAs($viewer)
            ->getJson(route('organization.periods.assignments.index', [
                'organizationPeriod' => $period,
                'search' => 'STEP8-001',
                'unit_id' => $unit->id,
                'position_id' => $position->id,
                'status' => OrganizationAssignment::STATUS_ACTIVE,
                'role_id' => $role->id,
                'account' => 'active',
                'sort' => 'member',
                'direction' => 'asc',
                'per_page' => 1,
            ]))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $assignment->id)
            ->assertJsonPath('data.0.member.full_name', 'dr. Sekretaris Utama')
            ->assertJsonPath('data.0.member.education', 'Sp.A')
            ->assertJsonPath('data.0.member.account.exists', true)
            ->assertJsonPath('data.0.member.account.is_active', true)
            ->assertJsonPath('data.0.position.title', 'Sekretaris')
            ->assertJsonPath('data.0.unit.name', 'Pengurus Inti')
            ->assertJsonPath('data.0.role.name', 'step8-secretary')
            ->assertJsonMissingPath('data.0.member.address')
            ->assertJsonMissingPath('data.0.member.birth_date');

        $this->actingAs($viewer)
            ->getJson(route('organization.periods.assignments.index', [
                'organizationPeriod' => $period,
                'account' => 'unsupported',
            ]))
            ->assertUnprocessable();
    }

    private function viewer(): User
    {
        Permission::findOrCreate('organization.view', 'web');
        $viewer = User::factory()->create();
        $viewer->givePermissionTo('organization.view');

        return $viewer;
    }
}
