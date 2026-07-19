<?php

namespace App\Http\Resources\Organization;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationUnitPositionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'period_id' => $this->period_id,
            'organization_unit_id' => $this->organization_unit_id,
            'position_id' => $this->position_id,
            'title' => $this->display_title,
            'custom_title' => $this->custom_title,
            'display_order' => (int) $this->display_order,
            'is_required' => (bool) $this->is_required,
            'is_active' => (bool) $this->is_active,
            'position' => $this->whenLoaded('position', fn () => $this->position ? [
                'id' => $this->position->id,
                'name' => $this->position->name,
                'code' => $this->position->code,
                'level' => $this->position->level,
                'is_leadership' => (bool) $this->position->is_leadership,
            ] : null),
            'assignment' => $this->whenLoaded(
                'assignments',
                fn () => OrganizationAssignmentResource::make($this->assignments->first())
            ),
        ];
    }
}
