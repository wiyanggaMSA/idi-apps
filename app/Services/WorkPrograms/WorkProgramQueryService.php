<?php

namespace App\Services\WorkPrograms;

use App\Models\User;
use App\Models\WorkProgram;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class WorkProgramQueryService
{
    public function query(Request $request, User $user): Builder
    {
        $query = WorkProgram::query()->visibleTo($user);

        $this->applyFilters($query, $request);
        $this->applySorting(
            $query,
            (string) $request->input('sortBy', 'created_at'),
            (string) $request->input('sortDir', 'desc')
        );

        return $query;
    }

    public function applyFilters(Builder $query, Request $request): void
    {
        $search = trim((string) $request->input('search'));

        $query
            ->when($search !== '', function (Builder $query) use ($search) {
                $query->where(function (Builder $sub) use ($search) {
                    $sub->where('program_code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('category', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($request->input('year'), fn (Builder $query, $year) => $query->where('year', (int) $year))
            ->when($request->input('period_id'), fn (Builder $query, $periodId) => $query->where('work_program_period_id', $periodId))
            ->when($request->input('division_id'), fn (Builder $query, $divisionId) => $query->where('division_id', $divisionId))
            ->when($request->input('status'), fn (Builder $query, $status) => $query->where('status', $status))
            ->when($request->input('priority'), fn (Builder $query, $priority) => $query->where('priority', $priority))
            ->when($request->input('pic_user_id'), fn (Builder $query, $picUserId) => $query->where('primary_pic_user_id', $picUserId))
            ->when($request->input('category'), fn (Builder $query, $category) => $query->where('category', $category))
            ->when($request->input('start_date'), fn (Builder $query, $startDate) => $query->whereDate('planned_start_date', '>=', $startDate))
            ->when($request->input('end_date'), fn (Builder $query, $endDate) => $query->whereDate('planned_end_date', '<=', $endDate));
    }

    public function applySorting(Builder $query, string $sortBy, string $sortDir): void
    {
        $allowedSorts = [
            'program_code',
            'name',
            'year',
            'status',
            'priority',
            'planned_start_date',
            'planned_end_date',
            'estimated_budget',
            'created_at',
            'updated_at',
        ];

        if (! in_array($sortBy, $allowedSorts, true)) {
            $sortBy = 'created_at';
        }

        if (! in_array($sortDir, ['asc', 'desc'], true)) {
            $sortDir = 'desc';
        }

        $query->orderBy($sortBy, $sortDir)->orderBy('id', $sortDir);
    }
}
