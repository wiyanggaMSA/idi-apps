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
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OrganizationDomainFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_organization_foundation_tables_and_columns_exist(): void
    {
        foreach ([
            'organization_periods',
            'organization_units',
            'organization_unit_positions',
            'organization_assignments',
        ] as $table) {
            $this->assertTrue(Schema::hasTable($table), "Missing table {$table}");
        }

        $this->assertTrue(Schema::hasColumns('organization_periods', [
            'name',
            'start_date',
            'end_date',
            'status',
            'is_active',
            'published_at',
            'ended_at',
            'ended_by',
            'created_by',
            'updated_by',
        ]));
        $this->assertTrue(Schema::hasColumns('organization_units', [
            'period_id',
            'parent_id',
            'master_unit_id',
            'unit_type',
            'display_order',
            'is_core_structure',
            'is_active',
        ]));
        $this->assertTrue(Schema::hasColumns('organization_unit_positions', [
            'period_id',
            'organization_unit_id',
            'position_id',
            'custom_title',
            'is_required',
        ]));
        $this->assertTrue(Schema::hasColumns('organization_assignments', [
            'period_id',
            'organization_unit_id',
            'unit_position_id',
            'member_id',
            'portal_role_id',
            'role_was_preexisting',
            'account_was_active',
            'account_was_created',
            'access_applied_at',
            'access_revoked_at',
            'started_at',
            'ended_at',
            'status',
            'replaced_by_assignment_id',
        ]));
        $this->assertTrue(Schema::hasColumns('positions', [
            'description',
            'level',
            'display_order',
            'is_leadership',
        ]));
        $this->assertTrue(Schema::hasColumn('members', 'active_user_link_id'));
    }

    public function test_hierarchy_slots_member_role_and_master_data_relations_work(): void
    {
        $actor = User::factory()->create();
        $member = Member::factory()->create();
        $division = Division::factory()->create();
        $position = Position::factory()->create([
            'level' => 1,
            'display_order' => 10,
            'is_leadership' => true,
        ]);
        $role = Role::create(['name' => 'organization-test-role', 'guard_name' => 'web']);
        $period = OrganizationPeriod::factory()->create(['created_by' => $actor->id]);
        $root = OrganizationUnit::factory()->core()->create([
            'period_id' => $period->id,
            'master_unit_id' => $division->id,
            'created_by' => $actor->id,
        ]);
        $child = OrganizationUnit::factory()->create([
            'period_id' => $period->id,
            'parent_id' => $root->id,
            'unit_type' => 'subspecialty_cluster',
        ]);
        $slot = OrganizationUnitPosition::factory()->required()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $child->id,
            'position_id' => $position->id,
            'custom_title' => 'Koordinator Khusus',
        ]);
        $assignment = OrganizationAssignment::factory()->active()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $child->id,
            'unit_position_id' => $slot->id,
            'member_id' => $member->id,
            'portal_role_id' => $role->id,
            'created_by' => $actor->id,
        ]);

        $this->assertTrue($period->units->contains($root));
        $this->assertTrue($root->masterUnit->is($division));
        $this->assertTrue($root->children->first()->is($child));
        $this->assertTrue($child->parent->is($root));
        $this->assertSame('subspecialty_cluster', $child->unit_type);
        $this->assertTrue($slot->position->is($position));
        $this->assertSame('Koordinator Khusus', $slot->display_title);
        $this->assertTrue($assignment->member->is($member));
        $this->assertTrue($assignment->portalRole->is($role));
        $this->assertTrue($member->organizationAssignments->first()->is($assignment));
        $this->assertTrue($position->organizationUnitPositions->first()->is($slot));
        $this->assertTrue($division->organizationUnits->first()->is($root));
    }

    public function test_database_prevents_more_than_one_active_period(): void
    {
        OrganizationPeriod::factory()->active()->create();

        $this->expectException(QueryException::class);

        OrganizationPeriod::factory()->active()->create();
    }

    public function test_database_prevents_member_from_holding_two_current_slots_in_one_period(): void
    {
        $period = OrganizationPeriod::factory()->create();
        $member = Member::factory()->create();
        $firstSlot = $this->slotFor($period);
        $secondSlot = $this->slotFor($period);

        OrganizationAssignment::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $firstSlot->organization_unit_id,
            'unit_position_id' => $firstSlot->id,
            'member_id' => $member->id,
            'status' => OrganizationAssignment::STATUS_DRAFT,
        ]);

        $this->expectException(QueryException::class);

        OrganizationAssignment::factory()->active()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $secondSlot->organization_unit_id,
            'unit_position_id' => $secondSlot->id,
            'member_id' => $member->id,
        ]);
    }

    public function test_database_prevents_two_current_members_from_occupying_one_slot(): void
    {
        $period = OrganizationPeriod::factory()->create();
        $slot = $this->slotFor($period);

        OrganizationAssignment::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $slot->organization_unit_id,
            'unit_position_id' => $slot->id,
            'member_id' => Member::factory(),
        ]);

        $this->expectException(QueryException::class);

        OrganizationAssignment::factory()->active()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $slot->organization_unit_id,
            'unit_position_id' => $slot->id,
            'member_id' => Member::factory(),
        ]);
    }

    public function test_database_rejects_cross_period_hierarchy_and_mismatched_slot_paths(): void
    {
        $firstPeriod = OrganizationPeriod::factory()->create();
        $secondPeriod = OrganizationPeriod::factory()->create();
        $firstRoot = OrganizationUnit::factory()->create(['period_id' => $firstPeriod->id]);

        try {
            OrganizationUnit::factory()->create([
                'period_id' => $secondPeriod->id,
                'parent_id' => $firstRoot->id,
            ]);
            $this->fail('Cross-period parent relation was not rejected.');
        } catch (QueryException) {
            $this->assertTrue(true);
        }

        $firstUnit = OrganizationUnit::factory()->create(['period_id' => $firstPeriod->id]);
        $secondUnit = OrganizationUnit::factory()->create(['period_id' => $firstPeriod->id]);
        $slot = OrganizationUnitPosition::factory()->create([
            'period_id' => $firstPeriod->id,
            'organization_unit_id' => $firstUnit->id,
        ]);

        $this->expectException(QueryException::class);

        OrganizationAssignment::factory()->create([
            'period_id' => $firstPeriod->id,
            'organization_unit_id' => $secondUnit->id,
            'unit_position_id' => $slot->id,
        ]);
    }

    public function test_database_enforces_one_active_member_link_per_user(): void
    {
        $user = User::factory()->create();
        Member::factory()->create(['user_id' => $user->id]);

        $this->expectException(QueryException::class);

        Member::factory()->create(['user_id' => $user->id]);
    }

    public function test_user_link_can_be_reused_after_member_is_soft_deleted(): void
    {
        $user = User::factory()->create();
        $member = Member::factory()->create(['user_id' => $user->id]);
        $member->delete();

        $replacement = Member::factory()->create(['user_id' => $user->id]);

        $this->assertSame($user->id, $replacement->user_id);
    }

    public function test_historical_assignments_can_repeat_and_keep_replacement_relation(): void
    {
        $period = OrganizationPeriod::factory()->create();
        $slot = $this->slotFor($period);
        $member = Member::factory()->create();

        $oldAssignment = OrganizationAssignment::factory()->ended()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $slot->organization_unit_id,
            'unit_position_id' => $slot->id,
            'member_id' => $member->id,
        ]);
        OrganizationAssignment::factory()->ended()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $slot->organization_unit_id,
            'unit_position_id' => $slot->id,
            'member_id' => $member->id,
            'started_at' => now()->subYears(2)->toDateString(),
            'ended_at' => now()->subYear()->toDateString(),
        ]);
        $replacement = OrganizationAssignment::factory()->active()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $slot->organization_unit_id,
            'unit_position_id' => $slot->id,
            'member_id' => Member::factory(),
        ]);

        $oldAssignment->update([
            'status' => OrganizationAssignment::STATUS_REPLACED,
            'replaced_by_assignment_id' => $replacement->id,
            'end_reason' => 'Pergantian pengurus',
        ]);

        $this->assertSame(3, OrganizationAssignment::query()->count());
        $this->assertTrue($oldAssignment->fresh()->replacedBy->is($replacement));
        $this->assertTrue($replacement->fresh()->replaces->is($oldAssignment));
        $this->assertSame('Pergantian pengurus', $oldAssignment->fresh()->end_reason);
    }

    private function slotFor(OrganizationPeriod $period): OrganizationUnitPosition
    {
        $unit = OrganizationUnit::factory()->create(['period_id' => $period->id]);

        return OrganizationUnitPosition::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $unit->id,
        ]);
    }
}
