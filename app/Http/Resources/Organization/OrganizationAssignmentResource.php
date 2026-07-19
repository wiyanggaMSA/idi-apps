<?php

namespace App\Http\Resources\Organization;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationAssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'period_id' => $this->period_id,
            'organization_unit_id' => $this->organization_unit_id,
            'unit_position_id' => $this->unit_position_id,
            'member_id' => $this->member_id,
            'portal_role_id' => $this->portal_role_id,
            'started_at' => $this->started_at?->format('Y-m-d'),
            'ended_at' => $this->ended_at?->format('Y-m-d'),
            'status' => $this->status,
            'appointment_number' => $this->appointment_number,
            'appointment_date' => $this->appointment_date?->format('Y-m-d'),
            'notes' => $this->notes,
            'end_reason' => $this->end_reason,
            'replaced_by_assignment_id' => $this->replaced_by_assignment_id,
            'replacement' => $this->whenLoaded('replacedBy', fn () => $this->replacedBy ? [
                'id' => $this->replacedBy->id,
                'member' => $this->replacedBy->relationLoaded('member') && $this->replacedBy->member ? [
                    'id' => $this->replacedBy->member->id,
                    'full_name' => $this->replacedBy->member->full_name,
                    'education' => $this->replacedBy->member->education,
                ] : null,
            ] : null),
            'account_access' => [
                'applied_at' => $this->access_applied_at?->toIso8601String(),
                'revoked_at' => $this->access_revoked_at?->toIso8601String(),
            ],
            'period' => $this->whenLoaded('period', fn () => $this->period ? [
                'id' => $this->period->id,
                'name' => $this->period->name,
                'status' => $this->period->status,
            ] : null),
            'unit' => $this->whenLoaded('organizationUnit', fn () => $this->organizationUnit ? [
                'id' => $this->organizationUnit->id,
                'name' => $this->organizationUnit->name,
                'is_core_structure' => (bool) $this->organizationUnit->is_core_structure,
            ] : null),
            'position' => $this->whenLoaded('unitPosition', fn () => $this->unitPosition ? [
                'id' => $this->unitPosition->id,
                'title' => $this->unitPosition->display_title,
                'position_id' => $this->unitPosition->position_id,
            ] : null),
            'member' => $this->whenLoaded('member', fn () => $this->member ? [
                'id' => $this->member->id,
                'npa' => $this->member->npa,
                'full_name' => $this->member->full_name,
                'education' => $this->member->education,
                'email' => $this->member->email,
                'phone' => $this->member->phone,
                'account' => $this->member->relationLoaded('user') ? [
                    'exists' => $this->member->user !== null,
                    'is_active' => (bool) $this->member->user?->is_active,
                ] : null,
            ] : null),
            'role' => $this->whenLoaded('portalRole', fn () => $this->portalRole ? [
                'id' => $this->portalRole->id,
                'name' => $this->portalRole->name,
            ] : null),
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'ended_by' => $this->ended_by,
            'created_by_actor' => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ] : null),
            'updated_by_actor' => $this->whenLoaded('updater', fn () => $this->updater ? [
                'id' => $this->updater->id,
                'name' => $this->updater->name,
            ] : null),
            'ended_by_actor' => $this->whenLoaded('endedBy', fn () => $this->endedBy ? [
                'id' => $this->endedBy->id,
                'name' => $this->endedBy->name,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
