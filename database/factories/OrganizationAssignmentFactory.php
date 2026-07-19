<?php

namespace Database\Factories;

use App\Models\Member;
use App\Models\OrganizationAssignment;
use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Models\OrganizationUnitPosition;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrganizationAssignmentFactory extends Factory
{
    protected $model = OrganizationAssignment::class;

    public function definition(): array
    {
        return [
            'period_id' => OrganizationPeriod::factory(),
            'organization_unit_id' => fn (array $attributes) => OrganizationUnit::factory()->create([
                'period_id' => $attributes['period_id'],
            ])->id,
            'unit_position_id' => fn (array $attributes) => OrganizationUnitPosition::factory()->create([
                'period_id' => $attributes['period_id'],
                'organization_unit_id' => $attributes['organization_unit_id'],
            ])->id,
            'member_id' => Member::factory(),
            'portal_role_id' => null,
            'role_was_preexisting' => false,
            'account_was_active' => false,
            'account_was_created' => false,
            'access_applied_at' => null,
            'access_revoked_at' => null,
            'started_at' => now()->toDateString(),
            'ended_at' => null,
            'status' => OrganizationAssignment::STATUS_DRAFT,
            'appointment_number' => null,
            'appointment_date' => null,
            'notes' => null,
            'end_reason' => null,
            'created_by' => null,
            'updated_by' => null,
            'ended_by' => null,
            'replaced_by_assignment_id' => null,
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => ['status' => OrganizationAssignment::STATUS_ACTIVE]);
    }

    public function ended(): static
    {
        return $this->state(fn () => [
            'status' => OrganizationAssignment::STATUS_ENDED,
            'ended_at' => now()->toDateString(),
        ]);
    }
}
