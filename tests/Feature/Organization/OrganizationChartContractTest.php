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

class OrganizationChartContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_chart_contract_contains_nested_units_positions_members_and_empty_slots(): void
    {
        Permission::findOrCreate('organization.view', 'web');
        $viewer = User::factory()->create();
        $viewer->givePermissionTo('organization.view');
        $period = OrganizationPeriod::factory()->active()->create([
            'name' => 'Periode Chart 2026–2029',
        ]);
        $root = OrganizationUnit::factory()->core()->create([
            'period_id' => $period->id,
            'name' => 'Pengurus Inti',
            'description' => 'Struktur pimpinan organisasi.',
            'display_order' => 1,
        ]);
        $child = OrganizationUnit::factory()->create([
            'period_id' => $period->id,
            'parent_id' => $root->id,
            'name' => 'Bidang Organisasi',
            'unit_type' => 'field',
            'display_order' => 1,
        ]);
        OrganizationUnit::factory()->create([
            'period_id' => $period->id,
            'parent_id' => $child->id,
            'name' => 'Subbidang Kaderisasi',
            'unit_type' => 'subdivision',
            'display_order' => 1,
        ]);
        $leadership = Position::factory()->create([
            'name' => 'Ketua Bidang',
            'is_leadership' => true,
        ]);
        $memberPosition = Position::factory()->create(['name' => 'Anggota Bidang']);
        $filledSlot = OrganizationUnitPosition::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $child->id,
            'position_id' => $leadership->id,
            'display_order' => 1,
        ]);
        OrganizationUnitPosition::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $child->id,
            'position_id' => $memberPosition->id,
            'display_order' => 2,
        ]);
        $member = Member::factory()->create([
            'full_name' => 'dr. Ketua Bidang',
            'education' => 'Sp.PD',
            'address' => 'Tidak boleh dikirim ke chart',
        ]);
        $role = Role::create(['name' => 'chart-leader', 'guard_name' => 'web']);
        OrganizationAssignment::factory()->active()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $child->id,
            'unit_position_id' => $filledSlot->id,
            'member_id' => $member->id,
            'portal_role_id' => $role->id,
        ]);

        $this->actingAs($viewer)
            ->getJson(route('organization.periods.chart', $period))
            ->assertOk()
            ->assertJsonPath('data.0.id', $root->id)
            ->assertJsonPath('data.0.description', 'Struktur pimpinan organisasi.')
            ->assertJsonPath('data.0.is_core_structure', true)
            ->assertJsonPath('data.0.children.0.id', $child->id)
            ->assertJsonPath('data.0.children.0.unit_type', 'field')
            ->assertJsonPath('data.0.children.0.children.0.name', 'Subbidang Kaderisasi')
            ->assertJsonPath('data.0.children.0.positions.0.title', 'Ketua Bidang')
            ->assertJsonPath('data.0.children.0.positions.0.position.is_leadership', true)
            ->assertJsonPath('data.0.children.0.positions.0.assignment.member.full_name', 'dr. Ketua Bidang')
            ->assertJsonPath('data.0.children.0.positions.0.assignment.member.education', 'Sp.PD')
            ->assertJsonPath('data.0.children.0.positions.0.assignment.status', OrganizationAssignment::STATUS_ACTIVE)
            ->assertJsonPath('data.0.children.0.positions.1.assignment', null)
            ->assertJsonMissingPath('data.0.children.0.positions.0.assignment.member.address')
            ->assertJsonMissingPath('data.0.children.0.positions.0.assignment.member.birth_date');
    }
}
