<?php

namespace App\Services\Settings\Access;

use App\Models\Member;
use App\Models\User;
use App\Services\Organization\OrganizationAuditLogger;
use App\Support\RoleName;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class UserAccessService
{
    public const MEMBER_ROLE = RoleName::MEMBER;

    public function __construct(private readonly OrganizationAuditLogger $organizationAuditLogger) {}

    public function create(array $data, User $actor): User
    {
        return DB::transaction(function () use ($data, $actor) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'is_active' => true,
            ]);

            if (! empty($data['role'])) {
                $user->assignRole($data['role']);
            }

            activity()
                ->causedBy($actor)
                ->performedOn($user)
                ->withProperties(['attributes' => $user->only(['name', 'email', 'is_active'])])
                ->log('user.created');

            return $user;
        });
    }

    public function update(User $user, array $data, User $actor): User
    {
        $before = $user->only(['name', 'email', 'is_active']);

        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
        ]);

        activity()
            ->causedBy($actor)
            ->performedOn($user)
            ->withProperties(['before' => $before, 'after' => $user->only(['name', 'email', 'is_active'])])
            ->log('user.updated');

        return $user;
    }

    public function disable(User $user, User $actor): User
    {
        $before = $user->is_active;
        $user->update(['is_active' => false]);

        activity()
            ->causedBy($actor)
            ->performedOn($user)
            ->withProperties(['before' => ['is_active' => $before], 'after' => ['is_active' => false]])
            ->log('user.disabled');

        return $user;
    }

    public function resetPassword(User $user, string $password, User $actor): User
    {
        $user->update(['password' => Hash::make($password)]);

        activity()
            ->causedBy($actor)
            ->performedOn($user)
            ->withProperties(['attributes' => ['email' => $user->email]])
            ->log('user.password_reset');

        return $user;
    }

    public function assignRole(User $user, string $role, User $actor): void
    {
        $before = $user->getRoleNames()->toArray();
        $user->syncRoles([$role]);

        activity()
            ->causedBy($actor)
            ->performedOn($user)
            ->withProperties(['before' => ['roles' => $before], 'after' => ['roles' => [$role]]])
            ->log('user.role_assigned');
    }

    public function syncPermissions(User $user, array $permissions, User $actor): void
    {
        $before = $user->getAllPermissions()->pluck('name')->toArray();
        $user->syncPermissions($permissions);

        activity()
            ->causedBy($actor)
            ->performedOn($user)
            ->withProperties(['before' => ['permissions' => $before], 'after' => ['permissions' => $permissions]])
            ->log('user.permissions_synced');
    }

    public function ensureForMember(Member $member, User $actor): MemberAccountProvision
    {
        return DB::transaction(function () use ($member, $actor) {
            $member = Member::query()
                ->whereKey($member->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($member->user_id) {
                $user = User::withTrashed()
                    ->whereKey($member->user_id)
                    ->lockForUpdate()
                    ->first();

                if (! $user) {
                    throw new UserAccessException('Akun yang tertaut pada member tidak ditemukan.');
                }

                $wasActive = ! $user->trashed() && (bool) $user->is_active;

                if ($user->trashed()) {
                    $user->restore();
                }

                if (! $user->is_active) {
                    $user->update(['is_active' => true]);
                }

                return new MemberAccountProvision($user->fresh(), false, $wasActive);
            }

            $email = mb_strtolower(trim((string) $member->email));

            if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new UserAccessException(
                    'Member harus memiliki email valid sebelum assignment dapat diaktifkan.'
                );
            }

            $user = User::withTrashed()
                ->whereRaw('lower(email) = ?', [$email])
                ->lockForUpdate()
                ->first();

            if ($user) {
                $otherMemberExists = Member::query()
                    ->where('user_id', $user->id)
                    ->whereKeyNot($member->id)
                    ->lockForUpdate()
                    ->exists();

                if ($otherMemberExists) {
                    throw new UserAccessException(
                        'Email member sudah digunakan oleh akun yang tertaut ke member lain.'
                    );
                }

                $wasActive = ! $user->trashed() && (bool) $user->is_active;

                if ($user->trashed()) {
                    $user->restore();
                }

                $user->update([
                    'name' => $member->full_name,
                    'is_active' => true,
                ]);
                $member->update(['user_id' => $user->id]);

                $this->organizationAuditLogger->log(
                    'organization.account.linked',
                    $user,
                    $actor,
                    newValues: ['member_id' => $member->id]
                );

                return new MemberAccountProvision($user->fresh(), false, $wasActive);
            }

            $user = $this->create([
                'name' => $member->full_name,
                'email' => $email,
                'password' => Str::password(48),
            ], $actor);
            $member->update(['user_id' => $user->id]);

            $this->organizationAuditLogger->log(
                'organization.account.created',
                $user,
                $actor,
                newValues: [
                    'member_id' => $member->id,
                    'email' => $user->email,
                    'is_active' => (bool) $user->is_active,
                ]
            );

            DB::afterCommit(static function () use ($email): void {
                Password::sendResetLink(['email' => $email]);
            });

            return new MemberAccountProvision($user->fresh(), true, false);
        });
    }

    public function grantOrganizationRole(User $user, Role $role, User $actor): bool
    {
        $wasPreexisting = $user->hasRole($role);
        $before = $user->getRoleNames()->values()->all();

        $memberRole = RoleName::find(self::MEMBER_ROLE);

        if (
            RoleName::normalize($role->name) !== self::MEMBER_ROLE
            && $memberRole
            && $user->hasRole($memberRole)
        ) {
            $user->removeRole($memberRole);
        }

        if (! $wasPreexisting) {
            $user->assignRole($role);
        }

        if (! $user->is_active) {
            $user->update(['is_active' => true]);
        }

        $this->organizationAuditLogger->log(
            'organization.role.assigned',
            $user,
            $actor,
            ['roles' => $before],
            [
                'roles' => $user->fresh()->getRoleNames()->values()->all(),
                'managed_role' => $role->name,
                'role_was_preexisting' => $wasPreexisting,
            ]
        );

        return $wasPreexisting;
    }

    public function revokeOrganizationAccess(
        User $user,
        ?Role $managedRole,
        bool $roleWasPreexisting,
        bool $restoreActive,
        User $actor
    ): User {
        $before = [
            'roles' => $user->getRoleNames()->values()->all(),
            'is_active' => (bool) $user->is_active,
        ];

        if ($managedRole && ! $roleWasPreexisting && $user->hasRole($managedRole)) {
            $user->removeRole($managedRole);
        }

        $memberRole = RoleName::find(self::MEMBER_ROLE);

        if (! $memberRole) {
            throw new UserAccessException('Role anggota belum tersedia pada master role.');
        }

        if (! $user->hasRole($memberRole)) {
            $user->assignRole($memberRole);
        }

        $user->forceFill([
            'is_active' => $restoreActive,
            'remember_token' => Str::random(60),
        ])->save();

        $this->invalidateSessions($user);

        $this->organizationAuditLogger->log(
            'organization.role.revoked',
            $user,
            $actor,
            $before,
            [
                'roles' => $user->fresh()->getRoleNames()->values()->all(),
                'is_active' => (bool) $user->fresh()->is_active,
                'managed_role' => $managedRole?->name,
                'role_was_preexisting' => $roleWasPreexisting,
            ]
        );

        return $user->fresh();
    }

    public function invalidateSessions(User $user): void
    {
        $sessionTable = (string) config('session.table', 'sessions');

        if (Schema::hasTable($sessionTable)) {
            DB::table($sessionTable)->where('user_id', $user->id)->delete();
        }

        if (Schema::hasTable('personal_access_tokens')) {
            DB::table('personal_access_tokens')
                ->where('tokenable_type', $user->getMorphClass())
                ->where('tokenable_id', $user->id)
                ->delete();
        }
    }
}
