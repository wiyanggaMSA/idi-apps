<?php

namespace Tests\Feature\Organization;

use App\Models\Division;
use App\Models\Member;
use App\Models\OrganizationAssignment;
use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Models\OrganizationUnitPosition;
use App\Models\Position;
use App\Models\User;
use App\Services\Organization\OrganizationDomainException;
use App\Services\Organization\OrganizationPeriodService;
use App\Services\Organization\OrganizationStructureService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationPeriodStructureServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_period_service_creates_and_updates_draft_with_valid_dates(): void
    {
        $actor = User::factory()->create();
        $service = app(OrganizationPeriodService::class);

        $period = $service->createDraft([
            'name' => 'Kepengurusan 2026–2029',
            'start_date' => '2026-01-01',
            'end_date' => '2029-12-31',
            'notes' => 'Disiapkan oleh sekretariat',
        ], $actor);

        $this->assertSame(OrganizationPeriod::STATUS_DRAFT, $period->status);
        $this->assertFalse($period->is_active);
        $this->assertSame('Disiapkan oleh sekretariat', $period->notes);
        $this->assertSame($actor->id, $period->created_by);

        $updated = $service->updateDraft($period, [
            'name' => 'Kepengurusan 2026–2030',
            'end_date' => '2030-12-31',
        ], $actor);

        $this->assertSame('Kepengurusan 2026–2030', $updated->name);
        $this->assertSame('2030-12-31', $updated->end_date->toDateString());
        $this->assertSame($actor->id, $updated->updated_by);
    }

    public function test_period_service_rejects_missing_invalid_dates_and_non_draft_update(): void
    {
        $actor = User::factory()->create();
        $service = app(OrganizationPeriodService::class);

        try {
            $service->createDraft(['name' => 'Tanpa tanggal'], $actor);
            $this->fail('Missing period dates were not rejected.');
        } catch (OrganizationDomainException $exception) {
            $this->assertSame('start_date', $exception->field());
        }

        try {
            $service->createDraft([
                'name' => 'Tanggal terbalik',
                'start_date' => '2030-01-01',
                'end_date' => '2029-01-01',
            ], $actor);
            $this->fail('Invalid date range was not rejected.');
        } catch (OrganizationDomainException $exception) {
            $this->assertSame('end_date', $exception->field());
        }

        $ended = OrganizationPeriod::factory()->ended()->create();

        $this->expectException(OrganizationDomainException::class);
        $service->updateDraft($ended, ['name' => 'Tidak boleh berubah'], $actor);
    }

    public function test_create_draft_can_clone_nested_structure_and_slots_without_assignments(): void
    {
        $actor = User::factory()->create();
        $member = Member::factory()->create();
        $division = Division::factory()->create();
        $position = Position::factory()->create();
        $source = OrganizationPeriod::factory()->ended()->create();
        $root = OrganizationUnit::factory()->core()->create([
            'period_id' => $source->id,
            'master_unit_id' => $division->id,
            'name' => 'Struktur Utama',
            'display_order' => 10,
        ]);
        $child = OrganizationUnit::factory()->create([
            'period_id' => $source->id,
            'parent_id' => $root->id,
            'name' => 'Unit Dinamis',
            'unit_type' => 'custom_unit_type',
            'display_order' => 20,
        ]);
        $slot = OrganizationUnitPosition::factory()->required()->create([
            'period_id' => $source->id,
            'organization_unit_id' => $child->id,
            'position_id' => $position->id,
            'custom_title' => 'Ketua Khusus',
            'display_order' => 5,
        ]);
        OrganizationAssignment::factory()->ended()->create([
            'period_id' => $source->id,
            'organization_unit_id' => $child->id,
            'unit_position_id' => $slot->id,
            'member_id' => $member->id,
        ]);

        $target = app(OrganizationPeriodService::class)->createDraft([
            'name' => 'Kepengurusan Baru',
            'start_date' => '2030-01-01',
            'end_date' => '2033-12-31',
        ], $actor, $source);

        $clonedRoot = $target->units->firstWhere('name', 'Struktur Utama');
        $clonedChild = $target->units->firstWhere('name', 'Unit Dinamis');

        $this->assertNotNull($clonedRoot);
        $this->assertNotNull($clonedChild);
        $this->assertSame($clonedRoot->id, $clonedChild->parent_id);
        $this->assertSame($division->id, $clonedRoot->master_unit_id);
        $this->assertSame('custom_unit_type', $clonedChild->unit_type);
        $this->assertSame('Ketua Khusus', $clonedChild->unitPositions->first()->custom_title);
        $this->assertTrue($clonedChild->unitPositions->first()->is_required);
        $this->assertSame(0, $target->assignments()->count());
        $this->assertSame(1, $source->assignments()->count());
    }

    public function test_create_draft_rolls_back_when_source_structure_is_malformed(): void
    {
        $actor = User::factory()->create();
        $source = OrganizationPeriod::factory()->create();
        $parent = OrganizationUnit::factory()->create([
            'period_id' => $source->id,
            'is_active' => false,
        ]);
        OrganizationUnit::factory()->create([
            'period_id' => $source->id,
            'parent_id' => $parent->id,
            'is_active' => true,
        ]);

        try {
            app(OrganizationPeriodService::class)->createDraft([
                'name' => 'Harus Rollback',
                'start_date' => '2030-01-01',
                'end_date' => '2033-12-31',
            ], $actor, $source);
            $this->fail('Malformed structure was not rejected.');
        } catch (OrganizationDomainException $exception) {
            $this->assertSame('source_period_id', $exception->field());
        }

        $this->assertDatabaseMissing('organization_periods', ['name' => 'Harus Rollback']);
    }

    public function test_clone_requires_an_empty_draft_target_and_never_appends_duplicates(): void
    {
        $actor = User::factory()->create();
        $service = app(OrganizationPeriodService::class);
        $source = OrganizationPeriod::factory()->create();
        $target = OrganizationPeriod::factory()->create();
        OrganizationUnit::factory()->create(['period_id' => $source->id]);
        OrganizationUnit::factory()->create(['period_id' => $target->id]);

        try {
            $service->cloneStructure($source, $target, $actor);
            $this->fail('Clone into a non-empty target was not rejected.');
        } catch (OrganizationDomainException $exception) {
            $this->assertSame('target_period_id', $exception->field());
        }

        $this->assertSame(1, $target->units()->count());

        $publishedTarget = OrganizationPeriod::factory()->create([
            'status' => OrganizationPeriod::STATUS_PUBLISHED,
        ]);

        try {
            $service->cloneStructure($source, $publishedTarget, $actor);
            $this->fail('Clone into a published target was not rejected.');
        } catch (OrganizationDomainException $exception) {
            $this->assertSame('period_id', $exception->field());
        }

        $this->assertSame(0, $publishedTarget->units()->count());
    }

    public function test_structure_service_manages_dynamic_hierarchy_and_rejects_cycles(): void
    {
        $actor = User::factory()->create();
        $period = OrganizationPeriod::factory()->create();
        $division = Division::factory()->create();
        $service = app(OrganizationStructureService::class);
        $root = $service->createUnit($period, [
            'name' => 'Root',
            'unit_type' => 'assembly',
            'master_unit_id' => $division->id,
            'is_core_structure' => true,
        ], $actor);
        $child = $service->createUnit($period, [
            'name' => 'Child',
            'unit_type' => 'experimental_unit',
            'parent_id' => $root->id,
        ], $actor);
        $grandchild = $service->createUnit($period, [
            'name' => 'Grandchild',
            'unit_type' => 'subdivision',
            'parent_id' => $child->id,
        ], $actor);

        $updatedChild = $service->updateUnit($child, [
            'name' => 'Child Diperbarui',
            'display_order' => 30,
        ], $actor);

        $this->assertSame('experimental_unit', $updatedChild->unit_type);
        $this->assertSame(30, $updatedChild->display_order);
        $this->assertSame($division->id, $root->master_unit_id);

        try {
            $service->moveUnit($root, $grandchild, 99, $actor);
            $this->fail('Circular hierarchy was not rejected.');
        } catch (OrganizationDomainException $exception) {
            $this->assertSame('parent_id', $exception->field());
        }

        $this->assertNull($root->fresh()->parent_id);
    }

    public function test_structure_service_rejects_cross_period_parent_and_read_only_period(): void
    {
        $actor = User::factory()->create();
        $service = app(OrganizationStructureService::class);
        $firstPeriod = OrganizationPeriod::factory()->create();
        $secondPeriod = OrganizationPeriod::factory()->create();
        $foreignParent = OrganizationUnit::factory()->create(['period_id' => $firstPeriod->id]);

        try {
            $service->createUnit($secondPeriod, [
                'name' => 'Cross Period',
                'unit_type' => 'other',
                'parent_id' => $foreignParent->id,
            ], $actor);
            $this->fail('Cross-period parent was not rejected.');
        } catch (OrganizationDomainException $exception) {
            $this->assertSame('parent_id', $exception->field());
        }

        $ended = OrganizationPeriod::factory()->ended()->create();

        $this->expectException(OrganizationDomainException::class);
        $service->createUnit($ended, [
            'name' => 'Read Only',
            'unit_type' => 'other',
        ], $actor);
    }

    public function test_unit_and_position_deactivation_respects_dependencies(): void
    {
        $actor = User::factory()->create();
        $member = Member::factory()->create();
        $position = Position::factory()->create();
        $period = OrganizationPeriod::factory()->create();
        $service = app(OrganizationStructureService::class);
        $parent = $service->createUnit($period, ['name' => 'Parent', 'unit_type' => 'board'], $actor);
        $child = $service->createUnit($period, [
            'name' => 'Child',
            'unit_type' => 'division',
            'parent_id' => $parent->id,
        ], $actor);

        try {
            $service->deactivateUnit($parent, $actor);
            $this->fail('Unit with active child was not rejected.');
        } catch (OrganizationDomainException $exception) {
            $this->assertSame('unit', $exception->field());
        }

        $slot = $service->addPosition($child, [
            'position_id' => $position->id,
            'custom_title' => 'Jabatan Periode',
            'is_required' => true,
        ], $actor);
        $slot = $service->updatePosition($slot, [
            'custom_title' => 'Jabatan Diperbarui',
            'display_order' => 7,
        ], $actor);
        $assignment = OrganizationAssignment::factory()->create([
            'period_id' => $period->id,
            'organization_unit_id' => $child->id,
            'unit_position_id' => $slot->id,
            'member_id' => $member->id,
        ]);

        try {
            $service->deactivatePosition($slot, $actor);
            $this->fail('Occupied slot was not rejected.');
        } catch (OrganizationDomainException $exception) {
            $this->assertSame('unit_position', $exception->field());
        }

        try {
            $service->deactivateUnit($child, $actor);
            $this->fail('Unit with current assignment was not rejected.');
        } catch (OrganizationDomainException $exception) {
            $this->assertSame('unit', $exception->field());
        }

        $assignment->update([
            'status' => OrganizationAssignment::STATUS_ENDED,
            'ended_at' => now()->toDateString(),
        ]);

        $deactivatedSlot = $service->deactivatePosition($slot, $actor);
        $deactivatedChild = $service->deactivateUnit($child, $actor);
        $deactivatedParent = $service->deactivateUnit($parent, $actor);

        $this->assertFalse($deactivatedSlot->is_active);
        $this->assertFalse($deactivatedChild->is_active);
        $this->assertFalse($deactivatedParent->is_active);
        $this->assertSame('Jabatan Diperbarui', $deactivatedSlot->custom_title);
        $this->assertSame(7, $deactivatedSlot->display_order);
    }

    public function test_inactive_master_position_cannot_be_added_to_structure(): void
    {
        $actor = User::factory()->create();
        $period = OrganizationPeriod::factory()->create();
        $unit = OrganizationUnit::factory()->create(['period_id' => $period->id]);
        $position = Position::factory()->create(['is_active' => false]);

        $this->expectException(OrganizationDomainException::class);
        app(OrganizationStructureService::class)->addPosition($unit, [
            'position_id' => $position->id,
        ], $actor);
    }
}
