<?php

namespace Tests\Feature\Portal;

use App\Models\Member;
use App\Models\OrganizationAssignment;
use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Models\OrganizationUnitPosition;
use App\Models\Position;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PublicLandingControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_portal_uses_latest_period_with_current_assignments_when_no_period_is_active(): void
    {
        $period = OrganizationPeriod::factory()->create([
            'name' => 'Periode Publik Draft',
            'start_date' => '2025-01-01',
            'end_date' => '2028-12-31',
            'is_active' => false,
            'status' => OrganizationPeriod::STATUS_DRAFT,
        ]);
        $unit = OrganizationUnit::factory()->core()->create([
            'period_id' => $period->id,
            'name' => 'Ketua',
        ]);
        $position = Position::factory()->create(['name' => 'Ketua IDI']);
        $slot = OrganizationUnitPosition::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $unit->id,
            'position_id' => $position->id,
        ]);
        $member = Member::factory()->create(['full_name' => 'Rudi Dermawan']);
        $role = Role::create(['name' => 'ketua', 'guard_name' => 'web']);

        OrganizationAssignment::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $unit->id,
            'unit_position_id' => $slot->id,
            'member_id' => $member->id,
            'portal_role_id' => $role->id,
            'status' => OrganizationAssignment::STATUS_DRAFT,
        ]);

        $this->get(route('portal.public'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Welcome')
                ->where('portal.leaders.0.title', 'Rudi Dermawan')
                ->where('portal.leaders.0.subtitle', 'Ketua IDI')
                ->where('portal.leaders.0.content', 'Ketua')
            );
    }
}
