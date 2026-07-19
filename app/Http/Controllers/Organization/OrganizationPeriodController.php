<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\ActivateOrganizationPeriodRequest;
use App\Http\Requests\Organization\CloneOrganizationStructureRequest;
use App\Http\Requests\Organization\EndOrganizationPeriodRequest;
use App\Http\Requests\Organization\PublishOrganizationPeriodRequest;
use App\Http\Requests\Organization\StoreOrganizationPeriodRequest;
use App\Http\Requests\Organization\UpdateOrganizationPeriodRequest;
use App\Http\Resources\Organization\OrganizationPeriodResource;
use App\Http\Resources\Organization\OrganizationUnitResource;
use App\Models\OrganizationAssignment;
use App\Models\OrganizationPeriod;
use App\Models\OrganizationUnit;
use App\Services\Organization\OrganizationPeriodService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Collection;

class OrganizationPeriodController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', OrganizationPeriod::class);
        $validated = $request->validate([
            'status' => ['nullable', 'in:'.implode(',', OrganizationPeriod::STATUSES)],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $periods = OrganizationPeriod::query()
            ->when(
                ! $request->user()->can('organization.history.view'),
                fn ($query) => $query->whereNotIn('status', [
                    OrganizationPeriod::STATUS_ENDED,
                    OrganizationPeriod::STATUS_ARCHIVED,
                ])
            )
            ->when(
                ! $request->user()->can('organization.view'),
                fn ($query) => $query->whereIn('status', [
                    OrganizationPeriod::STATUS_ENDED,
                    OrganizationPeriod::STATUS_ARCHIVED,
                ])
            )
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->with($this->periodRelations())
            ->withCount(['units', 'assignments'])
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return OrganizationPeriodResource::collection($periods);
    }

    public function show(OrganizationPeriod $organizationPeriod): OrganizationPeriodResource
    {
        $this->authorize('view', $organizationPeriod);

        return OrganizationPeriodResource::make(
            $organizationPeriod->load($this->periodRelations())->loadCount(['units', 'assignments'])
        );
    }

    public function store(
        StoreOrganizationPeriodRequest $request,
        OrganizationPeriodService $service
    ): JsonResponse {
        $source = $request->filled('source_period_id')
            ? OrganizationPeriod::query()->findOrFail($request->integer('source_period_id'))
            : null;

        if ($source) {
            $this->authorize('view', $source);
        }
        $period = $service->createDraft($request->validated(), $request->user(), $source);

        return OrganizationPeriodResource::make($period)->response()->setStatusCode(201);
    }

    public function update(
        UpdateOrganizationPeriodRequest $request,
        OrganizationPeriod $organizationPeriod,
        OrganizationPeriodService $service
    ): OrganizationPeriodResource {
        return OrganizationPeriodResource::make(
            $service->updateDraft($organizationPeriod, $request->validated(), $request->user())
        );
    }

    public function cloneStructure(
        CloneOrganizationStructureRequest $request,
        OrganizationPeriod $organizationPeriod,
        OrganizationPeriodService $service
    ): OrganizationPeriodResource {
        $source = OrganizationPeriod::query()->findOrFail($request->integer('source_period_id'));
        $this->authorize('view', $source);

        return OrganizationPeriodResource::make(
            $service->cloneStructure($source, $organizationPeriod, $request->user())
        );
    }

    public function workflowSummary(
        Request $request,
        OrganizationPeriod $organizationPeriod,
        OrganizationPeriodService $service
    ): JsonResponse {
        $validated = $request->validate([
            'action' => ['required', 'in:publish,activate,end'],
        ]);
        $this->authorize($validated['action'], $organizationPeriod);

        return response()->json([
            'data' => $validated['action'] === 'end'
                ? $service->endSummary($organizationPeriod)
                : $service->readiness($organizationPeriod),
        ]);
    }

    public function publish(
        PublishOrganizationPeriodRequest $request,
        OrganizationPeriod $organizationPeriod,
        OrganizationPeriodService $service
    ): OrganizationPeriodResource {
        return OrganizationPeriodResource::make(
            $service->publish($organizationPeriod, $request->user())
        );
    }

    public function activate(
        ActivateOrganizationPeriodRequest $request,
        OrganizationPeriod $organizationPeriod,
        OrganizationPeriodService $service
    ): OrganizationPeriodResource {
        return OrganizationPeriodResource::make(
            $service->activate($organizationPeriod, $request->user())
        );
    }

    public function end(
        EndOrganizationPeriodRequest $request,
        OrganizationPeriod $organizationPeriod,
        OrganizationPeriodService $service
    ): OrganizationPeriodResource {
        return OrganizationPeriodResource::make(
            $service->endPeriod(
                $organizationPeriod,
                $request->input('ended_at'),
                $request->input('reason'),
                $request->user()
            )
        );
    }

    public function chart(OrganizationPeriod $organizationPeriod): AnonymousResourceCollection
    {
        $this->authorize('view', $organizationPeriod);
        $currentStatuses = [
            OrganizationAssignment::STATUS_DRAFT,
            OrganizationAssignment::STATUS_ACTIVE,
        ];

        $units = OrganizationUnit::query()
            ->where('period_id', $organizationPeriod->id)
            ->where('is_active', true)
            ->with([
                'masterUnit:id,name,code',
                'unitPositions' => fn ($query) => $query
                    ->where('is_active', true)
                    ->orderBy('display_order')
                    ->with([
                        'position:id,name,code,level,is_leadership',
                        'assignments' => fn ($assignmentQuery) => $assignmentQuery
                            ->when(
                                ! $organizationPeriod->isReadOnly(),
                                fn ($query) => $query->whereIn('status', $currentStatuses)
                            )
                            ->latest('started_at')
                            ->with([
                                'member:id,user_id,npa,full_name,education,email,phone',
                                'member.user:id,is_active',
                                'portalRole:id,name',
                            ]),
                    ]),
            ])
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        return OrganizationUnitResource::collection($this->tree($units));
    }

    /**
     * @param  Collection<int, OrganizationUnit>  $units
     * @return Collection<int, OrganizationUnit>
     */
    private function tree(Collection $units): Collection
    {
        $byId = $units->keyBy('id');
        $roots = collect();

        foreach ($units as $unit) {
            $unit->setRelation('children', collect());
        }

        foreach ($units as $unit) {
            $parent = $unit->parent_id ? $byId->get($unit->parent_id) : null;

            if ($parent) {
                $parent->children->push($unit);
            } else {
                $roots->push($unit);
            }
        }

        return $roots;
    }

    /** @return list<string> */
    private function periodRelations(): array
    {
        return [
            'creator:id,name',
            'updater:id,name',
            'publishedBy:id,name',
            'activatedBy:id,name',
            'endedBy:id,name',
        ];
    }
}
