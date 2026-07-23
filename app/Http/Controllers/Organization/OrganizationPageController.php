<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\OrganizationAssignment;
use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Models\OrganizationUnitPosition;
use App\Models\Position;
use App\Models\User;
use App\Support\RoleName;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class OrganizationPageController extends Controller
{
    private const TABS = ['structure', 'units', 'members', 'history'];

    public function __invoke(Request $request): Response
    {
        $this->authorize('viewAny', OrganizationPeriod::class);
        $validated = $request->validate([
            'period_id' => ['nullable', 'integer', 'exists:organization_periods,id'],
            'tab' => ['nullable', 'in:'.implode(',', self::TABS)],
        ]);
        $user = $request->user();
        $periodQuery = OrganizationPeriod::query()
            ->when(
                ! $user->can('organization.history.view'),
                fn ($query) => $query->whereNotIn('status', [
                    OrganizationPeriod::STATUS_ENDED,
                    OrganizationPeriod::STATUS_ARCHIVED,
                ])
            )
            ->when(
                ! $user->can('organization.view'),
                fn ($query) => $query->whereIn('status', [
                    OrganizationPeriod::STATUS_ENDED,
                    OrganizationPeriod::STATUS_ARCHIVED,
                ])
            );
        $periods = (clone $periodQuery)
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->limit(50)
            ->get();
        $selectedPeriod = isset($validated['period_id'])
            ? (clone $periodQuery)->findOrFail($validated['period_id'])
            : $this->defaultPeriod($periods);

        if ($selectedPeriod) {
            $this->authorize('view', $selectedPeriod);
        }

        return Inertia::render('Organization/Index', [
            'periods' => $periods->map(fn (OrganizationPeriod $period) => $this->periodData($period))->values(),
            'selectedPeriod' => $selectedPeriod ? $this->periodData($selectedPeriod) : null,
            'selectedTab' => $validated['tab'] ?? 'structure',
            'summary' => $selectedPeriod ? $this->summary($selectedPeriod) : $this->emptySummary(),
            'content' => $selectedPeriod
                ? $this->content($selectedPeriod, $user->can('organization.history.view'))
                : $this->emptyContent(),
            'filterOptions' => $selectedPeriod ? $this->filterOptions($selectedPeriod, $user) : $this->emptyFilterOptions(),
            'actions' => [
                'manage_structure' => $selectedPeriod
                    ? $user->can('organization.structure.manage') && ! $selectedPeriod->isReadOnly()
                    : false,
                'manage_assignments' => $selectedPeriod
                    ? $user->can('organization.assignment.manage') && ! $selectedPeriod->isReadOnly()
                    : false,
                'replace_assignments' => $selectedPeriod
                    ? $user->can('organization.assignment.replace') && ! $selectedPeriod->isReadOnly()
                    : false,
                'manage_accounts' => $user->can('users.update'),
                'create_period' => $user->can('organization.period.create'),
                'publish_period' => $selectedPeriod
                    ? $user->can('publish', $selectedPeriod)
                    : false,
                'activate_period' => $selectedPeriod
                    ? $user->can('activate', $selectedPeriod)
                    : false,
                'update_period' => $selectedPeriod
                    ? $user->can('update', $selectedPeriod)
                    : false,
                'end_period' => $selectedPeriod
                    ? $user->can('end', $selectedPeriod)
                    : false,
                'view_history' => $user->can('organization.history.view'),
            ],
            'loadError' => null,
        ]);
    }

    private function defaultPeriod($periods): ?OrganizationPeriod
    {
        return $periods->firstWhere('is_active', true)
            ?? $periods->firstWhere('status', OrganizationPeriod::STATUS_PUBLISHED)
            ?? $periods->firstWhere('status', OrganizationPeriod::STATUS_DRAFT)
            ?? $periods->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function periodData(OrganizationPeriod $period): array
    {
        return [
            'id' => $period->id,
            'name' => $period->name,
            'start_date' => $period->start_date?->format('Y-m-d'),
            'end_date' => $period->end_date?->format('Y-m-d'),
            'status' => $period->status,
            'is_active' => (bool) $period->is_active,
            'published_at' => $period->published_at?->toIso8601String(),
            'activated_at' => $period->activated_at?->toIso8601String(),
            'ended_at' => $period->ended_at?->toIso8601String(),
            'notes' => $period->notes,
        ];
    }

    /**
     * @return array<string, int|null>
     */
    private function summary(OrganizationPeriod $period): array
    {
        $currentStatuses = $period->isReadOnly()
            ? [
                OrganizationAssignment::STATUS_ACTIVE,
                OrganizationAssignment::STATUS_REPLACED,
                OrganizationAssignment::STATUS_ENDED,
            ]
            : [
                OrganizationAssignment::STATUS_DRAFT,
                OrganizationAssignment::STATUS_ACTIVE,
            ];
        $activeSlots = OrganizationUnitPosition::query()
            ->where('period_id', $period->id)
            ->where('is_active', true);
        $positionsTotal = (clone $activeSlots)->count();
        $positionsFilled = (clone $activeSlots)
            ->whereHas('assignments', fn ($query) => $query->whereIn('status', $currentStatuses))
            ->count();
        $remainingDays = null;

        if (! $period->isReadOnly()) {
            $today = CarbonImmutable::today(config('app.timezone'));
            $remainingDays = max(0, (int) $today->diffInDays($period->end_date, false));
        }

        return [
            'total_managers' => $period->assignments()
                ->whereIn('status', $currentStatuses)
                ->distinct('member_id')
                ->count('member_id'),
            'core_units' => $period->units()->where('is_active', true)->where('is_core_structure', true)->count(),
            'total_units' => $period->units()->where('is_active', true)->count(),
            'positions_filled' => $positionsFilled,
            'positions_empty' => max(0, $positionsTotal - $positionsFilled),
            'remaining_days' => $remainingDays,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function content(OrganizationPeriod $period, bool $canViewHistory): array
    {
        $currentStatuses = $period->isReadOnly()
            ? [
                OrganizationAssignment::STATUS_ACTIVE,
                OrganizationAssignment::STATUS_REPLACED,
                OrganizationAssignment::STATUS_ENDED,
            ]
            : [
                OrganizationAssignment::STATUS_DRAFT,
                OrganizationAssignment::STATUS_ACTIVE,
            ];

        return [
            'has_structure' => $period->units()->where('is_active', true)->exists(),
            'has_assignments' => $period->assignments()->whereIn('status', $currentStatuses)->exists(),
            'root_units' => OrganizationUnit::query()
                ->where('period_id', $period->id)
                ->whereNull('parent_id')
                ->where('is_active', true)
                ->withCount([
                    'unitPositions as positions_count' => fn ($query) => $query->where('is_active', true),
                    'assignments as assignments_count' => fn ($query) => $query->whereIn('status', $currentStatuses),
                ])
                ->orderBy('display_order')
                ->orderBy('name')
                ->limit(8)
                ->get(['id', 'name', 'unit_type', 'is_core_structure'])
                ->map(fn (OrganizationUnit $unit) => [
                    'id' => $unit->id,
                    'name' => $unit->name,
                    'unit_type' => $unit->unit_type,
                    'is_core_structure' => (bool) $unit->is_core_structure,
                    'positions_count' => $unit->positions_count,
                    'assignments_count' => $unit->assignments_count,
                ])
                ->values(),
            'history_count' => $canViewHistory
                ? OrganizationPeriod::query()->whereIn('status', [
                    OrganizationPeriod::STATUS_ENDED,
                    OrganizationPeriod::STATUS_ARCHIVED,
                ])->count()
                : 0,
        ];
    }

    /**
     * @return array<string, int|null>
     */
    private function emptySummary(): array
    {
        return [
            'total_managers' => 0,
            'core_units' => 0,
            'total_units' => 0,
            'positions_filled' => 0,
            'positions_empty' => 0,
            'remaining_days' => null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyContent(): array
    {
        return [
            'has_structure' => false,
            'has_assignments' => false,
            'root_units' => [],
            'history_count' => 0,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function filterOptions(OrganizationPeriod $period, User $user): array
    {
        return [
            'unit_types' => $period->units()
                ->whereNotNull('unit_type')
                ->distinct()
                ->orderBy('unit_type')
                ->pluck('unit_type')
                ->values(),
            'units' => $period->units()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (OrganizationUnit $unit) => [
                    'value' => $unit->id,
                    'label' => $unit->name,
                ])
                ->values(),
            'positions' => Position::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Position $position) => [
                    'value' => $position->id,
                    'label' => $position->name,
                ])
                ->values(),
            'roles' => Role::query()
                ->whereRaw('lower(name) != ?', [RoleName::MEMBER])
                ->when(
                    ! RoleName::is($user, RoleName::SUPERADMIN),
                    fn ($query) => $query->whereRaw('lower(name) != ?', [RoleName::SUPERADMIN])
                )
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Role $role) => [
                    'value' => $role->id,
                    'label' => $role->name,
                ])
                ->values(),
        ];
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    private function emptyFilterOptions(): array
    {
        return [
            'unit_types' => [],
            'units' => [],
            'positions' => [],
            'roles' => [],
        ];
    }
}
