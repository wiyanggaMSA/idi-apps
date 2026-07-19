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
use App\Services\Organization\OrganizationAssignmentService;
use App\Services\Organization\OrganizationPeriodService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OrganizationPeriodWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_preflight_returns_all_structure_and_required_position_issues(): void
    {
        $actor = $this->admin();
        $period = OrganizationPeriod::factory()->create([
            'start_date' => '2027-01-01',
            'end_date' => '2030-12-31',
        ]);

        $this->actingAs($actor)
            ->getJson(route('organization.periods.workflow-summary', [
                'organizationPeriod' => $period,
                'action' => 'publish',
            ]))
            ->assertOk()
            ->assertJsonPath('data.ready', false)
            ->assertJsonPath('data.issues.0.code', 'structure_missing');

        $unit = OrganizationUnit::factory()->create(['period_id' => $period->id]);
        OrganizationUnitPosition::factory()->required()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $unit->id,
            'position_id' => Position::factory(),
        ]);

        $response = $this->actingAs($actor)
            ->getJson(route('organization.periods.workflow-summary', [
                'organizationPeriod' => $period,
                'action' => 'publish',
            ]))
            ->assertOk()
            ->assertJsonPath('data.ready', false)
            ->assertJsonPath('data.summary.units', 1)
            ->assertJsonPath('data.summary.required_positions', 1);

        $this->assertContains('required_position_empty', collect($response->json('data.issues'))->pluck('code'));
    }

    public function test_preflight_query_count_does_not_grow_with_the_number_of_units(): void
    {
        $context = $this->draftContext();
        $parent = $context['unit'];

        foreach (range(1, 25) as $index) {
            $parent = OrganizationUnit::factory()->create([
                'period_id' => $context['period']->id,
                'parent_id' => $parent->id,
                'name' => 'Unit '.$index,
            ]);
        }

        DB::flushQueryLog();
        DB::enableQueryLog();

        app(OrganizationPeriodService::class)->readiness($context['period']);

        $queryCount = count(DB::getQueryLog());
        DB::disableQueryLog();

        $this->assertLessThanOrEqual(15, $queryCount);
    }

    public function test_publish_then_activate_is_atomic_and_applies_draft_assignment_access(): void
    {
        $actor = $this->admin();
        $context = $this->draftContext();
        $member = Member::factory()->create(['email' => 'workflow-active@example.test']);
        $assignment = app(OrganizationAssignmentService::class)->assign(
            $this->assignmentPayload($context, $member),
            $actor
        );

        $this->assertSame(OrganizationAssignment::STATUS_DRAFT, $assignment->status);
        $this->assertNull($member->user_id);

        $this->actingAs($actor)
            ->postJson(route('organization.periods.publish', $context['period']))
            ->assertOk()
            ->assertJsonPath('data.status', OrganizationPeriod::STATUS_PUBLISHED)
            ->assertJsonPath('data.published_by.id', $actor->id);

        $this->assertSame(OrganizationAssignment::STATUS_DRAFT, $assignment->fresh()->status);
        $this->assertNull($member->fresh()->user_id);

        $this->actingAs($actor)
            ->postJson(route('organization.periods.activate', $context['period']))
            ->assertOk()
            ->assertJsonPath('data.status', OrganizationPeriod::STATUS_ACTIVE)
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.activated_by.id', $actor->id);

        $assignment->refresh();
        $member->refresh();
        $this->assertSame(OrganizationAssignment::STATUS_ACTIVE, $assignment->status);
        $this->assertNotNull($assignment->access_applied_at);
        $this->assertSame($context['division']->id, $member->division_id);
        $this->assertSame($context['position']->id, $member->position_id);
        $this->assertTrue($member->user->hasRole('bendahara'));
        $this->assertDatabaseHas('activity_log', ['event' => 'organization.period.published']);
        $this->assertDatabaseHas('activity_log', ['event' => 'organization.period.activated']);
    }

    public function test_activation_refuses_to_replace_an_existing_active_period(): void
    {
        $actor = $this->admin();
        OrganizationPeriod::factory()->active()->create();
        $context = $this->draftContext([
            'status' => OrganizationPeriod::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);
        $member = Member::factory()->create(['email' => 'blocked-activation@example.test']);
        $assignment = app(OrganizationAssignmentService::class)->assign(
            $this->assignmentPayload($context, $member),
            $actor
        );

        $this->actingAs($actor)
            ->postJson(route('organization.periods.activate', $context['period']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('period_id');

        $this->assertSame(OrganizationPeriod::STATUS_PUBLISHED, $context['period']->fresh()->status);
        $this->assertFalse($context['period']->fresh()->is_active);
        $this->assertSame(OrganizationAssignment::STATUS_DRAFT, $assignment->fresh()->status);
        $this->assertNull($member->fresh()->user_id);
    }

    public function test_end_summary_and_end_period_preserve_history_and_make_period_read_only(): void
    {
        $actor = $this->admin();
        $context = $this->activeContext();
        $context['period']->update(['activated_at' => now(), 'activated_by' => $actor->id]);
        $member = Member::factory()->create(['email' => 'workflow-ended@example.test']);
        $assignment = app(OrganizationAssignmentService::class)->assign(
            $this->assignmentPayload($context, $member),
            $actor
        );
        $user = $member->fresh()->user;
        DB::table('sessions')->insert([
            'id' => 'workflow-period-session',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit',
            'payload' => 'test',
            'last_activity' => now()->timestamp,
        ]);
        $replacement = OrganizationPeriod::factory()->create([
            'name' => 'Periode Pengganti',
            'start_date' => '2031-01-01',
            'end_date' => '2034-12-31',
        ]);

        $this->actingAs($actor)
            ->getJson(route('organization.periods.workflow-summary', [
                'organizationPeriod' => $context['period'],
                'action' => 'end',
            ]))
            ->assertOk()
            ->assertJsonPath('data.assignments', 1)
            ->assertJsonPath('data.roles', 1)
            ->assertJsonPath('data.divisions', 1)
            ->assertJsonPath('data.replacement_period.id', $replacement->id);

        $this->actingAs($actor)
            ->postJson(route('organization.periods.end', $context['period']), [
                'ended_at' => '2029-06-30',
                'reason' => 'Serah terima kepengurusan',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', OrganizationPeriod::STATUS_ENDED)
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.ended_by.id', $actor->id);

        $assignment->refresh();
        $member->refresh();
        $this->assertSame(OrganizationAssignment::STATUS_ENDED, $assignment->status);
        $this->assertSame('2029-06-30', $assignment->ended_at->toDateString());
        $this->assertSame('Serah terima kepengurusan', $assignment->end_reason);
        $this->assertNull($member->division_id);
        $this->assertNull($member->position_id);
        $this->assertTrue($user->fresh()->hasRole('anggota'));
        $this->assertDatabaseMissing('sessions', ['id' => 'workflow-period-session']);
        $this->assertSame('2029-06-30', $context['period']->fresh()->end_date->toDateString());
        $this->assertTrue($context['period']->fresh()->isReadOnly());

        $this->actingAs($actor)
            ->getJson(route('organization.periods.chart', $context['period']))
            ->assertOk()
            ->assertJsonPath('data.0.positions.0.assignment.id', $assignment->id);

        $this->actingAs($actor)
            ->getJson(route('organization.periods.index', ['status' => OrganizationPeriod::STATUS_ENDED]))
            ->assertOk()
            ->assertJsonPath('data.0.id', $context['period']->id)
            ->assertJsonPath('data.0.activated_by.id', $actor->id)
            ->assertJsonPath('data.0.ended_by.id', $actor->id);

        $this->actingAs($actor)
            ->getJson(route('organization.periods.assignments.index', $context['period']))
            ->assertOk()
            ->assertJsonPath('data.0.ended_by_actor.id', $actor->id)
            ->assertJsonPath('data.0.end_reason', 'Serah terima kepengurusan');

        $this->actingAs($actor)
            ->patchJson(route('organization.units.update', $context['unit']), ['name' => 'Tidak boleh'])
            ->assertForbidden();
    }

    private function admin(): User
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    /** @return array<string, mixed> */
    private function draftContext(array $periodState = []): array
    {
        $period = OrganizationPeriod::factory()->create([
            'start_date' => '2027-01-01',
            'end_date' => '2030-12-31',
            ...$periodState,
        ]);

        return $this->structure($period);
    }

    /** @return array<string, mixed> */
    private function activeContext(): array
    {
        $period = OrganizationPeriod::factory()->active()->create([
            'start_date' => '2027-01-01',
            'end_date' => '2030-12-31',
        ]);

        return $this->structure($period);
    }

    /** @return array<string, mixed> */
    private function structure(OrganizationPeriod $period): array
    {
        $division = Division::factory()->create();
        $position = Position::factory()->create();
        $unit = OrganizationUnit::factory()->core()->create([
            'period_id' => $period->id,
            'master_unit_id' => $division->id,
        ]);
        $slot = OrganizationUnitPosition::factory()->required()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $unit->id,
            'position_id' => $position->id,
        ]);

        return compact('period', 'division', 'position', 'unit', 'slot');
    }

    /** @param array<string, mixed> $context */
    private function assignmentPayload(array $context, Member $member): array
    {
        return [
            'period_id' => $context['period']->id,
            'organization_unit_id' => $context['unit']->id,
            'unit_position_id' => $context['slot']->id,
            'member_id' => $member->id,
            'portal_role_id' => Role::findByName('bendahara')->id,
            'started_at' => '2028-01-01',
        ];
    }
}
