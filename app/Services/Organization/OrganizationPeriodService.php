<?php

namespace App\Services\Organization;

use App\Models\OrganizationAssignment;
use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Models\OrganizationUnitPosition;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class OrganizationPeriodService
{
    public function __construct(
        private readonly OrganizationStructureCloneService $cloneService,
        private readonly OrganizationAuditLogger $auditLogger,
        private readonly OrganizationAssignmentService $assignmentService,
        private readonly OrganizationAssignmentValidator $assignmentValidator,
        private readonly OrganizationHierarchyValidator $hierarchyValidator,
    ) {}

    public function createDraft(
        array $data,
        User $actor,
        ?OrganizationPeriod $sourcePeriod = null
    ): OrganizationPeriod {
        $payload = $this->validatedPayload($data);

        return DB::transaction(function () use ($payload, $actor, $sourcePeriod) {
            $period = OrganizationPeriod::query()->create([
                ...$payload,
                'status' => OrganizationPeriod::STATUS_DRAFT,
                'is_active' => false,
                'published_at' => null,
                'published_by' => null,
                'activated_at' => null,
                'activated_by' => null,
                'ended_at' => null,
                'ended_by' => null,
                'created_by' => $actor->id,
                'updated_by' => $actor->id,
            ]);

            if ($sourcePeriod) {
                $period = $this->cloneService->clone($sourcePeriod, $period, $actor);
            }

            $this->auditLogger->log(
                'organization.period.created',
                $period,
                $actor,
                newValues: $period->only(['name', 'start_date', 'end_date', 'status', 'notes'])
            );

            return $period->fresh(['units.unitPositions']);
        });
    }

    public function updateDraft(
        OrganizationPeriod $period,
        array $data,
        User $actor
    ): OrganizationPeriod {
        return DB::transaction(function () use ($period, $data, $actor) {
            $period = OrganizationPeriod::query()
                ->whereKey($period->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! in_array($period->status, [
                OrganizationPeriod::STATUS_DRAFT,
                OrganizationPeriod::STATUS_PUBLISHED,
            ], true)) {
                throw new OrganizationDomainException(
                    'period_id',
                    'Metadata periode hanya dapat diubah saat berstatus draft atau published.'
                );
            }

            $before = $period->only(['name', 'start_date', 'end_date', 'status', 'notes']);
            $payload = $this->validatedPayload($data, $period);
            $period->update([
                ...$payload,
                'updated_by' => $actor->id,
            ]);

            $this->auditLogger->log(
                'organization.period.updated',
                $period,
                $actor,
                $before,
                $period->only(['name', 'start_date', 'end_date', 'status', 'notes'])
            );

            return $period->fresh();
        });
    }

    public function cloneStructure(
        OrganizationPeriod $source,
        OrganizationPeriod $target,
        User $actor
    ): OrganizationPeriod {
        return $this->cloneService->clone($source, $target, $actor);
    }

    /**
     * @return array{ready: bool, issues: list<array<string, mixed>>, summary: array<string, int>}
     */
    public function readiness(OrganizationPeriod $period): array
    {
        $period = OrganizationPeriod::query()->findOrFail($period->id);
        $issues = [];
        $addIssue = static function (string $field, string $code, string $message, array $context = []) use (&$issues): void {
            $issues[] = [
                'field' => $field,
                'code' => $code,
                'message' => $message,
                ...$context,
            ];
        };

        try {
            $this->validatedPayload([], $period);
        } catch (OrganizationDomainException $exception) {
            $addIssue($exception->field(), 'invalid_period_metadata', $exception->getMessage());
        }

        $units = OrganizationUnit::query()
            ->where('period_id', $period->id)
            ->get();
        $activeUnits = $units->where('is_active', true);

        if ($activeUnits->isEmpty()) {
            $addIssue('structure', 'structure_missing', 'Periode belum memiliki struktur organisasi aktif.');
        }

        foreach ($this->hierarchyValidator->structureIssues($period, $units) as $issue) {
            $issues[] = $issue;
        }

        $requiredSlots = OrganizationUnitPosition::query()
            ->where('period_id', $period->id)
            ->where('is_active', true)
            ->where('is_required', true)
            ->whereHas('organizationUnit', fn ($query) => $query->where('is_active', true))
            ->with([
                'organizationUnit:id,name',
                'position:id,name',
                'assignments' => fn ($query) => $query->current()->latest('started_at'),
            ])
            ->get();

        foreach ($requiredSlots as $slot) {
            if ($slot->assignments->isEmpty()) {
                $addIssue('unit_position_id', 'required_position_empty', sprintf(
                    'Posisi wajib %s pada %s belum terisi.',
                    $slot->display_title,
                    $slot->organizationUnit?->name ?? 'unit organisasi'
                ), [
                    'unit_id' => $slot->organization_unit_id,
                    'unit_name' => $slot->organizationUnit?->name,
                    'unit_position_id' => $slot->id,
                    'position_name' => $slot->display_title,
                ]);
            }
        }

        $assignments = OrganizationAssignment::query()
            ->where('period_id', $period->id)
            ->current()
            ->with(['organizationUnit', 'unitPosition.position', 'member.memberStatus', 'portalRole'])
            ->get();

        foreach ($assignments as $assignment) {
            if (! $assignment->portalRole) {
                $addIssue('portal_role_id', 'role_missing', sprintf(
                    'Role portal untuk %s belum tersedia.',
                    $assignment->member?->full_name ?? 'assignment'
                ), ['assignment_id' => $assignment->id]);

                continue;
            }

            try {
                $this->assignmentValidator->validate(
                    $period,
                    $assignment->organizationUnit,
                    $assignment->unitPosition,
                    $assignment->member,
                    $assignment->portalRole,
                    $assignment->started_at,
                    $assignment->appointment_date
                );
            } catch (OrganizationDomainException $exception) {
                $addIssue($exception->field(), 'invalid_assignment', sprintf(
                    '%s: %s',
                    $assignment->member?->full_name ?? 'Assignment #'.$assignment->id,
                    $exception->getMessage()
                ), ['assignment_id' => $assignment->id]);
            }
        }

        $duplicateMembers = OrganizationAssignment::query()
            ->where('period_id', $period->id)
            ->current()
            ->select('member_id')
            ->groupBy('member_id')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('member_id');
        if ($duplicateMembers->isNotEmpty()) {
            $addIssue('member_id', 'duplicate_member', 'Terdapat member dengan lebih dari satu assignment berjalan.');
        }

        $duplicateSlots = OrganizationAssignment::query()
            ->where('period_id', $period->id)
            ->current()
            ->select('unit_position_id')
            ->groupBy('unit_position_id')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('unit_position_id');
        if ($duplicateSlots->isNotEmpty()) {
            $addIssue('unit_position_id', 'duplicate_slot', 'Terdapat slot posisi dengan lebih dari satu assignment berjalan.');
        }

        return [
            'ready' => $issues === [],
            'issues' => $issues,
            'summary' => [
                'units' => $activeUnits->count(),
                'required_positions' => $requiredSlots->count(),
                'assignments' => $assignments->count(),
            ],
        ];
    }

    public function publish(OrganizationPeriod $period, User $actor): OrganizationPeriod
    {
        return DB::transaction(function () use ($period, $actor) {
            $period = OrganizationPeriod::query()->whereKey($period->id)->lockForUpdate()->firstOrFail();

            if (! $period->isDraft()) {
                throw new OrganizationDomainException('period_id', 'Hanya periode draft yang dapat dipublikasikan.');
            }

            $this->assertReady($period);
            $before = $period->only(['status', 'is_active', 'published_at', 'published_by']);
            $period->update([
                'status' => OrganizationPeriod::STATUS_PUBLISHED,
                'is_active' => false,
                'published_at' => now(),
                'published_by' => $actor->id,
                'updated_by' => $actor->id,
            ]);
            $this->auditLogger->log(
                'organization.period.published',
                $period,
                $actor,
                $before,
                $period->only(['status', 'is_active', 'published_at', 'published_by'])
            );

            return $period->fresh($this->periodRelations());
        });
    }

    public function activate(OrganizationPeriod $period, User $actor): OrganizationPeriod
    {
        try {
            return DB::transaction(function () use ($period, $actor) {
                $period = OrganizationPeriod::query()->whereKey($period->id)->lockForUpdate()->firstOrFail();

                if (! in_array($period->status, [
                    OrganizationPeriod::STATUS_DRAFT,
                    OrganizationPeriod::STATUS_PUBLISHED,
                ], true)) {
                    throw new OrganizationDomainException('period_id', 'Status periode tidak dapat diaktifkan.');
                }

                if (OrganizationPeriod::query()
                    ->whereKeyNot($period->id)
                    ->where(fn ($query) => $query->where('status', OrganizationPeriod::STATUS_ACTIVE)->orWhere('is_active', true))
                    ->lockForUpdate()
                    ->exists()) {
                    throw new OrganizationDomainException(
                        'period_id',
                        'Masih terdapat periode aktif. Akhiri periode tersebut sebelum mengaktifkan periode baru.'
                    );
                }

                $this->assertReady($period);
                $before = $period->only([
                    'status', 'is_active', 'published_at', 'published_by', 'activated_at', 'activated_by',
                ]);

                $period->update([
                    'status' => OrganizationPeriod::STATUS_ACTIVE,
                    'is_active' => true,
                    'published_at' => $period->published_at ?? now(),
                    'published_by' => $period->published_by ?? $actor->id,
                    'activated_at' => now(),
                    'activated_by' => $actor->id,
                    'updated_by' => $actor->id,
                ]);

                $draftAssignments = OrganizationAssignment::query()
                    ->where('period_id', $period->id)
                    ->where('status', OrganizationAssignment::STATUS_DRAFT)
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get();

                foreach ($draftAssignments as $assignment) {
                    $this->assignmentService->activateDraft($assignment, $actor);
                }

                $this->auditLogger->log(
                    'organization.period.activated',
                    $period,
                    $actor,
                    $before,
                    $period->only([
                        'status', 'is_active', 'published_at', 'published_by', 'activated_at', 'activated_by',
                    ]) + ['activated_assignments' => $draftAssignments->count()]
                );

                return $period->fresh($this->periodRelations());
            });
        } catch (QueryException $exception) {
            $message = mb_strtolower($exception->getMessage());

            if (! str_contains($message, 'organization_periods_one_active_unique')
                && ! str_contains($message, 'organization_periods.active_guard')) {
                throw $exception;
            }

            throw new OrganizationDomainException(
                'period_id',
                'Periode tidak dapat diaktifkan karena masih terdapat periode aktif.',
                previous: $exception
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function endSummary(OrganizationPeriod $period): array
    {
        $assignments = OrganizationAssignment::query()
            ->where('period_id', $period->id)
            ->current()
            ->with('member:id,division_id,position_id')
            ->get();
        $replacement = OrganizationPeriod::query()
            ->whereKeyNot($period->id)
            ->whereIn('status', [OrganizationPeriod::STATUS_DRAFT, OrganizationPeriod::STATUS_PUBLISHED])
            ->orderBy('start_date')
            ->first(['id', 'name', 'status', 'start_date']);

        return [
            'assignments' => $assignments->count(),
            'roles' => $assignments->whereNotNull('portal_role_id')->count(),
            'divisions' => $assignments->filter(fn (OrganizationAssignment $assignment) => $assignment->member?->division_id || $assignment->member?->position_id
            )->count(),
            'replacement_period' => $replacement ? [
                'id' => $replacement->id,
                'name' => $replacement->name,
                'status' => $replacement->status,
                'start_date' => $replacement->start_date?->format('Y-m-d'),
            ] : null,
        ];
    }

    public function endPeriod(
        OrganizationPeriod $period,
        mixed $endedAt,
        ?string $reason,
        User $actor
    ): OrganizationPeriod {
        return DB::transaction(function () use ($period, $endedAt, $reason, $actor) {
            $period = OrganizationPeriod::query()->whereKey($period->id)->lockForUpdate()->firstOrFail();

            if (! $period->isActive()) {
                throw new OrganizationDomainException('period_id', 'Hanya periode aktif yang dapat diakhiri.');
            }

            try {
                $date = CarbonImmutable::parse($endedAt)->startOfDay();
            } catch (\Throwable $exception) {
                throw new OrganizationDomainException('ended_at', 'Tanggal akhir periode wajib valid.', previous: $exception);
            }

            if ($date->lt($period->start_date) || $date->gt($period->end_date)) {
                throw new OrganizationDomainException(
                    'ended_at',
                    'Tanggal akhir harus berada dalam rentang periode.'
                );
            }

            $assignments = OrganizationAssignment::query()
                ->where('period_id', $period->id)
                ->current()
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($assignments as $assignment) {
                $this->assignmentService->end($assignment, $date->toDateString(), $reason, $actor);
            }

            $before = $period->only(['status', 'is_active', 'end_date', 'ended_at', 'ended_by']);
            $period->update([
                'status' => OrganizationPeriod::STATUS_ENDED,
                'is_active' => false,
                'end_date' => $date->toDateString(),
                'ended_at' => $date->endOfDay(),
                'ended_by' => $actor->id,
                'updated_by' => $actor->id,
            ]);
            $this->auditLogger->log(
                'organization.period.ended',
                $period,
                $actor,
                $before,
                $period->only(['status', 'is_active', 'end_date', 'ended_at', 'ended_by'])
                    + ['ended_assignments' => $assignments->count()],
                $this->nullableText($reason)
            );

            return $period->fresh($this->periodRelations());
        });
    }

    private function assertReady(OrganizationPeriod $period): void
    {
        $readiness = $this->readiness($period);

        if (! $readiness['ready']) {
            $issue = $readiness['issues'][0];
            throw new OrganizationDomainException($issue['field'], $issue['message']);
        }
    }

    /** @return list<string> */
    private function periodRelations(): array
    {
        return ['creator:id,name', 'updater:id,name', 'publishedBy:id,name', 'activatedBy:id,name', 'endedBy:id,name'];
    }

    private function validatedPayload(array $data, ?OrganizationPeriod $period = null): array
    {
        $name = trim((string) ($data['name'] ?? $period?->name ?? ''));

        if ($name === '' || mb_strlen($name) > 255) {
            throw new OrganizationDomainException(
                'name',
                'Nama periode wajib diisi dan maksimal 255 karakter.'
            );
        }

        $startValue = $data['start_date'] ?? $period?->start_date;
        $endValue = $data['end_date'] ?? $period?->end_date;

        if (! $startValue || ! $endValue) {
            throw new OrganizationDomainException(
                'start_date',
                'Tanggal mulai dan selesai periode wajib diisi.'
            );
        }

        try {
            $startDate = CarbonImmutable::parse($startValue)->startOfDay();
            $endDate = CarbonImmutable::parse($endValue)->startOfDay();
        } catch (\Throwable $exception) {
            throw new OrganizationDomainException(
                'start_date',
                'Tanggal mulai dan selesai periode harus valid.',
                previous: $exception
            );
        }

        if ($startDate->greaterThan($endDate)) {
            throw new OrganizationDomainException(
                'end_date',
                'Tanggal selesai periode tidak boleh sebelum tanggal mulai.'
            );
        }

        $notes = array_key_exists('notes', $data)
            ? $this->nullableText($data['notes'])
            : $period?->notes;

        return [
            'name' => $name,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'notes' => $notes,
        ];
    }

    private function nullableText(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
