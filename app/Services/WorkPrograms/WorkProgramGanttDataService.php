<?php

namespace App\Services\WorkPrograms;

use App\Models\User;
use App\Models\WorkProgram;

class WorkProgramGanttDataService
{
    public function dataset(WorkProgram $program): array
    {
        $program->loadMissing([
            'division:id,name,code',
            'primaryPic:id,name,email',
            'tasks.pic:id,name,email',
            'tasks.assignees.user:id,name,email',
            'tasks.outgoingDependencies',
        ]);

        return [
            'program' => [
                'id' => "program:{$program->id}",
                'database_id' => $program->id,
                'name' => $program->name,
                'program_code' => $program->program_code,
                'status' => $program->status,
                'planned_start_date' => optional($program->planned_start_date)->format('Y-m-d'),
                'planned_end_date' => optional($program->planned_end_date)->format('Y-m-d'),
                'progress' => $this->programProgress($program),
                'division' => $program->division?->only(['id', 'name', 'code']),
                'primary_pic' => $program->primaryPic?->only(['id', 'name', 'email']),
            ],
            'tasks' => $program->tasks
                ->sortBy([['parent_task_id', 'asc'], ['sort_order', 'asc'], ['id', 'asc']])
                ->map(fn ($task) => [
                    'id' => "task:{$task->id}",
                    'database_id' => $task->id,
                    'program_id' => $program->id,
                    'parent_id' => $task->parent_task_id ? "task:{$task->parent_task_id}" : "program:{$program->id}",
                    'parent_task_id' => $task->parent_task_id,
                    'task_code' => $task->task_code,
                    'name' => $task->name,
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'planned_start_date' => optional($task->planned_start_date)->format('Y-m-d'),
                    'planned_end_date' => optional($task->planned_end_date)->format('Y-m-d'),
                    'actual_start_date' => optional($task->actual_start_date)->format('Y-m-d'),
                    'actual_end_date' => optional($task->actual_end_date)->format('Y-m-d'),
                    'duration_days' => $task->duration_days,
                    'progress' => $task->progress,
                    'weight' => $task->weight,
                    'is_milestone' => $task->is_milestone,
                    'sort_order' => $task->sort_order,
                    'lock_version' => $task->lock_version,
                    'pic' => $task->pic?->only(['id', 'name', 'email']),
                    'assignees' => $task->assignees->map(fn ($assignee) => [
                        'id' => $assignee->user?->id,
                        'name' => $assignee->user?->name,
                        'email' => $assignee->user?->email,
                    ])->filter(fn ($user) => $user['id'] !== null)->values(),
                ])
                ->values(),
            'dependencies' => $program->tasks
                ->flatMap->outgoingDependencies
                ->map(fn ($dependency) => [
                    'id' => $dependency->id,
                    'source' => "task:{$dependency->predecessor_task_id}",
                    'target' => "task:{$dependency->successor_task_id}",
                    'predecessor_task_id' => $dependency->predecessor_task_id,
                    'successor_task_id' => $dependency->successor_task_id,
                    'type' => $dependency->type,
                    'lag_days' => $dependency->lag_days,
                ])
                ->values(),
            'users' => User::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'email']),
        ];
    }

    private function programProgress(WorkProgram $program): int
    {
        $tasks = $this->leafTasks($program->tasks);

        if ($tasks->isEmpty()) {
            return 0;
        }

        $totalWeight = $tasks->sum(fn ($task) => (float) $task->weight);

        if ($totalWeight > 0) {
            return (int) round($tasks->sum(fn ($task) => (float) $task->weight * (int) $task->progress) / $totalWeight);
        }

        return (int) round($tasks->avg('progress') ?? 0);
    }

    private function leafTasks($tasks)
    {
        $parentIds = $tasks
            ->pluck('parent_task_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique();

        return $tasks
            ->reject(fn ($task) => $parentIds->contains((int) $task->id))
            ->values();
    }
}
