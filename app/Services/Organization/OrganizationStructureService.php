<?php

namespace App\Services\Organization;

use App\Models\Division;
use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Models\OrganizationUnitPosition;
use App\Models\Position;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class OrganizationStructureService
{
    public function __construct(
        private readonly OrganizationHierarchyValidator $validator,
        private readonly OrganizationAuditLogger $auditLogger
    ) {}

    public function createUnit(
        OrganizationPeriod $period,
        array $data,
        User $actor
    ): OrganizationUnit {
        return DB::transaction(function () use ($period, $data, $actor) {
            $period = $this->lockEditablePeriod($period->id);
            $parent = $this->resolveParent($data['parent_id'] ?? null);
            $this->validator->ensureParentAllowed($period, $parent);
            $masterUnitId = $this->validatedMasterUnitId($data['master_unit_id'] ?? null);

            $unit = OrganizationUnit::query()->create([
                'period_id' => $period->id,
                'parent_id' => $parent?->id,
                'master_unit_id' => $masterUnitId,
                'name' => $this->requiredString($data['name'] ?? null, 'name', 255),
                'code' => $this->nullableString($data['code'] ?? null, 'code', 255),
                'unit_type' => $this->requiredString($data['unit_type'] ?? null, 'unit_type', 50),
                'description' => $this->nullableText($data['description'] ?? null),
                'display_order' => $this->displayOrder($data['display_order'] ?? 0),
                'is_core_structure' => (bool) ($data['is_core_structure'] ?? false),
                'is_active' => true,
                'created_by' => $actor->id,
                'updated_by' => $actor->id,
            ]);

            $this->touchPeriod($period, $actor);
            $this->auditLogger->log(
                'organization.unit.created',
                $unit,
                $actor,
                newValues: $unit->only([
                    'period_id', 'parent_id', 'master_unit_id', 'name', 'code', 'unit_type',
                    'display_order', 'is_core_structure', 'is_active',
                ])
            );

            return $unit->fresh(['parent', 'masterUnit', 'unitPositions']);
        });
    }

    public function updateUnit(
        OrganizationUnit $unit,
        array $data,
        User $actor
    ): OrganizationUnit {
        return DB::transaction(function () use ($unit, $data, $actor) {
            $period = $this->lockEditablePeriod($unit->period_id);
            $unit = OrganizationUnit::query()
                ->whereKey($unit->id)
                ->lockForUpdate()
                ->firstOrFail();
            $before = $unit->only([
                'parent_id', 'master_unit_id', 'name', 'code', 'unit_type', 'description',
                'display_order', 'is_core_structure', 'is_active',
            ]);

            $payload = ['updated_by' => $actor->id];

            if (array_key_exists('parent_id', $data)) {
                $parent = $this->resolveParent($data['parent_id']);
                $this->validator->ensureParentAllowed($period, $parent, $unit);
                $payload['parent_id'] = $parent?->id;
            }
            if (array_key_exists('name', $data)) {
                $payload['name'] = $this->requiredString($data['name'], 'name', 255);
            }
            if (array_key_exists('code', $data)) {
                $payload['code'] = $this->nullableString($data['code'], 'code', 255);
            }
            if (array_key_exists('unit_type', $data)) {
                $payload['unit_type'] = $this->requiredString($data['unit_type'], 'unit_type', 50);
            }
            if (array_key_exists('description', $data)) {
                $payload['description'] = $this->nullableText($data['description']);
            }
            if (array_key_exists('display_order', $data)) {
                $payload['display_order'] = $this->displayOrder($data['display_order']);
            }
            if (array_key_exists('is_core_structure', $data)) {
                $payload['is_core_structure'] = (bool) $data['is_core_structure'];
            }
            if (array_key_exists('master_unit_id', $data)) {
                $payload['master_unit_id'] = $this->validatedMasterUnitId($data['master_unit_id']);
            }

            $unit->update($payload);
            $this->touchPeriod($period, $actor);
            $this->auditLogger->log(
                'organization.unit.updated',
                $unit,
                $actor,
                $before,
                $unit->only(array_keys($before))
            );

            return $unit->fresh(['parent', 'masterUnit', 'unitPositions']);
        });
    }

    public function moveUnit(
        OrganizationUnit $unit,
        ?OrganizationUnit $newParent,
        int $displayOrder,
        User $actor
    ): OrganizationUnit {
        return DB::transaction(function () use ($unit, $newParent, $displayOrder, $actor) {
            $period = $this->lockEditablePeriod($unit->period_id);
            $unit = OrganizationUnit::query()
                ->whereKey($unit->id)
                ->lockForUpdate()
                ->firstOrFail();
            $newParent = $newParent
                ? OrganizationUnit::query()->whereKey($newParent->id)->lockForUpdate()->firstOrFail()
                : null;
            $before = $unit->only(['parent_id', 'display_order']);

            $this->validator->ensureParentAllowed($period, $newParent, $unit);

            $unit->update([
                'parent_id' => $newParent?->id,
                'display_order' => $this->displayOrder($displayOrder),
                'updated_by' => $actor->id,
            ]);
            $this->touchPeriod($period, $actor);
            $this->auditLogger->log(
                'organization.unit.moved',
                $unit,
                $actor,
                $before,
                $unit->only(['parent_id', 'display_order'])
            );

            return $unit->fresh(['parent', 'children']);
        });
    }

    public function deactivateUnit(OrganizationUnit $unit, User $actor): OrganizationUnit
    {
        return DB::transaction(function () use ($unit, $actor) {
            $period = $this->lockEditablePeriod($unit->period_id);
            $unit = OrganizationUnit::query()
                ->whereKey($unit->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->validator->ensureUnitDeactivatable($unit);

            $unit->unitPositions()->where('is_active', true)->update(['is_active' => false]);
            $unit->update([
                'is_active' => false,
                'updated_by' => $actor->id,
            ]);
            $this->touchPeriod($period, $actor);
            $this->auditLogger->log(
                'organization.unit.deactivated',
                $unit,
                $actor,
                ['is_active' => true],
                ['is_active' => false]
            );

            return $unit->fresh(['unitPositions']);
        });
    }

    public function addPosition(
        OrganizationUnit $unit,
        array $data,
        User $actor
    ): OrganizationUnitPosition {
        return DB::transaction(function () use ($unit, $data, $actor) {
            $period = $this->lockEditablePeriod($unit->period_id);
            $unit = OrganizationUnit::query()
                ->whereKey($unit->id)
                ->lockForUpdate()
                ->firstOrFail();
            $this->ensureUnitActive($unit);
            $position = $this->resolveActivePosition($data['position_id'] ?? null);

            $slot = OrganizationUnitPosition::query()->create([
                'period_id' => $period->id,
                'organization_unit_id' => $unit->id,
                'position_id' => $position->id,
                'custom_title' => $this->nullableString($data['custom_title'] ?? null, 'custom_title', 255),
                'display_order' => $this->displayOrder($data['display_order'] ?? 0),
                'is_required' => (bool) ($data['is_required'] ?? false),
                'is_active' => true,
            ]);
            $this->touchPeriod($period, $actor);
            $this->auditLogger->log(
                'organization.position.created',
                $slot,
                $actor,
                newValues: $slot->only([
                    'period_id', 'organization_unit_id', 'position_id', 'custom_title',
                    'display_order', 'is_required', 'is_active',
                ])
            );

            return $slot->fresh(['period', 'organizationUnit', 'position']);
        });
    }

    public function updatePosition(
        OrganizationUnitPosition $slot,
        array $data,
        User $actor
    ): OrganizationUnitPosition {
        return DB::transaction(function () use ($slot, $data, $actor) {
            $period = $this->lockEditablePeriod($slot->period_id);
            $slot = OrganizationUnitPosition::query()
                ->whereKey($slot->id)
                ->lockForUpdate()
                ->firstOrFail();
            $before = $slot->only([
                'position_id', 'custom_title', 'display_order', 'is_required', 'is_active',
            ]);
            $this->ensureUnitActive($slot->organizationUnit()->firstOrFail());

            $payload = [];
            if (array_key_exists('position_id', $data)) {
                $payload['position_id'] = $this->resolveActivePosition($data['position_id'])->id;
            }
            if (array_key_exists('custom_title', $data)) {
                $payload['custom_title'] = $this->nullableString($data['custom_title'], 'custom_title', 255);
            }
            if (array_key_exists('display_order', $data)) {
                $payload['display_order'] = $this->displayOrder($data['display_order']);
            }
            if (array_key_exists('is_required', $data)) {
                $payload['is_required'] = (bool) $data['is_required'];
            }

            $slot->update($payload);
            $this->touchPeriod($period, $actor);
            $this->auditLogger->log(
                'organization.position.updated',
                $slot,
                $actor,
                $before,
                $slot->only(array_keys($before))
            );

            return $slot->fresh(['period', 'organizationUnit', 'position']);
        });
    }

    public function deactivatePosition(
        OrganizationUnitPosition $slot,
        User $actor
    ): OrganizationUnitPosition {
        return DB::transaction(function () use ($slot, $actor) {
            $period = $this->lockEditablePeriod($slot->period_id);
            $slot = OrganizationUnitPosition::query()
                ->whereKey($slot->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->validator->ensurePositionSlotDeactivatable($slot);
            $slot->update(['is_active' => false]);
            $this->touchPeriod($period, $actor);
            $this->auditLogger->log(
                'organization.position.updated',
                $slot,
                $actor,
                ['is_active' => true],
                ['is_active' => false]
            );

            return $slot->fresh(['position']);
        });
    }

    private function lockEditablePeriod(int $periodId): OrganizationPeriod
    {
        $period = OrganizationPeriod::query()
            ->whereKey($periodId)
            ->lockForUpdate()
            ->firstOrFail();
        $this->validator->ensureStructureEditable($period);

        return $period;
    }

    private function resolveParent(mixed $parentId): ?OrganizationUnit
    {
        if ($parentId === null || $parentId === '') {
            return null;
        }

        if (! is_numeric($parentId)) {
            throw new OrganizationDomainException('parent_id', 'Parent unit tidak valid.');
        }

        return OrganizationUnit::query()
            ->whereKey((int) $parentId)
            ->lockForUpdate()
            ->firstOrFail();
    }

    private function validatedMasterUnitId(mixed $masterUnitId): ?int
    {
        if ($masterUnitId === null || $masterUnitId === '') {
            return null;
        }

        if (! is_numeric($masterUnitId)) {
            throw new OrganizationDomainException('master_unit_id', 'Master unit tidak valid.');
        }

        $division = Division::query()->active()->find((int) $masterUnitId);

        if (! $division) {
            throw new OrganizationDomainException(
                'master_unit_id',
                'Master unit harus berasal dari division yang aktif.'
            );
        }

        return $division->id;
    }

    private function resolveActivePosition(mixed $positionId): Position
    {
        if (! is_numeric($positionId)) {
            throw new OrganizationDomainException('position_id', 'Jabatan wajib dipilih.');
        }

        $position = Position::query()->active()->find((int) $positionId);

        if (! $position) {
            throw new OrganizationDomainException(
                'position_id',
                'Jabatan harus berasal dari master jabatan yang aktif.'
            );
        }

        return $position;
    }

    private function ensureUnitActive(OrganizationUnit $unit): void
    {
        if (! $unit->is_active) {
            throw new OrganizationDomainException('unit', 'Unit harus berstatus aktif.');
        }
    }

    private function requiredString(mixed $value, string $field, int $maxLength): string
    {
        $value = trim((string) $value);

        if ($value === '' || mb_strlen($value) > $maxLength) {
            throw new OrganizationDomainException(
                $field,
                "{$field} wajib diisi dan maksimal {$maxLength} karakter."
            );
        }

        return $value;
    }

    private function nullableString(mixed $value, string $field, int $maxLength): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        if (mb_strlen($value) > $maxLength) {
            throw new OrganizationDomainException(
                $field,
                "{$field} maksimal {$maxLength} karakter."
            );
        }

        return $value;
    }

    private function nullableText(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    private function displayOrder(mixed $value): int
    {
        if (! is_numeric($value) || (int) $value < 0) {
            throw new OrganizationDomainException(
                'display_order',
                'Urutan tampilan harus berupa bilangan nol atau lebih.'
            );
        }

        return (int) $value;
    }

    private function touchPeriod(OrganizationPeriod $period, User $actor): void
    {
        $period->forceFill(['updated_by' => $actor->id])->save();
    }
}
