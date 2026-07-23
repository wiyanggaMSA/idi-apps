<?php

namespace App\Services\Organization;

use App\Models\Member;
use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Models\OrganizationUnitPosition;
use App\Support\RoleName;
use Carbon\CarbonImmutable;
use Spatie\Permission\Models\Role;

class OrganizationAssignmentValidator
{
    /**
     * @return array{started_at: string, appointment_date: ?string}
     */
    public function validate(
        OrganizationPeriod $period,
        OrganizationUnit $unit,
        OrganizationUnitPosition $slot,
        Member $member,
        Role $role,
        mixed $startedAt,
        mixed $appointmentDate = null
    ): array {
        if ($period->isReadOnly()) {
            throw new OrganizationDomainException(
                'period_id',
                'Assignment tidak dapat diubah pada periode yang sudah berakhir atau diarsipkan.'
            );
        }

        if (! in_array($period->status, [
            OrganizationPeriod::STATUS_DRAFT,
            OrganizationPeriod::STATUS_PUBLISHED,
            OrganizationPeriod::STATUS_ACTIVE,
        ], true)) {
            throw new OrganizationDomainException('period_id', 'Status periode tidak mendukung assignment.');
        }

        if (($period->status === OrganizationPeriod::STATUS_ACTIVE) !== (bool) $period->is_active) {
            throw new OrganizationDomainException(
                'period_id',
                'Status aktif periode tidak konsisten. Perbaiki periode sebelum mengelola assignment.'
            );
        }

        if ((int) $unit->period_id !== (int) $period->id || ! $unit->is_active) {
            throw new OrganizationDomainException(
                'organization_unit_id',
                'Unit tidak aktif atau tidak berada pada periode yang dipilih.'
            );
        }

        if (
            (int) $slot->period_id !== (int) $period->id
            || (int) $slot->organization_unit_id !== (int) $unit->id
            || ! $slot->is_active
            || ! $this->positionIsActive($slot)
        ) {
            throw new OrganizationDomainException(
                'unit_position_id',
                'Slot jabatan tidak aktif atau tidak berada pada unit dan periode yang dipilih.'
            );
        }

        if (! $this->memberIsActive($member)) {
            throw new OrganizationDomainException(
                'member_id',
                'Hanya member aktif yang dapat ditetapkan sebagai pengurus.'
            );
        }

        if ($role->guard_name !== 'web' || RoleName::normalize($role->name) === RoleName::MEMBER) {
            throw new OrganizationDomainException(
                'portal_role_id',
                'Role portal pengurus tidak valid.'
            );
        }

        $startedAt = $this->date($startedAt, 'started_at', 'Tanggal mulai assignment wajib valid.');

        if ($startedAt->lt($period->start_date) || $startedAt->gt($period->end_date)) {
            throw new OrganizationDomainException(
                'started_at',
                'Tanggal mulai assignment harus berada dalam rentang periode.'
            );
        }

        $normalizedAppointmentDate = null;

        if ($appointmentDate !== null && $appointmentDate !== '') {
            $normalizedAppointmentDate = $this->date(
                $appointmentDate,
                'appointment_date',
                'Tanggal SK harus valid.'
            )->toDateString();
        }

        return [
            'started_at' => $startedAt->toDateString(),
            'appointment_date' => $normalizedAppointmentDate,
        ];
    }

    public function validateEndDate(
        OrganizationPeriod $period,
        mixed $endedAt,
        mixed $startedAt
    ): string {
        $endedAt = $this->date($endedAt, 'ended_at', 'Tanggal akhir assignment wajib valid.');
        $startedAt = $this->date($startedAt, 'started_at', 'Tanggal mulai assignment tidak valid.');

        if ($endedAt->lt($startedAt)) {
            throw new OrganizationDomainException(
                'ended_at',
                'Tanggal akhir assignment tidak boleh sebelum tanggal mulai.'
            );
        }

        if ($endedAt->lt($period->start_date) || $endedAt->gt($period->end_date)) {
            throw new OrganizationDomainException(
                'ended_at',
                'Tanggal akhir assignment harus berada dalam rentang periode.'
            );
        }

        return $endedAt->toDateString();
    }

    private function date(mixed $value, string $field, string $message): CarbonImmutable
    {
        if ($value === null || $value === '') {
            throw new OrganizationDomainException($field, $message);
        }

        try {
            return CarbonImmutable::parse($value)->startOfDay();
        } catch (\Throwable $exception) {
            throw new OrganizationDomainException($field, $message, previous: $exception);
        }
    }

    private function positionIsActive(OrganizationUnitPosition $slot): bool
    {
        if ($slot->relationLoaded('position')) {
            return (bool) $slot->position?->is_active;
        }

        return $slot->position()->active()->exists();
    }

    private function memberIsActive(Member $member): bool
    {
        return $member->hasAssignableActiveStatus();
    }
}
