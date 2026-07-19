<?php

namespace App\Services\WorkPrograms;

use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramTask;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class WorkProgramReportService
{
    public function rows(Request $request, User $user): Collection
    {
        $programs = WorkProgram::query()
            ->visibleTo($user)
            ->with([
                'period:id,name,code',
                'division:id,name,code',
                'primaryPic:id,name,email',
                'tasks:id,work_program_id,parent_task_id,status,progress,weight,planned_end_date',
            ])
            ->when($request->filled('program_id'), fn ($query) => $query->whereKey($request->integer('program_id')))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search')->toString();

                $query->where(function ($scope) use ($search) {
                    $scope->where('name', 'like', "%{$search}%")
                        ->orWhere('program_code', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('year'), fn ($query) => $query->where('year', $request->integer('year')))
            ->when($request->filled('period_id'), fn ($query) => $query->where('work_program_period_id', $request->integer('period_id')))
            ->when($request->filled('division_id'), fn ($query) => $query->where('division_id', $request->integer('division_id')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
            ->when($request->filled('priority'), fn ($query) => $query->where('priority', $request->input('priority')))
            ->when($request->filled('pic_user_id'), fn ($query) => $query->where('primary_pic_user_id', $request->integer('pic_user_id')))
            ->when($request->filled('budget_min'), fn ($query) => $query->where('estimated_budget', '>=', (float) $request->input('budget_min')))
            ->when($request->filled('budget_max'), fn ($query) => $query->where('estimated_budget', '<=', (float) $request->input('budget_max')))
            ->orderByDesc('year')
            ->orderBy('planned_start_date')
            ->get();

        $rows = $programs->map(fn (WorkProgram $program) => $this->serialize($program));

        if ($request->filled('progress_min')) {
            $rows = $rows->where('progress', '>=', (int) $request->input('progress_min'));
        }

        if ($request->filled('progress_max')) {
            $rows = $rows->where('progress', '<=', (int) $request->input('progress_max'));
        }

        if ($request->filled('overdue')) {
            $wantOverdue = filter_var($request->input('overdue'), FILTER_VALIDATE_BOOL);
            $rows = $rows->filter(fn (array $row) => (bool) $row['overdue'] === $wantOverdue);
        }

        return $rows->values();
    }

    public function summary(Collection $rows): array
    {
        return [
            'total' => $rows->count(),
            'overdue' => $rows->where('overdue', true)->count(),
            'average_progress' => (int) round($rows->avg('progress') ?? 0),
            'estimated_budget' => (float) $rows->sum('estimated_budget'),
            'realized_budget' => (float) $rows->sum('realized_budget'),
        ];
    }

    public function filterSnapshot(Request $request): array
    {
        return collect([
            'search',
            'year',
            'period_id',
            'division_id',
            'status',
            'priority',
            'pic_user_id',
            'progress_min',
            'progress_max',
            'overdue',
            'budget_min',
            'budget_max',
            'program_id',
        ])
            ->mapWithKeys(fn (string $key) => [$key => $request->input($key)])
            ->filter(fn ($value) => filled($value))
            ->all();
    }

    private function serialize(WorkProgram $program): array
    {
        $progress = $this->progressForTasks($program->tasks);
        $today = CarbonImmutable::today();
        $terminalStatuses = [
            WorkProgram::STATUS_COMPLETED,
            WorkProgram::STATUS_EVALUATED,
            WorkProgram::STATUS_ARCHIVED,
            WorkProgram::STATUS_CANCELLED,
            WorkProgram::STATUS_REJECTED,
        ];

        return [
            'id' => $program->id,
            'program_code' => $program->program_code,
            'name' => $program->name,
            'period' => $program->period?->name,
            'period_code' => $program->period?->code,
            'year' => $program->year,
            'division' => $program->division?->name,
            'status' => $program->status,
            'priority' => $program->priority,
            'progress' => $progress,
            'primary_pic' => $program->primaryPic?->name,
            'planned_start_date' => optional($program->planned_start_date)->format('Y-m-d'),
            'planned_end_date' => optional($program->planned_end_date)->format('Y-m-d'),
            'overdue' => $program->planned_end_date
                && $program->planned_end_date->lt($today)
                && ! in_array($program->status, $terminalStatuses, true),
            'estimated_budget' => (float) $program->estimated_budget,
            'realized_budget' => (float) $program->realized_budget,
            'budget_source' => $program->budget_source,
            'task_total' => $program->tasks->count(),
            'task_completed' => $program->tasks->where('status', WorkProgramTask::STATUS_COMPLETED)->count(),
        ];
    }

    private function progressForTasks(Collection $tasks): int
    {
        $parentIds = $tasks
            ->pluck('parent_task_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique();

        $leafTasks = $tasks
            ->reject(fn ($task) => $parentIds->contains((int) $task->id))
            ->values();

        if ($leafTasks->isEmpty()) {
            return 0;
        }

        $totalWeight = (float) $leafTasks->sum(fn ($task) => (float) $task->weight);

        if ($totalWeight <= 0) {
            return (int) round($leafTasks->avg('progress') ?? 0);
        }

        $weighted = $leafTasks->sum(fn ($task) => ((float) $task->progress) * ((float) $task->weight));

        return (int) round($weighted / $totalWeight);
    }
}
