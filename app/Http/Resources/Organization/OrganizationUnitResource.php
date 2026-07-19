<?php

namespace App\Http\Resources\Organization;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationUnitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'period_id' => $this->period_id,
            'parent_id' => $this->parent_id,
            'master_unit_id' => $this->master_unit_id,
            'name' => $this->name,
            'code' => $this->code,
            'unit_type' => $this->unit_type,
            'description' => $this->description,
            'display_order' => (int) $this->display_order,
            'is_core_structure' => (bool) $this->is_core_structure,
            'is_active' => (bool) $this->is_active,
            'parent' => $this->whenLoaded('parent', fn () => $this->parent ? [
                'id' => $this->parent->id,
                'name' => $this->parent->name,
            ] : null),
            'master_unit' => $this->whenLoaded('masterUnit', fn () => $this->masterUnit ? [
                'id' => $this->masterUnit->id,
                'name' => $this->masterUnit->name,
                'code' => $this->masterUnit->code,
            ] : null),
            'positions' => OrganizationUnitPositionResource::collection(
                $this->whenLoaded('unitPositions')
            ),
            'children' => self::collection($this->whenLoaded('children')),
            'positions_count' => $this->when(
                isset($this->positions_count),
                fn () => (int) $this->positions_count
            ),
            'filled_positions_count' => $this->when(
                isset($this->filled_positions_count),
                fn () => (int) $this->filled_positions_count
            ),
            'children_count' => $this->when(
                isset($this->children_count),
                fn () => (int) $this->children_count
            ),
        ];
    }
}
