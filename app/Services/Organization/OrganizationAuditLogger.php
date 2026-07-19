<?php

namespace App\Services\Organization;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class OrganizationAuditLogger
{
    public function log(
        string $event,
        Model $subject,
        User $actor,
        array $oldValues = [],
        array $newValues = [],
        ?string $reason = null
    ): void {
        activity('organization')
            ->causedBy($actor)
            ->performedOn($subject)
            ->event($event)
            ->withProperties([
                'actor_user_id' => $actor->id,
                'actor_member_id' => $actor->member?->id,
                'event' => $event,
                'entity_type' => $subject->getMorphClass(),
                'entity_id' => $subject->getKey(),
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'reason' => $reason,
                'ip_address' => request()?->ip(),
                'user_agent' => request()?->userAgent(),
            ])
            ->log($event);
    }
}
