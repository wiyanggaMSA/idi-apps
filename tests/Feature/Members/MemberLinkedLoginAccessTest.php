<?php

namespace Tests\Feature\Members;

use App\Models\Member;
use App\Models\MemberStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MemberLinkedLoginAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_link_login_account_when_creating_member(): void
    {
        $actor = $this->userWithRoleAndPermissions('admin', ['members.create']);
        $linkedUser = User::factory()->create();

        $this
            ->actingAs($actor)
            ->from('/members')
            ->post(route('members.store'), [
                'npa' => 'IDI-001',
                'full_name' => 'Dokter Admin Link',
                'status' => 'aktif',
                'user_id' => $linkedUser->id,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect('/members');

        $this->assertDatabaseHas('members', [
            'npa' => 'IDI-001',
            'user_id' => $linkedUser->id,
        ]);
    }

    public function test_non_admin_cannot_link_login_account_when_creating_member(): void
    {
        $actor = $this->userWithRoleAndPermissions('sekretaris', ['members.create']);
        $linkedUser = User::factory()->create();

        $this
            ->actingAs($actor)
            ->from('/members')
            ->post(route('members.store'), [
                'npa' => 'IDI-002',
                'full_name' => 'Dokter Sekretariat',
                'status' => 'aktif',
                'user_id' => $linkedUser->id,
            ])
            ->assertSessionHasErrors('user_id')
            ->assertRedirect('/members');

        $this->assertDatabaseMissing('members', [
            'npa' => 'IDI-002',
        ]);
    }

    public function test_non_admin_cannot_change_linked_login_account_when_updating_member(): void
    {
        $actor = $this->userWithRoleAndPermissions('sekretaris', ['members.update']);
        $member = Member::factory()->create(['user_id' => null]);
        $linkedUser = User::factory()->create();

        $this
            ->actingAs($actor)
            ->from('/members')
            ->patch(route('members.update', $member), [
                'npa' => $member->npa,
                'full_name' => 'Dokter Update Sekretariat',
                'status' => 'aktif',
                'user_id' => $linkedUser->id,
            ])
            ->assertSessionHasErrors('user_id')
            ->assertRedirect('/members');

        $this->assertNull($member->refresh()->user_id);
    }

    public function test_superadmin_can_update_member_with_legacy_active_status_when_master_status_is_missing(): void
    {
        $actor = $this->userWithRoleAndPermissions('superadmin', ['members.update']);
        MemberStatus::query()->where('code', 'aktif')->forceDelete();
        $member = Member::factory()->create([
            'status' => 'aktif',
            'email' => 'legacy-active@example.test',
        ]);

        $this
            ->actingAs($actor)
            ->from('/members')
            ->patch(route('members.update', $member), [
                'npa' => $member->npa,
                'full_name' => 'Dokter Legacy Aktif Updated',
                'email' => $member->email,
                'status' => 'aktif',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect('/members');

        $this->assertDatabaseHas('members', [
            'id' => $member->id,
            'full_name' => 'Dokter Legacy Aktif Updated',
            'status' => 'aktif',
        ]);
    }

    private function userWithRoleAndPermissions(string $roleName, array $permissions): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $role->syncPermissions($permissions);
        $user->assignRole($role);

        return $user;
    }
}
