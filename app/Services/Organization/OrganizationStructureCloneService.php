<?php

namespace App\Services\Organization;

use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Models\OrganizationUnitPosition;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class OrganizationStructureCloneService
{
    public function __construct(
        private readonly OrganizationHierarchyValidator $validator,
        private readonly OrganizationAuditLogger $auditLogger
    ) {}

    public function clone(
        OrganizationPeriod $source,
        OrganizationPeriod $target,
        User $actor
    ): OrganizationPeriod {
        return DB::transaction(function () use ($source, $target, $actor) {
            if ((int) $source->id === (int) $target->id) {
                throw new OrganizationDomainException(
                    'source_period_id',
                    'Periode sumber dan tujuan harus berbeda.'
                );
            }

            $source = OrganizationPeriod::query()
                ->whereKey($source->id)
                ->lockForUpdate()
                ->firstOrFail();
            $target = OrganizationPeriod::query()
                ->whereKey($target->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->validator->ensureDraftTarget($target);

            if ($target->units()->withTrashed()->exists()) {
                throw new OrganizationDomainException(
                    'target_period_id',
                    'Periode tujuan harus belum memiliki struktur.'
                );
            }

            $sourceUnits = OrganizationUnit::query()
                ->where('period_id', $source->id)
                ->where('is_active', true)
                ->orderBy('display_order')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();
            $sourceUnitIds = $sourceUnits->pluck('id');
            $sourceSlots = OrganizationUnitPosition::query()
                ->where('period_id', $source->id)
                ->whereIn('organization_unit_id', $sourceUnitIds)
                ->where('is_active', true)
                ->orderBy('display_order')
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->groupBy('organization_unit_id');

            $pending = $sourceUnits->keyBy('id');
            $unitMap = [];

            while ($pending->isNotEmpty()) {
                $copiedInPass = 0;

                foreach ($pending as $sourceUnitId => $sourceUnit) {
                    if ($sourceUnit->parent_id && ! isset($unitMap[$sourceUnit->parent_id])) {
                        continue;
                    }

                    $clonedUnit = OrganizationUnit::query()->create([
                        'period_id' => $target->id,
                        'parent_id' => $sourceUnit->parent_id
                            ? $unitMap[$sourceUnit->parent_id]
                            : null,
                        'master_unit_id' => $sourceUnit->master_unit_id,
                        'name' => $sourceUnit->name,
                        'code' => $sourceUnit->code,
                        'unit_type' => $sourceUnit->unit_type,
                        'description' => $sourceUnit->description,
                        'display_order' => $sourceUnit->display_order,
                        'is_core_structure' => $sourceUnit->is_core_structure,
                        'is_active' => true,
                        'created_by' => $actor->id,
                        'updated_by' => $actor->id,
                    ]);
                    $unitMap[$sourceUnitId] = $clonedUnit->id;

                    foreach ($sourceSlots->get($sourceUnitId, collect()) as $sourceSlot) {
                        OrganizationUnitPosition::query()->create([
                            'period_id' => $target->id,
                            'organization_unit_id' => $clonedUnit->id,
                            'position_id' => $sourceSlot->position_id,
                            'custom_title' => $sourceSlot->custom_title,
                            'display_order' => $sourceSlot->display_order,
                            'is_required' => $sourceSlot->is_required,
                            'is_active' => true,
                        ]);
                    }

                    $pending->forget($sourceUnitId);
                    $copiedInPass++;
                }

                if ($copiedInPass === 0) {
                    throw new OrganizationDomainException(
                        'source_period_id',
                        'Struktur sumber mengandung parent yang hilang atau circular reference.'
                    );
                }
            }

            $target->forceFill(['updated_by' => $actor->id])->save();

            $this->auditLogger->log(
                'organization.structure.cloned',
                $target,
                $actor,
                newValues: [
                    'source_period_id' => $source->id,
                    'units_count' => count($unitMap),
                    'assignments_count' => 0,
                ]
            );

            return $target->fresh([
                'units' => fn ($query) => $query
                    ->with('unitPositions')
                    ->orderBy('display_order')
                    ->orderBy('id'),
            ]);
        });
    }
}
