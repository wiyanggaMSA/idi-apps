<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\StoreOrganizationUnitPositionRequest;
use App\Http\Requests\Organization\UpdateOrganizationUnitPositionRequest;
use App\Http\Resources\Organization\OrganizationUnitPositionResource;
use App\Models\OrganizationAssignment;
use App\Models\OrganizationUnit;
use App\Models\OrganizationUnitPosition;
use App\Services\Organization\OrganizationStructureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrganizationUnitPositionController extends Controller
{
    public function index(OrganizationUnit $organizationUnit): AnonymousResourceCollection
    {
        $this->authorize('view', $organizationUnit);
        $currentStatuses = [
            OrganizationAssignment::STATUS_DRAFT,
            OrganizationAssignment::STATUS_ACTIVE,
        ];

        return OrganizationUnitPositionResource::collection(
            $organizationUnit->unitPositions()
                ->with([
                    'position:id,name,code,level,is_leadership',
                    'assignments' => fn ($query) => $query
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
                ])
                ->orderBy('display_order')
                ->get()
        );
    }

    public function store(
        StoreOrganizationUnitPositionRequest $request,
        OrganizationUnit $organizationUnit,
        OrganizationStructureService $service
    ): JsonResponse {
        $this->authorize('update', $organizationUnit);
        $slot = $service->addPosition($organizationUnit, $request->validated(), $request->user());

        return OrganizationUnitPositionResource::make($slot)->response()->setStatusCode(201);
    }

    public function update(
        UpdateOrganizationUnitPositionRequest $request,
        OrganizationUnitPosition $unitPosition,
        OrganizationStructureService $service
    ): OrganizationUnitPositionResource {
        return OrganizationUnitPositionResource::make(
            $service->updatePosition($unitPosition, $request->validated(), $request->user())
        );
    }

    public function deactivate(
        OrganizationUnitPosition $unitPosition,
        OrganizationStructureService $service
    ): OrganizationUnitPositionResource {
        $this->authorize('deactivate', $unitPosition);

        return OrganizationUnitPositionResource::make(
            $service->deactivatePosition($unitPosition, request()->user())
        );
    }
}
