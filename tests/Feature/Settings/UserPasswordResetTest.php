<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_reset_user_password(): void
    {
        $actor = $this->adminUser(['users.reset-password']);
        $target = User::factory()->create();

        $response = $this
            ->actingAs($actor)
            ->from('/settings')
            ->patch(route('settings.access.users.reset-password', $target), [
                'password' => 'new-secret-password',
                'password_confirmation' => 'new-secret-password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/settings');

        $this->assertTrue(Hash::check('new-secret-password', $target->refresh()->password));
    }

    public function test_reset_user_password_requires_permission(): void
    {
        $actor = $this->adminUser();
        $target = User::factory()->create();

        $this
            ->actingAs($actor)
            ->from('/settings')
            ->patch(route('settings.access.users.reset-password', $target), [
                'password' => 'new-secret-password',
                'password_confirmation' => 'new-secret-password',
            ])
            ->assertForbidden();

        $this->assertTrue(Hash::check('password', $target->refresh()->password));
    }

    private function adminUser(array $permissions = []): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $role->syncPermissions($permissions);
        $user->assignRole($role);

        return $user;
    }
}
