<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\EndOrganizationAssignmentRequest;
use App\Http\Requests\Organization\ReplaceOrganizationAssignmentRequest;
use App\Http\Requests\Organization\StoreOrganizationAssignmentRequest;
use App\Http\Requests\Organization\UpdateOrganizationAssignmentRequest;
use App\Http\Resources\Organization\OrganizationAssignmentResource;
use App\Models\Member;
use App\Models\OrganizationAssignment;
use App\Models\OrganizationPeriod;
use App\Services\Organization\OrganizationAssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrganizationAssignmentController extends Controller
{
    public function index(
        Request $request,
        OrganizationPeriod $organizationPeriod
    ): AnonymousResourceCollection {
        $this->authorize('view', $organizationPeriod);
        $validated = $request->validate([
            'status' => ['nullable', 'in:'.implode(',', OrganizationAssignment::STATUSES)],
            'unit_id' => ['nullable', 'integer', 'exists:organization_units,id'],
            'position_id' => ['nullable', 'integer', 'exists:positions,id'],
            'role_id' => ['nullable', 'integer', 'exists:roles,id'],
            'account' => ['nullable', 'in:available,missing,active,inactive'],
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', 'in:member,started_at,status,created_at'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $sort = $validated['sort'] ?? 'created_at';
        $direction = $validated['direction'] ?? 'desc';
        $query = $organizationPeriod->assignments()
            ->when($validated['status'] ?? null, fn ($builder, $status) => $builder->where('status', $status))
            ->when($validated['unit_id'] ?? null, fn ($builder, $unitId) => $builder->where('organization_unit_id', $unitId))
            ->when($validated['position_id'] ?? null, function ($builder, $positionId) {
                $builder->whereHas('unitPosition', fn ($slot) => $slot->where('position_id', $positionId));
            })
            ->when($validated['role_id'] ?? null, fn ($builder, $roleId) => $builder->where('portal_role_id', $roleId))
            ->when($validated['search'] ?? null, function ($builder, $search) {
                $builder->whereHas('member', function ($member) use ($search) {
                    $member->where(function ($nested) use ($search) {
                        $nested->where('full_name', 'like', "%{$search}%")
                            ->orWhere('npa', 'like', "%{$search}%");
                    });
                });
            })
            ->when($validated['account'] ?? null, function ($builder, $account) {
                match ($account) {
                    'available' => $builder->whereHas('member.user'),
                    'missing' => $builder->whereHas('member', fn ($member) => $member->whereNull('user_id')),
                    'active' => $builder->whereHas('member.user', fn ($user) => $user->where('is_active', true)),
                    'inactive' => $builder->whereHas('member.user', fn ($user) => $user->where('is_active', false)),
                };
            })
            ->with($this->relations());

        if ($sort === 'member') {
            $query->orderBy(
                Member::query()
                    ->select('full_name')
                    ->whereColumn('members.id', 'organization_assignments.member_id')
                    ->limit(1),
                $direction
            );
        } else {
            $query->orderBy($sort, $direction);
        }

        return OrganizationAssignmentResource::collection(
            $query->paginate($validated['per_page'] ?? 20)->withQueryString()
        );
    }

    public function show(OrganizationAssignment $organizationAssignment): OrganizationAssignmentResource
    {
        $this->authorize('view', $organizationAssignment);

        return OrganizationAssignmentResource::make(
            $organizationAssignment->load($this->relations())
        );
    }

    public function store(
        StoreOrganizationAssignmentRequest $request,
        OrganizationAssignmentService $service
    ): JsonResponse {
        $assignment = $service->assign($request->validated(), $request->user());

        return OrganizationAssignmentResource::make($assignment)
            ->response()
            ->setStatusCode(201);
    }

    public function update(
        UpdateOrganizationAssignmentRequest $request,
        OrganizationAssignment $organizationAssignment,
        OrganizationAssignmentService $service
    ): OrganizationAssignmentResource {
        return OrganizationAssignmentResource::make(
            $service->update($organizationAssignment, $request->validated(), $request->user())
        );
    }

    public function replace(
        ReplaceOrganizationAssignmentRequest $request,
        OrganizationAssignment $organizationAssignment,
        OrganizationAssignmentService $service
    ): OrganizationAssignmentResource {
        return OrganizationAssignmentResource::make(
            $service->replace($organizationAssignment, $request->validated(), $request->user())
        );
    }

    public function end(
        EndOrganizationAssignmentRequest $request,
        OrganizationAssignment $organizationAssignment,
        OrganizationAssignmentService $service
    ): OrganizationAssignmentResource {
        return OrganizationAssignmentResource::make(
            $service->end(
                $organizationAssignment,
                $request->input('ended_at'),
                $request->input('reason'),
                $request->user()
            )
        );
    }

    /**
     * @return list<string>
     */
    private function relations(): array
    {
        return [
            'period:id,name,status,is_active,start_date,end_date',
            'organizationUnit:id,name,is_core_structure',
            'unitPosition:id,position_id,custom_title',
            'unitPosition.position:id,name',
            'member:id,user_id,npa,full_name,education,email,phone',
            'member.user:id,is_active',
            'portalRole:id,name',
            'creator:id,name',
            'updater:id,name',
            'endedBy:id,name',
            'replacedBy:id,member_id',
            'replacedBy.member:id,full_name,education',
        ];
    }
}
