<?php

namespace App\Services\Members;

use App\Models\Member;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class MemberQueryService
{
    public function query(Request $request): Builder
    {
        $search = trim((string) $request->input('search'));
        $status = $request->input('status');
        $gender = $request->input('gender');
        $divisionId = $request->input('division_id');
        $positionId = $request->input('position_id');

        $sortBy = $request->input('sortBy', 'full_name');
        $sortDir = $request->input('sortDir', 'asc');

        $allowedSorts = [
            'npa',
            'full_name',
            'email',
            'phone',
            'status',
            'join_date',
            'created_at',
        ];

        if (! in_array($sortBy, $allowedSorts, true)) {
            $sortBy = 'full_name';
        }

        if (! in_array($sortDir, ['asc', 'desc'], true)) {
            $sortDir = 'asc';
        }

        return Member::query()
            ->when($search, function (Builder $query) use ($search) {
                $query->where(function (Builder $sub) use ($search) {
                    $sub->where('npa', 'like', "%{$search}%")
                        ->orWhere('full_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($status, fn (Builder $query) => $query->where('status', $status))
            ->when($gender, fn (Builder $query) => $query->where('gender', $gender))
            ->when($divisionId, fn (Builder $query) => $query->where('division_id', $divisionId))
            ->when($positionId, fn (Builder $query) => $query->where('position_id', $positionId))
            ->orderBy($sortBy, $sortDir);
    }
}
