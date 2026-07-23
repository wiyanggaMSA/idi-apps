<?php

namespace App\Support;

use App\Models\User;
use Spatie\Permission\Models\Role;

class RoleName
{
    public const SUPERADMIN = 'superadmin';

    public const ADMIN = 'admin';

    public const SECRETARY = 'sekretaris';

    public const CHAIR = 'ketua';

    public const TREASURER = 'bendahara';

    public const MEMBER = 'anggota';

    public const DEFAULT_ROLES = [
        self::SUPERADMIN,
        self::ADMIN,
        self::SECRETARY,
        self::CHAIR,
        self::TREASURER,
        self::MEMBER,
    ];

    public static function normalize(string $role): string
    {
        return mb_strtolower(trim($role));
    }

    public static function is(User $user, string $role): bool
    {
        $needle = self::normalize($role);

        return $user->getRoleNames()
            ->map(fn (string $name) => self::normalize($name))
            ->contains($needle);
    }

    public static function hasAny(User $user, array $roles): bool
    {
        $needles = collect($roles)
            ->map(fn (string $name) => self::normalize($name))
            ->all();

        return $user->getRoleNames()
            ->map(fn (string $name) => self::normalize($name))
            ->intersect($needles)
            ->isNotEmpty();
    }

    public static function query(string $role)
    {
        return Role::query()
            ->whereRaw('lower(name) = ?', [self::normalize($role)])
            ->where('guard_name', 'web');
    }

    public static function find(string $role): ?Role
    {
        return self::query($role)->first();
    }

    public static function findOrFail(string $role): Role
    {
        return self::query($role)->firstOrFail();
    }

    public static function display(string $role): string
    {
        return collect(preg_split('/[\s_-]+/', trim($role)) ?: [])
            ->filter()
            ->map(fn (string $word) => mb_convert_case($word, MB_CASE_TITLE, 'UTF-8'))
            ->implode(' ');
    }
}
