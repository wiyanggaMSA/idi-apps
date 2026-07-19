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
use App\Services\Organization\OrganizationDomainException;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OrganizationAssignmentAccessServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_assignment_creates_and_links_account_role_and_division(): void
    {
        Notification::fake();
        $context = $this->activeContext();
        $member = Member::factory()->create([
            'email' => 'pengurus.baru@example.test',
            'division_id' => null,
            'position_id' => null,
        ]);

        $assignment = $this->service()->assign($this->payload($context, $member), $context['actor']);

        $member->refresh();
        $user = $member->user;

        $this->assertSame(OrganizationAssignment::STATUS_ACTIVE, $assignment->status);
        $this->assertNotNull($assignment->access_applied_at);
        $this->assertTrue($assignment->account_was_created);
        $this->assertFalse($assignment->account_was_active);
        $this->assertFalse($assignment->role_was_preexisting);
        $this->assertNotNull($user);
        $this->assertSame($member->email, $user->email);
        $this->assertTrue($user->is_active);
        $this->assertTrue($user->hasRole($context['managerRole']));
        $this->assertSame($context['division']->id, $member->division_id);
        $this->assertSame($context['position']->id, $member->position_id);
        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_existing_account_and_unrelated_roles_are_reused_without_overwrite(): void
    {
        $context = $this->activeContext();
        $existingRole = Role::create(['name' => 'auditor-test', 'guard_name' => 'web']);
        $user = User::factory()->create([
            'email' => 'existing@example.test',
            'is_active' => true,
        ]);
        $user->assignRole($existingRole);
        $member = Member::factory()->create([
            'email' => $user->email,
            'user_id' => null,
        ]);

        $assignment = $this->service()->assign($this->payload($context, $member), $context['actor']);

        $this->assertSame($user->id, $member->fresh()->user_id);
        $this->assertFalse($assignment->account_was_created);
        $this->assertTrue($assignment->account_was_active);
        $this->assertTrue($user->fresh()->hasAllRoles([$existingRole, $context['managerRole']]));
    }

    public function test_draft_assignment_does_not_change_account_role_or_member_placement(): void
    {
        $context = $this->draftContext();
        $member = Member::factory()->create([
            'email' => null,
            'division_id' => null,
            'position_id' => null,
        ]);

        $assignment = $this->service()->assign($this->payload($context, $member), $context['actor']);

        $this->assertSame(OrganizationAssignment::STATUS_DRAFT, $assignment->status);
        $this->assertNull($assignment->access_applied_at);
        $this->assertNull($member->fresh()->user_id);
        $this->assertNull($member->fresh()->division_id);
        $this->assertNull($member->fresh()->position_id);
    }

    public function test_draft_assignment_can_be_activated_only_after_period_is_active(): void
    {
        Notification::fake();
        $context = $this->draftContext();
        $member = Member::factory()->create(['email' => 'candidate@example.test']);
        $assignment = $this->service()->assign($this->payload($context, $member), $context['actor']);

        try {
            $this->service()->activateDraft($assignment, $context['actor']);
            $this->fail('Draft assignment was activated before its period became active.');
        } catch (OrganizationDomainException $exception) {
            $this->assertSame('period_id', $exception->field());
        }

        $context['period']->update([
            'status' => OrganizationPeriod::STATUS_ACTIVE,
            'is_active' => true,
        ]);
        $activated = $this->service()->activateDraft($assignment, $context['actor']);

        $this->assertSame(OrganizationAssignment::STATUS_ACTIVE, $activated->status);
        $this->assertNotNull($activated->access_applied_at);
        $this->assertTrue($member->fresh()->user->hasRole($context['managerRole']));
        $this->assertSame($context['division']->id, $member->fresh()->division_id);
    }

    public function test_inactive_member_duplicate_member_and_occupied_slot_are_rejected(): void
    {
        $context = $this->activeContext();
        $inactive = Member::factory()->create([
            'status' => 'nonaktif',
            'email' => 'nonaktif@example.test',
        ]);

        try {
            $this->service()->assign($this->payload($context, $inactive), $context['actor']);
            $this->fail('Inactive member was accepted.');
        } catch (OrganizationDomainException $exception) {
            $this->assertSame('member_id', $exception->field());
        }

        $first = Member::factory()->create(['email' => 'first@example.test']);
        $this->service()->assign($this->payload($context, $first), $context['actor']);
        $secondPosition = Position::factory()->create();
        $secondSlot = OrganizationUnitPosition::factory()->create([
            'period_id' => $context['period']->id,
            'organization_unit_id' => $context['unit']->id,
            'position_id' => $secondPosition->id,
        ]);

        try {
            $this->service()->assign([
                ...$this->payload($context, $first),
                'unit_position_id' => $secondSlot->id,
            ], $context['actor']);
            $this->fail('Member obtained two current assignments.');
        } catch (OrganizationDomainException $exception) {
            $this->assertSame('member_id', $exception->field());
        }

        $second = Member::factory()->create(['email' => 'second@example.test']);

        try {
            $this->service()->assign($this->payload($context, $second), $context['actor']);
            $this->fail('Occupied slot was assigned twice.');
        } catch (OrganizationDomainException $exception) {
            $this->assertSame('unit_position_id', $exception->field());
        }
    }

    public function test_replace_is_atomic_and_preserves_history_while_switching_access(): void
    {
        $context = $this->activeContext();
        $oldMember = Member::factory()->create(['email' => 'old@example.test']);
        $newMember = Member::factory()->create(['email' => 'new@example.test']);
        $oldAssignment = $this->service()->assign($this->payload($context, $oldMember), $context['actor']);
        $oldUser = $oldMember->fresh()->user;

        DB::table('sessions')->insert([
            'id' => 'old-user-session',
            'user_id' => $oldUser->id,
            'payload' => 'test',
            'last_activity' => now()->timestamp,
        ]);

        $replacement = $this->service()->replace($oldAssignment, [
            'member_id' => $newMember->id,
            'portal_role_id' => $context['managerRole']->id,
            'started_at' => '2027-06-01',
            'reason' => 'Pergantian antarwaktu',
        ], $context['actor']);

        $oldAssignment->refresh();
        $oldMember->refresh();
        $newMember->refresh();

        $this->assertSame(OrganizationAssignment::STATUS_REPLACED, $oldAssignment->status);
        $this->assertSame($replacement->id, $oldAssignment->replaced_by_assignment_id);
        $this->assertSame('2027-06-01', $oldAssignment->ended_at->toDateString());
        $this->assertSame('Pergantian antarwaktu', $oldAssignment->end_reason);
        $this->assertNotNull($oldAssignment->access_revoked_at);
        $this->assertNull($oldMember->division_id);
        $this->assertNull($oldMember->position_id);
        $this->assertFalse($oldUser->fresh()->is_active);
        $this->assertTrue($oldUser->fresh()->hasRole($context['memberRole']));
        $this->assertFalse($oldUser->fresh()->hasRole($context['managerRole']));
        $this->assertDatabaseMissing('sessions', ['id' => 'old-user-session']);

        $this->assertSame(OrganizationAssignment::STATUS_ACTIVE, $replacement->status);
        $this->assertSame($newMember->id, $replacement->member_id);
        $this->assertSame($context['division']->id, $newMember->division_id);
        $this->assertSame($context['position']->id, $newMember->position_id);
        $this->assertTrue($newMember->user->hasRole($context['managerRole']));
        $this->assertSame(2, OrganizationAssignment::query()->count());
    }

    public function test_failed_replacement_rolls_back_old_assignment_and_access(): void
    {
        $context = $this->activeContext();
        $oldMember = Member::factory()->create(['email' => 'rollback-old@example.test']);
        $invalidReplacement = Member::factory()->create(['email' => null]);
        $oldAssignment = $this->service()->assign($this->payload($context, $oldMember), $context['actor']);
        $oldUser = $oldMember->fresh()->user;

        try {
            $this->service()->replace($oldAssignment, [
                'member_id' => $invalidReplacement->id,
                'started_at' => '2027-08-01',
                'reason' => 'Harus rollback',
            ], $context['actor']);
            $this->fail('Invalid replacement was not rolled back.');
        } catch (OrganizationDomainException $exception) {
            $this->assertSame('member_id', $exception->field());
        }

        $this->assertSame(OrganizationAssignment::STATUS_ACTIVE, $oldAssignment->fresh()->status);
        $this->assertNull($oldAssignment->fresh()->ended_at);
        $this->assertNull($oldAssignment->fresh()->replaced_by_assignment_id);
        $this->assertSame($context['division']->id, $oldMember->fresh()->division_id);
        $this->assertTrue($oldUser->fresh()->is_active);
        $this->assertTrue($oldUser->fresh()->hasRole($context['managerRole']));
        $this->assertSame(1, OrganizationAssignment::query()->count());
    }

    public function test_ending_assignment_preserves_preexisting_account_and_role_state(): void
    {
        $context = $this->activeContext();
        $user = User::factory()->create([
            'email' => 'manual-manager@example.test',
            'is_active' => true,
        ]);
        $user->assignRole($context['managerRole']);
        $member = Member::factory()->create([
            'email' => $user->email,
            'user_id' => $user->id,
        ]);
        $assignment = $this->service()->assign($this->payload($context, $member), $context['actor']);

        $this->assertTrue($assignment->role_was_preexisting);
        $ended = $this->service()->end($assignment, '2028-01-15', 'Selesai bertugas', $context['actor']);

        $this->assertSame(OrganizationAssignment::STATUS_ENDED, $ended->status);
        $this->assertNotNull($ended->access_revoked_at);
        $this->assertTrue($user->fresh()->is_active);
        $this->assertTrue($user->fresh()->hasRole($context['managerRole']));
        $this->assertTrue($user->fresh()->hasRole($context['memberRole']));
        $this->assertNull($member->fresh()->division_id);
        $this->assertNull($member->fresh()->position_id);
        $this->assertSame($ended->id, $this->service()->end($ended, '2028-01-15', null, $context['actor'])->id);
    }

    public function test_inactive_account_cannot_authenticate(): void
    {
        $user = User::factory()->create([
            'email' => 'inactive-login@example.test',
            'password' => Hash::make('valid-password'),
            'is_active' => false,
        ]);

        $this->post(route('login'), [
            'email' => $user->email,
            'password' => 'valid-password',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    private function service(): OrganizationAssignmentService
    {
        return app(OrganizationAssignmentService::class);
    }

    /**
     * @return array<string, mixed>
     */
    private function activeContext(): array
    {
        return $this->context(true);
    }

    /**
     * @return array<string, mixed>
     */
    private function draftContext(): array
    {
        return $this->context(false);
    }

    /**
     * @return array<string, mixed>
     */
    private function context(bool $active): array
    {
        $actor = User::factory()->create();
        $memberRole = Role::create(['name' => 'anggota', 'guard_name' => 'web']);
        $managerRole = Role::create(['name' => 'pengurus-test', 'guard_name' => 'web']);
        $periodFactory = OrganizationPeriod::factory();

        if ($active) {
            $periodFactory = $periodFactory->active();
        }

        $period = $periodFactory->create([
            'start_date' => '2026-01-01',
            'end_date' => '2029-12-31',
        ]);
        $division = Division::factory()->create();
        $position = Position::factory()->create();
        $unit = OrganizationUnit::factory()->create([
            'period_id' => $period->id,
            'master_unit_id' => $division->id,
        ]);
        $slot = OrganizationUnitPosition::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $unit->id,
            'position_id' => $position->id,
        ]);

        return compact(
            'actor',
            'memberRole',
            'managerRole',
            'period',
            'division',
            'position',
            'unit',
            'slot'
        );
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function payload(array $context, Member $member): array
    {
        return [
            'period_id' => $context['period']->id,
            'organization_unit_id' => $context['unit']->id,
            'unit_position_id' => $context['slot']->id,
            'member_id' => $member->id,
            'portal_role_id' => $context['managerRole']->id,
            'started_at' => '2027-01-01',
            'appointment_number' => 'SK/001/2027',
            'appointment_date' => '2026-12-20',
            'notes' => 'Assignment test',
        ];
    }
}
