<?php

namespace App\Services\Organization;

use App\Models\Member;
use App\Models\OrganizationAssignment;
use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Models\OrganizationUnitPosition;
use App\Models\User;
use App\Services\Settings\Access\UserAccessException;
use App\Services\Settings\Access\UserAccessService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class OrganizationAssignmentService
{
    public function __construct(
        private readonly OrganizationAssignmentValidator $validator,
        private readonly UserAccessService $userAccessService,
        private readonly OrganizationAuditLogger $auditLogger
    ) {}

    public function assign(array $data, User $actor): OrganizationAssignment
    {
        return DB::transaction(function () use ($data, $actor) {
            $context = $this->lockedContext($data);

            return $this->createAssignment($context, $data, $actor);
        });
    }

    public function update(
        OrganizationAssignment $assignment,
        array $data,
        User $actor
    ): OrganizationAssignment {
        return DB::transaction(function () use ($assignment, $data, $actor) {
            $assignment = OrganizationAssignment::query()
                ->whereKey($assignment->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $assignment->isCurrent()) {
                throw new OrganizationDomainException(
                    'assignment_id',
                    'Hanya assignment berjalan yang dapat diperbarui.'
                );
            }

            $context = $this->lockedContext([
                'period_id' => $assignment->period_id,
                'organization_unit_id' => $assignment->organization_unit_id,
                'unit_position_id' => $assignment->unit_position_id,
                'member_id' => $assignment->member_id,
                'portal_role_id' => $assignment->portal_role_id,
            ]);
            $normalized = $this->validator->validate(
                $context['period'],
                $context['unit'],
                $context['slot'],
                $context['member'],
                $context['role'],
                $data['started_at'] ?? $assignment->started_at,
                array_key_exists('appointment_date', $data)
                    ? $data['appointment_date']
                    : $assignment->appointment_date
            );
            $this->assertNoCurrentConflict(
                $context['period'],
                $context['member'],
                $context['slot'],
                $assignment->id
            );
            $before = $assignment->only([
                'started_at', 'appointment_number', 'appointment_date', 'notes',
            ]);
            $payload = ['started_at' => $normalized['started_at'], 'updated_by' => $actor->id];

            if (array_key_exists('appointment_number', $data)) {
                $payload['appointment_number'] = $this->nullableText($data['appointment_number']);
            }
            if (array_key_exists('appointment_date', $data)) {
                $payload['appointment_date'] = $normalized['appointment_date'];
            }
            if (array_key_exists('notes', $data)) {
                $payload['notes'] = $this->nullableText($data['notes']);
            }

            $assignment->update($payload);
            $this->auditLogger->log(
                'organization.assignment.updated',
                $assignment,
                $actor,
                $before,
                $assignment->only(array_keys($before))
            );

            return $assignment->fresh($this->relations());
        });
    }

    public function activateDraft(
        OrganizationAssignment $assignment,
        User $actor
    ): OrganizationAssignment {
        return DB::transaction(function () use ($assignment, $actor) {
            $assignment = OrganizationAssignment::query()
                ->whereKey($assignment->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($assignment->status === OrganizationAssignment::STATUS_ACTIVE) {
                return $assignment->fresh($this->relations());
            }

            if ($assignment->status !== OrganizationAssignment::STATUS_DRAFT) {
                throw new OrganizationDomainException(
                    'assignment_id',
                    'Hanya assignment draft yang dapat diaktifkan.'
                );
            }

            $context = $this->lockedContext([
                'period_id' => $assignment->period_id,
                'organization_unit_id' => $assignment->organization_unit_id,
                'unit_position_id' => $assignment->unit_position_id,
                'member_id' => $assignment->member_id,
                'portal_role_id' => $assignment->portal_role_id,
            ]);

            if (! $context['period']->isActive()) {
                throw new OrganizationDomainException(
                    'period_id',
                    'Assignment baru dapat diaktifkan setelah periodenya aktif.'
                );
            }

            $this->validator->validate(
                $context['period'],
                $context['unit'],
                $context['slot'],
                $context['member'],
                $context['role'],
                $assignment->started_at,
                $assignment->appointment_date
            );
            $this->assertNoCurrentConflict($context['period'], $context['member'], $context['slot'], $assignment->id);

            $this->applyAccess($assignment, $context, $actor);
            $assignment->update([
                'status' => OrganizationAssignment::STATUS_ACTIVE,
                'updated_by' => $actor->id,
            ]);

            $this->auditLogger->log(
                'organization.assignment.activated',
                $assignment,
                $actor,
                ['status' => OrganizationAssignment::STATUS_DRAFT],
                $this->auditProperties($assignment)
            );

            return $assignment->fresh($this->relations());
        });
    }

    public function replace(
        OrganizationAssignment $assignment,
        array $data,
        User $actor
    ): OrganizationAssignment {
        return DB::transaction(function () use ($assignment, $data, $actor) {
            $assignment = OrganizationAssignment::query()
                ->whereKey($assignment->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($assignment->status !== OrganizationAssignment::STATUS_ACTIVE || $assignment->ended_at) {
                throw new OrganizationDomainException(
                    'assignment_id',
                    'Hanya assignment aktif yang dapat diganti.'
                );
            }

            $replacementDate = $data['started_at'] ?? null;
            $reason = $this->nullableText($data['reason'] ?? $data['end_reason'] ?? null);
            $context = $this->lockedContext([
                'period_id' => $assignment->period_id,
                'organization_unit_id' => $assignment->organization_unit_id,
                'unit_position_id' => $assignment->unit_position_id,
                'member_id' => $data['member_id'] ?? null,
                'portal_role_id' => $data['portal_role_id'] ?? $assignment->portal_role_id,
            ]);

            if ((int) $context['member']->id === (int) $assignment->member_id) {
                throw new OrganizationDomainException(
                    'member_id',
                    'Pengganti harus merupakan member yang berbeda.'
                );
            }

            $normalized = $this->validator->validate(
                $context['period'],
                $context['unit'],
                $context['slot'],
                $context['member'],
                $context['role'],
                $replacementDate,
                $data['appointment_date'] ?? null
            );
            $endedAt = $this->validator->validateEndDate(
                $context['period'],
                $replacementDate,
                $assignment->started_at
            );
            $this->assertNoCurrentMemberConflict($context['period'], $context['member']);

            $oldMemberId = $assignment->member_id;
            $oldRoleId = $assignment->portal_role_id;
            $this->revokeAccess($assignment, $actor);
            $assignment->update([
                'status' => OrganizationAssignment::STATUS_REPLACED,
                'ended_at' => $endedAt,
                'ended_by' => $actor->id,
                'updated_by' => $actor->id,
                'end_reason' => $reason,
            ]);

            $replacement = $this->createAssignment($context, [
                ...$data,
                ...$normalized,
                'period_id' => $context['period']->id,
                'organization_unit_id' => $context['unit']->id,
                'unit_position_id' => $context['slot']->id,
                'member_id' => $context['member']->id,
                'portal_role_id' => $context['role']->id,
            ], $actor);

            $assignment->update(['replaced_by_assignment_id' => $replacement->id]);

            $this->auditLogger->log(
                'organization.assignment.replaced',
                $assignment,
                $actor,
                [
                    'period_id' => $assignment->period_id,
                    'unit_id' => $assignment->organization_unit_id,
                    'position_id' => $assignment->unitPosition->position_id,
                    'old_member_id' => $oldMemberId,
                    'old_role_id' => $oldRoleId,
                ],
                [
                    'new_member_id' => $replacement->member_id,
                    'new_role_id' => $replacement->portal_role_id,
                    'replacement_assignment_id' => $replacement->id,
                ],
                $reason
            );

            return $replacement->fresh($this->relations());
        });
    }

    public function end(
        OrganizationAssignment $assignment,
        mixed $endedAt,
        ?string $reason,
        User $actor
    ): OrganizationAssignment {
        return DB::transaction(function () use ($assignment, $endedAt, $reason, $actor) {
            $assignment = OrganizationAssignment::query()
                ->whereKey($assignment->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $assignment->isCurrent()) {
                return $assignment->fresh($this->relations());
            }

            $period = OrganizationPeriod::query()
                ->whereKey($assignment->period_id)
                ->lockForUpdate()
                ->firstOrFail();
            $normalizedEnd = $this->validator->validateEndDate($period, $endedAt, $assignment->started_at);
            $previousStatus = $assignment->status;

            if ($assignment->status === OrganizationAssignment::STATUS_ACTIVE) {
                $this->revokeAccess($assignment, $actor);
            }

            $assignment->update([
                'status' => OrganizationAssignment::STATUS_ENDED,
                'ended_at' => $normalizedEnd,
                'ended_by' => $actor->id,
                'updated_by' => $actor->id,
                'end_reason' => $this->nullableText($reason),
            ]);

            $this->auditLogger->log(
                'organization.assignment.ended',
                $assignment,
                $actor,
                ['status' => $previousStatus],
                $this->auditProperties($assignment) + ['ended_at' => $normalizedEnd],
                $this->nullableText($reason)
            );

            return $assignment->fresh($this->relations());
        });
    }

    /**
     * @param  array{period: OrganizationPeriod, unit: OrganizationUnit, slot: OrganizationUnitPosition, member: Member, role: Role}  $context
     */
    private function createAssignment(array $context, array $data, User $actor): OrganizationAssignment
    {
        $this->assertRoleAssignable($context['role'], $actor);
        $normalized = $this->validator->validate(
            $context['period'],
            $context['unit'],
            $context['slot'],
            $context['member'],
            $context['role'],
            $data['started_at'] ?? null,
            $data['appointment_date'] ?? null
        );
        $this->assertNoCurrentConflict($context['period'], $context['member'], $context['slot']);

        $status = $context['period']->isActive()
            ? OrganizationAssignment::STATUS_ACTIVE
            : OrganizationAssignment::STATUS_DRAFT;

        try {
            $assignment = OrganizationAssignment::query()->create([
                'period_id' => $context['period']->id,
                'organization_unit_id' => $context['unit']->id,
                'unit_position_id' => $context['slot']->id,
                'member_id' => $context['member']->id,
                'portal_role_id' => $context['role']->id,
                'started_at' => $normalized['started_at'],
                'status' => $status,
                'appointment_number' => $this->nullableText($data['appointment_number'] ?? null),
                'appointment_date' => $normalized['appointment_date'],
                'notes' => $this->nullableText($data['notes'] ?? null),
                'created_by' => $actor->id,
                'updated_by' => $actor->id,
            ]);
        } catch (QueryException $exception) {
            throw new OrganizationDomainException(
                'assignment',
                'Member atau slot jabatan sudah mempunyai assignment berjalan pada periode ini.',
                previous: $exception
            );
        }

        if ($status === OrganizationAssignment::STATUS_ACTIVE) {
            $this->applyAccess($assignment, $context, $actor);
        }

        $this->auditLogger->log(
            'organization.assignment.created',
            $assignment,
            $actor,
            newValues: $this->auditProperties($assignment)
        );

        return $assignment->fresh($this->relations());
    }

    /**
     * @return array{period: OrganizationPeriod, unit: OrganizationUnit, slot: OrganizationUnitPosition, member: Member, role: Role}
     */
    private function lockedContext(array $data): array
    {
        foreach ([
            'period_id',
            'organization_unit_id',
            'unit_position_id',
            'member_id',
            'portal_role_id',
        ] as $field) {
            if (empty($data[$field])) {
                throw new OrganizationDomainException($field, 'Data assignment belum lengkap.');
            }
        }

        return [
            'period' => OrganizationPeriod::query()->whereKey($data['period_id'])->lockForUpdate()->firstOrFail(),
            'unit' => OrganizationUnit::query()->whereKey($data['organization_unit_id'])->lockForUpdate()->firstOrFail(),
            'slot' => OrganizationUnitPosition::query()->whereKey($data['unit_position_id'])->lockForUpdate()->firstOrFail(),
            'member' => Member::query()->whereKey($data['member_id'])->lockForUpdate()->firstOrFail(),
            'role' => Role::query()->whereKey($data['portal_role_id'])->lockForUpdate()->firstOrFail(),
        ];
    }

    private function assertRoleAssignable(Role $role, User $actor): void
    {
        if ($role->name === 'superadmin' && ! $actor->hasRole('superadmin')) {
            throw new OrganizationDomainException(
                'portal_role_id',
                'Role superadmin hanya dapat diberikan oleh superadmin.'
            );
        }
    }

    private function assertNoCurrentConflict(
        OrganizationPeriod $period,
        Member $member,
        OrganizationUnitPosition $slot,
        ?int $exceptAssignmentId = null
    ): void {
        $this->assertNoCurrentMemberConflict($period, $member, $exceptAssignmentId);

        $query = OrganizationAssignment::query()
            ->current()
            ->where('period_id', $period->id)
            ->where('unit_position_id', $slot->id)
            ->lockForUpdate();

        if ($exceptAssignmentId) {
            $query->whereKeyNot($exceptAssignmentId);
        }

        if ($query->exists()) {
            throw new OrganizationDomainException(
                'unit_position_id',
                'Slot jabatan sudah terisi pada periode ini.'
            );
        }
    }

    private function assertNoCurrentMemberConflict(
        OrganizationPeriod $period,
        Member $member,
        ?int $exceptAssignmentId = null
    ): void {
        $query = OrganizationAssignment::query()
            ->current()
            ->where('period_id', $period->id)
            ->where('member_id', $member->id)
            ->lockForUpdate();

        if ($exceptAssignmentId) {
            $query->whereKeyNot($exceptAssignmentId);
        }

        if ($query->exists()) {
            throw new OrganizationDomainException(
                'member_id',
                'Member sudah memiliki assignment berjalan pada periode ini.'
            );
        }
    }

    /**
     * @param  array{period: OrganizationPeriod, unit: OrganizationUnit, slot: OrganizationUnitPosition, member: Member, role: Role}  $context
     */
    private function applyAccess(
        OrganizationAssignment $assignment,
        array $context,
        User $actor
    ): void {
        try {
            $provision = $this->userAccessService->ensureForMember($context['member'], $actor);
            $roleWasPreexisting = $this->userAccessService->grantOrganizationRole(
                $provision->user,
                $context['role'],
                $actor
            );
        } catch (UserAccessException $exception) {
            throw new OrganizationDomainException('member_id', $exception->getMessage(), previous: $exception);
        }

        $context['member']->update([
            'division_id' => $context['unit']->master_unit_id,
            'position_id' => $context['slot']->position_id,
        ]);
        $assignment->update([
            'role_was_preexisting' => $roleWasPreexisting,
            'account_was_active' => $provision->wasActive,
            'account_was_created' => $provision->wasCreated,
            'access_applied_at' => now(),
            'access_revoked_at' => null,
        ]);
    }

    private function revokeAccess(OrganizationAssignment $assignment, User $actor): void
    {
        $member = Member::query()->whereKey($assignment->member_id)->lockForUpdate()->firstOrFail();
        $previousPlacement = $member->only(['division_id', 'position_id']);
        $user = $member->user_id
            ? User::withTrashed()->whereKey($member->user_id)->lockForUpdate()->first()
            : null;

        if ($user) {
            if ($user->trashed()) {
                $user->restore();
            }

            $role = $assignment->portal_role_id
                ? Role::query()->whereKey($assignment->portal_role_id)->lockForUpdate()->first()
                : null;

            try {
                $this->userAccessService->revokeOrganizationAccess(
                    $user,
                    $role,
                    (bool) $assignment->role_was_preexisting,
                    (bool) $assignment->account_was_active,
                    $actor
                );
            } catch (UserAccessException $exception) {
                throw new OrganizationDomainException('portal_role_id', $exception->getMessage(), previous: $exception);
            }
        }

        $member->update([
            'division_id' => null,
            'position_id' => null,
        ]);
        $assignment->update(['access_revoked_at' => now()]);

        $this->auditLogger->log(
            'organization.member.returned_to_member',
            $member,
            $actor,
            oldValues: $previousPlacement,
            newValues: [
                'division_id' => null,
                'position_id' => null,
                'assignment_id' => $assignment->id,
            ]
        );
    }

    /**
     * @return array<string, int|null|string>
     */
    private function auditProperties(OrganizationAssignment $assignment): array
    {
        return [
            'period_id' => $assignment->period_id,
            'unit_id' => $assignment->organization_unit_id,
            'unit_position_id' => $assignment->unit_position_id,
            'member_id' => $assignment->member_id,
            'portal_role_id' => $assignment->portal_role_id,
            'status' => $assignment->status,
        ];
    }

    /**
     * @return list<string>
     */
    private function relations(): array
    {
        return ['period', 'organizationUnit', 'unitPosition.position', 'member.user', 'portalRole'];
    }

    private function nullableText(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
