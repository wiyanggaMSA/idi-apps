<?php

namespace App\Http\Controllers\Members;

use App\Http\Controllers\Controller;
use App\Models\Division;
use App\Models\Member;
use Inertia\Inertia;
use Inertia\Response;

class MemberController extends Controller
{
    public function __invoke(): Response
    {
        $members = Member::query()
            ->with(['division', 'position'])
            ->orderBy('full_name')
            ->get()
            ->map(fn (Member $member) => [
                'id' => $member->id,
                'npa' => $member->npa,
                'full_name' => $member->full_name,
                'phone' => $member->phone,
                'division' => $member->division?->name,
                'position' => $member->position?->name,
                'status' => $member->status,
            ]);

        $stats = [
            'total' => Member::query()->count(),
            'active' => Member::query()->where('status', 'active')->count(),
            'inactive' => Member::query()->where('status', 'inactive')->count(),
        ];
        return Inertia::render('Members/Index', [
            'members' => $members,
            'stats' => $stats,
            'divisions' => Division::query()
                ->active()
                ->orderBy('name')
                ->get(['id', 'name']),
            'statuses' => [
                ['value' => 'active', 'label' => 'Aktif'],
                ['value' => 'inactive', 'label' => 'Nonaktif'],
                ['value' => 'leave', 'label' => 'Cuti'],
                ['value' => 'alumni', 'label' => 'Alumni'],
            ],
        ]);
    }
}
