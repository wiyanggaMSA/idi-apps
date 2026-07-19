<?php

namespace App\Services\Organization;

use App\Models\OrganizationAssignment;
use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Models\OrganizationUnitPosition;
use Illuminate\Support\Collection;

class OrganizationHierarchyValidator
{
    /**
     * @param  Collection<int, OrganizationUnit>  $units
     * @return list<array{field: string, code: string, message: string, unit_id: int, unit_name: string}>
     */
    public function structureIssues(OrganizationPeriod $period, Collection $units): array
    {
        $issues = [];
        $unitsById = $units->keyBy(fn (OrganizationUnit $unit) => (int) $unit->id);

        foreach ($units->where('is_active', true) as $unit) {
            if (! $unit->parent_id) {
                continue;
            }

            $parent = $unitsById->get((int) $unit->parent_id);

            if (! $parent || (int) $parent->period_id !== (int) $period->id) {
                $issues[] = $this->structureIssue($unit, 'Parent unit tidak ditemukan pada periode yang sama.');

                continue;
            }

            if (! $parent->is_active) {
                $issues[] = $this->structureIssue($unit, 'Parent unit harus berstatus aktif.');

                continue;
            }

            $visited = [(int) $unit->id => true];
            $cursor = $parent;

            while ($cursor) {
                if (isset($visited[(int) $cursor->id])) {
                    $issues[] = $this->structureIssue($unit, 'Hierarchy unit tidak boleh circular.');

                    break;
                }

                $visited[(int) $cursor->id] = true;

                if (! $cursor->parent_id) {
                    break;
                }

                $cursor = $unitsById->get((int) $cursor->parent_id);

                if (! $cursor) {
                    $issues[] = $this->structureIssue($unit, 'Parent unit tidak ditemukan pada periode yang sama.');

                    break;
                }
            }
        }

        return $issues;
    }

    public function ensureStructureEditable(OrganizationPeriod $period): void
    {
        if ($period->isReadOnly()) {
            throw new OrganizationDomainException(
                'period_id',
                'Struktur periode yang sudah berakhir atau diarsipkan hanya dapat dibaca.'
            );
        }
    }

    public function ensureDraftTarget(OrganizationPeriod $period): void
    {
        if (! $period->isDraft()) {
            throw new OrganizationDomainException(
                'period_id',
                'Struktur hanya dapat disalin ke periode berstatus draft.'
            );
        }
    }

    public function ensureParentAllowed(
        OrganizationPeriod $period,
        ?OrganizationUnit $parent,
        ?OrganizationUnit $movingUnit = null
    ): void {
        if (! $parent) {
            return;
        }

        if ((int) $parent->period_id !== (int) $period->id) {
            throw new OrganizationDomainException(
                'parent_id',
                'Parent unit harus berada pada periode yang sama.'
            );
        }

        if (! $parent->is_active) {
            throw new OrganizationDomainException(
                'parent_id',
                'Parent unit harus berstatus aktif.'
            );
        }

        if (! $movingUnit) {
            return;
        }

        if ((int) $movingUnit->id === (int) $parent->id) {
            throw new OrganizationDomainException(
                'parent_id',
                'Unit tidak boleh menjadi parent untuk dirinya sendiri.'
            );
        }

        $parents = OrganizationUnit::query()
            ->where('period_id', $period->id)
            ->pluck('parent_id', 'id');
        $visited = [];
        $cursor = (int) $parent->id;

        while ($cursor > 0) {
            if ((int) $movingUnit->id === $cursor) {
                throw new OrganizationDomainException(
                    'parent_id',
                    'Hierarchy unit tidak boleh circular.'
                );
            }

            if (isset($visited[$cursor])) {
                throw new OrganizationDomainException(
                    'parent_id',
                    'Hierarchy unit yang dipilih sudah mengandung circular reference.'
                );
            }

            $visited[$cursor] = true;
            $next = $parents->get($cursor);
            $cursor = $next ? (int) $next : 0;
        }
    }

    public function ensureUnitDeactivatable(OrganizationUnit $unit): void
    {
        if ($unit->children()->where('is_active', true)->exists()) {
            throw new OrganizationDomainException(
                'unit',
                'Unit masih memiliki subunit aktif. Nonaktifkan atau pindahkan subunit terlebih dahulu.'
            );
        }

        if ($unit->assignments()
            ->whereIn('status', [OrganizationAssignment::STATUS_DRAFT, OrganizationAssignment::STATUS_ACTIVE])
            ->exists()) {
            throw new OrganizationDomainException(
                'unit',
                'Unit masih memiliki assignment aktif atau draft.'
            );
        }
    }

    public function ensurePositionSlotDeactivatable(OrganizationUnitPosition $slot): void
    {
        if ($slot->assignments()
            ->whereIn('status', [OrganizationAssignment::STATUS_DRAFT, OrganizationAssignment::STATUS_ACTIVE])
            ->exists()) {
            throw new OrganizationDomainException(
                'unit_position',
                'Slot jabatan masih memiliki assignment aktif atau draft.'
            );
        }
    }

    /** @return array{field: string, code: string, message: string, unit_id: int, unit_name: string} */
    private function structureIssue(OrganizationUnit $unit, string $message): array
    {
        return [
            'field' => 'parent_id',
            'code' => 'invalid_hierarchy',
            'message' => $message,
            'unit_id' => (int) $unit->id,
            'unit_name' => $unit->name,
        ];
    }
}
