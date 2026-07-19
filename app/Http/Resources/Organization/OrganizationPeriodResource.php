<?php

namespace App\Http\Resources\Organization;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationPeriodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'start_date' => $this->start_date?->format('Y-m-d'),
            'end_date' => $this->end_date?->format('Y-m-d'),
            'status' => $this->status,
            'is_active' => (bool) $this->is_active,
            'published_at' => $this->published_at?->toIso8601String(),
            'activated_at' => $this->activated_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'notes' => $this->notes,
            'units_count' => $this->whenCounted('units'),
            'assignments_count' => $this->whenCounted('assignments'),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ] : null),
            'updated_by' => $this->whenLoaded('updater', fn () => $this->updater ? [
                'id' => $this->updater->id,
                'name' => $this->updater->name,
            ] : null),
            'published_by' => $this->whenLoaded('publishedBy', fn () => $this->publishedBy ? [
                'id' => $this->publishedBy->id,
                'name' => $this->publishedBy->name,
            ] : null),
            'activated_by' => $this->whenLoaded('activatedBy', fn () => $this->activatedBy ? [
                'id' => $this->activatedBy->id,
                'name' => $this->activatedBy->name,
            ] : null),
            'ended_by' => $this->whenLoaded('endedBy', fn () => $this->endedBy ? [
                'id' => $this->endedBy->id,
                'name' => $this->endedBy->name,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
