<?php

namespace App\Http\Controllers\Members;

use App\Http\Controllers\Controller;
use App\Http\Requests\Members\StoreMemberRequest;
use App\Http\Requests\Members\UpdateMemberRequest;
use App\Models\Division;
use App\Models\Member;
use App\Models\Position;
use App\Services\Members\MemberQueryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MemberController extends Controller
{
    public function index(Request $request, MemberQueryService $queryService): Response
    {
        $perPage = 15;

        $members = $queryService
            ->query($request)
            ->with(['division', 'position'])
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Member $member) => [
                'id' => $member->id,
                'npa' => $member->npa,
                'full_name' => $member->full_name,
                'education' => $member->education,
                'phone' => $member->phone,
                'gender' => $member->gender,
                'birth_place' => $member->birth_place,
                'birth_date' => optional($member->birth_date)->format('Y-m-d'),
                'email' => $member->email,
                'division_id' => $member->division_id,
                'division' => $member->division?->name,
                'position' => $member->position?->name,
                'position_id' => $member->position_id,
                'join_date' => optional($member->join_date)->format('Y-m-d'),
                'status' => $member->status,
                'sip_1' => $member->sip_1,
                'sip_2' => $member->sip_2,
                'sip_3' => $member->sip_3,
                'address' => $member->address,
                'notes' => $member->notes,
                'created_at' => optional($member->created_at)->format('Y-m-d'),
            ]);

        $stats = [
            'total' => Member::query()->count(),
            'active' => Member::query()->where('status', 'aktif')->count(),
            'mutasi' => Member::query()->where('status', 'mutasi')->count(),
            'meninggal' => Member::query()->where('status', 'meninggal')->count(),
        ];
        return Inertia::render('Members/Index', [
            'members' => $members,
            'stats' => $stats,
            'divisions' => Division::query()->active()->orderBy('name')->get(['id', 'name']),
            'positions' => Position::query()->active()->orderBy('name')->get(['id', 'name']),
            'statuses' => [
                ['value' => 'aktif', 'label' => 'Aktif'],
                ['value' => 'mutasi', 'label' => 'Mutasi'],
                ['value' => 'meninggal', 'label' => 'Meninggal'],
            ],
            'genders' => [
                ['value' => 'M', 'label' => 'Laki-laki'],
                ['value' => 'F', 'label' => 'Perempuan'],
            ],
            'filters' => [
                'search' => $request->input('search'),
                'status' => $request->input('status'),
                'gender' => $request->input('gender'),
                'division_id' => $request->input('division_id'),
                'position_id' => $request->input('position_id'),
                'page' => $request->input('page', 1),
                'sortBy' => $request->input('sortBy', 'full_name'),
                'sortDir' => $request->input('sortDir', 'asc'),
            ],
        ]);
    }

    public function store(StoreMemberRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['status'] = $data['status'] ?? 'aktif';

        Member::create($data);

        return redirect()->back();
    }

    public function update(UpdateMemberRequest $request, Member $member): RedirectResponse
    {
        $member->update($request->validated());

        return redirect()->back();
    }

    public function destroy(Member $member): RedirectResponse
    {
        $member->delete();

        return redirect()->back();
    }
}
