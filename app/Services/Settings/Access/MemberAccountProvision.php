<?php

namespace App\Services\Settings\Access;

use App\Models\User;

final readonly class MemberAccountProvision
{
    public function __construct(
        public User $user,
        public bool $wasCreated,
        public bool $wasActive,
    ) {}
}
