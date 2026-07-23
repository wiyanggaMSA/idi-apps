<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Http\Resources\Organization\OrganizationAssignmentResource;
use App\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizationMemberController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('organization.assignment.manage'), 403);
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:100'],
            'period_id' => ['nullable', 'integer', 'exists:organization_periods,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        $search = trim($validated['q']);
        $periodId = $validated['period_id'] ?? null;

        $members = Member::query()
            ->select(['id', 'user_id', 'npa', 'full_name', 'education', 'email', 'phone', 'status'])
            ->assignableActive()
            ->where(function ($query) use ($search) {
                $query->where('full_name', 'like', "%{$search}%")
                    ->orWhere('npa', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");

                if (ctype_digit($search)) {
                    $query->orWhereKey((int) $search);
                }
            })
            ->with('user:id,is_active')
            ->when($periodId, function ($query, $periodId) {
                $query->withExists([
                    'organizationAssignments as has_current_assignment' => fn ($assignment) => $assignment
                        ->where('period_id', $periodId)
                        ->current(),
                ]);
            })
            ->orderBy('full_name')
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString()
            ->through(fn (Member $member) => $this->memberSummary($member, $periodId));

        return response()->json([
            'data' => $members->items(),
            'links' => [
                'first' => $members->url(1),
                'last' => $members->url($members->lastPage()),
                'prev' => $members->previousPageUrl(),
                'next' => $members->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $members->currentPage(),
                'from' => $members->firstItem(),
                'last_page' => $members->lastPage(),
                'path' => $members->path(),
                'per_page' => $members->perPage(),
                'to' => $members->lastItem(),
                'total' => $members->total(),
            ],
        ]);
    }

    public function eligibility(Request $request, Member $member): JsonResponse
    {
        abort_unless($request->user()?->can('organization.assignment.manage'), 403);
        $validated = $request->validate([
            'period_id' => ['required', 'integer', 'exists:organization_periods,id'],
        ]);
        $member->load(['memberStatus', 'user:id,is_active']);
        $current = $member->organizationAssignments()
            ->current()
            ->where('period_id', $validated['period_id'])
            ->with(['organizationUnit:id,name', 'unitPosition:id,custom_title,position_id', 'unitPosition.position:id,name'])
            ->first();
        $active = $member->hasAssignableActiveStatus();

        return response()->json([
            'data' => [
                ...$this->memberSummary($member, $validated['period_id']),
                'has_current_assignment' => $current !== null,
                'eligible' => $active && ! $current,
                'reason' => ! $active
                    ? 'Member tidak berstatus aktif.'
                    : ($current ? 'Member sudah memiliki assignment pada periode ini.' : null),
                'current_assignment' => $current
                    ? OrganizationAssignmentResource::make($current)->resolve($request)
                    : null,
            ],
        ]);
    }

    public function history(Request $request, Member $member): JsonResponse
    {
        abort_unless($request->user()?->can('organization.history.view'), 403);
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $assignments = $member->organizationAssignments()
            ->with([
                'period:id,name,status,is_active,start_date,end_date',
                'organizationUnit:id,name,is_core_structure',
                'unitPosition:id,position_id,custom_title',
                'unitPosition.position:id,name',
                'portalRole:id,name',
                'creator:id,name',
                'updater:id,name',
                'endedBy:id,name',
                'replacedBy:id,member_id',
                'replacedBy.member:id,full_name,education',
            ])
            ->orderByDesc('started_at')
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return OrganizationAssignmentResource::collection($assignments)->response();
    }

    /**
     * @return array<string, mixed>
     */
    private function memberSummary(Member $member, ?int $periodId): array
    {
        return [
            'id' => $member->id,
            'npa' => $member->npa,
            'full_name' => $member->full_name,
            'education' => $member->education,
            'email' => $member->email,
            'phone' => $member->phone,
            'status' => $member->status,
            'account' => [
                'exists' => $member->user !== null,
                'is_active' => (bool) $member->user?->is_active,
            ],
            'has_current_assignment' => $periodId
                ? (bool) ($member->has_current_assignment ?? false)
                : null,
        ];
    }
}
