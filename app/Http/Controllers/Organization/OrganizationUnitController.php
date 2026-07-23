<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\MoveOrganizationUnitRequest;
use App\Http\Requests\Organization\StoreOrganizationUnitRequest;
use App\Http\Requests\Organization\UpdateOrganizationUnitRequest;
use App\Http\Resources\Organization\OrganizationUnitResource;
use App\Models\OrganizationAssignment;
use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Services\Organization\OrganizationStructureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrganizationUnitController extends Controller
{
    public function index(
        Request $request,
        OrganizationPeriod $organizationPeriod
    ): AnonymousResourceCollection {
        $this->authorize('view', $organizationPeriod);
        $validated = $request->validate([
            'type' => ['nullable', 'string', 'max:50'],
            'core' => ['nullable', 'boolean'],
            'active' => ['nullable', 'boolean'],
            'has_vacancy' => ['nullable', 'boolean'],
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', 'in:display_order,name,type,positions,filled'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $currentStatuses = [
            OrganizationAssignment::STATUS_DRAFT,
            OrganizationAssignment::STATUS_ACTIVE,
        ];
        $assignmentScope = fn ($query) => $query
            ->where('period_id', $organizationPeriod->id)
            ->when(
                ! $organizationPeriod->isReadOnly(),
                fn ($assignment) => $assignment->whereIn('status', $currentStatuses)
            );
        $sort = $validated['sort'] ?? 'display_order';
        $direction = $validated['direction'] ?? 'asc';

        $units = $organizationPeriod->units()
            ->when($validated['type'] ?? null, fn ($query, $type) => $query->where('unit_type', $type))
            ->when(
                array_key_exists('core', $validated),
                fn ($query) => $query->where('is_core_structure', (bool) $validated['core'])
            )
            ->when(
                array_key_exists('active', $validated),
                fn ($query) => $query->where('is_active', (bool) $validated['active'])
            )
            ->when($validated['search'] ?? null, function ($query, $search) {
                $query->where(function ($nested) use ($search) {
                    $nested->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                });
            })
            ->when(
                array_key_exists('has_vacancy', $validated),
                function ($query) use ($assignmentScope, $validated) {
                    $method = $validated['has_vacancy'] ? 'whereHas' : 'whereDoesntHave';
                    $query->{$method}('unitPositions', fn ($slot) => $slot
                        ->where('is_active', true)
                        ->whereDoesntHave('assignments', $assignmentScope));
                }
            )
            ->with([
                'parent:id,name',
                'masterUnit:id,name,code',
                'children' => fn ($query) => $query
                    ->where('is_active', true)
                    ->select(['id', 'period_id', 'parent_id', 'name', 'unit_type', 'is_core_structure'])
                    ->orderBy('display_order')
                    ->orderBy('name'),
                'unitPositions' => fn ($query) => $query
                    ->where('is_active', true)
                    ->orderBy('display_order')
                    ->with([
                        'position:id,name,code,level,is_leadership',
                        'assignments' => fn ($assignment) => $assignmentScope($assignment)
                            ->latest('started_at')
                            ->with([
                                'member:id,user_id,npa,full_name,education,email,phone',
                                'member.user:id,is_active',
                                'portalRole:id,name',
                            ]),
                    ]),
            ])
            ->withCount([
                'children as children_count' => fn ($query) => $query->where('is_active', true),
                'unitPositions as positions_count' => fn ($query) => $query->where('is_active', true),
                'unitPositions as filled_positions_count' => fn ($query) => $query
                    ->where('is_active', true)
                    ->whereHas('assignments', $assignmentScope),
            ])
            ->when($sort === 'name', fn ($query) => $query->orderBy('name', $direction))
            ->when($sort === 'type', fn ($query) => $query->orderBy('unit_type', $direction))
            ->when($sort === 'positions', fn ($query) => $query->orderBy('positions_count', $direction))
            ->when($sort === 'filled', fn ($query) => $query->orderBy('filled_positions_count', $direction))
            ->when($sort === 'display_order', fn ($query) => $query->orderBy('display_order', $direction))
            ->orderBy('name')
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return OrganizationUnitResource::collection($units);
    }

    public function show(OrganizationUnit $organizationUnit): OrganizationUnitResource
    {
        $this->authorize('view', $organizationUnit);
        $currentStatuses = [
            OrganizationAssignment::STATUS_DRAFT,
            OrganizationAssignment::STATUS_ACTIVE,
        ];

        return OrganizationUnitResource::make(
            $organizationUnit
                ->load([
                    'parent:id,name',
                    'masterUnit:id,name,code',
                    'unitPositions' => fn ($query) => $query
                        ->where('is_active', true)
                        ->with([
                            'position:id,name,code,level,is_leadership',
                            'assignments' => fn ($query) => $query
                                ->where('period_id', $organizationUnit->period_id)
                                ->when(
                                    ! $organizationUnit->period?->isReadOnly(),
                                    fn ($assignment) => $assignment->whereIn('status', $currentStatuses)
                                )
                                ->latest('started_at')
                                ->with([
                                    'member:id,user_id,npa,full_name,education,email,phone',
                                    'member.user:id,is_active',
                                    'portalRole:id,name',
                                ]),
                        ]),
                    'children:id,period_id,parent_id,master_unit_id,name,code,unit_type,description,display_order,is_core_structure,is_active',
                ])
                ->loadCount([
                    'children as children_count' => fn ($query) => $query->where('is_active', true),
                    'unitPositions as positions_count' => fn ($query) => $query->where('is_active', true),
                    'unitPositions as filled_positions_count' => fn ($query) => $query
                        ->where('is_active', true)
                        ->whereHas('assignments', fn ($assignment) => $assignment
                            ->where('period_id', $organizationUnit->period_id)
                            ->when(
                                ! $organizationUnit->period?->isReadOnly(),
                                fn ($query) => $query->whereIn('status', $currentStatuses)
                            )),
                ])
        );
    }

    public function store(
        StoreOrganizationUnitRequest $request,
        OrganizationPeriod $organizationPeriod,
        OrganizationStructureService $service
    ): JsonResponse {
        $this->authorize('update', $organizationPeriod);
        $unit = $service->createUnit($organizationPeriod, $request->validated(), $request->user());

        return OrganizationUnitResource::make($unit)->response()->setStatusCode(201);
    }

    public function update(
        UpdateOrganizationUnitRequest $request,
        OrganizationUnit $organizationUnit,
        OrganizationStructureService $service
    ): OrganizationUnitResource {
        return OrganizationUnitResource::make(
            $service->updateUnit($organizationUnit, $request->validated(), $request->user())
        );
    }

    public function move(
        MoveOrganizationUnitRequest $request,
        OrganizationUnit $organizationUnit,
        OrganizationStructureService $service
    ): OrganizationUnitResource {
        $parent = $request->filled('parent_id')
            ? OrganizationUnit::query()->findOrFail($request->integer('parent_id'))
            : null;

        return OrganizationUnitResource::make(
            $service->moveUnit(
                $organizationUnit,
                $parent,
                $request->integer('display_order'),
                $request->user()
            )
        );
    }

    public function deactivate(
        OrganizationUnit $organizationUnit,
        OrganizationStructureService $service
    ): OrganizationUnitResource {
        $this->authorize('deactivate', $organizationUnit);

        return OrganizationUnitResource::make(
            $service->deactivateUnit($organizationUnit, request()->user())
        );
    }
}
