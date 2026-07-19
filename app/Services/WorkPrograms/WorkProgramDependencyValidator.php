<?php

namespace App\Services\WorkPrograms;

use App\Models\WorkProgramTask;
use App\Models\WorkProgramTaskDependency;

class WorkProgramDependencyValidator
{
    public function ensureNoHierarchyCycle(WorkProgramTask $task, ?int $parentTaskId): void
    {
        if (! $parentTaskId) {
            return;
        }

        if ($task->exists && (int) $task->id === (int) $parentTaskId) {
            throw new \InvalidArgumentException('Task tidak boleh menjadi parent untuk dirinya sendiri.');
        }

        $parent = WorkProgramTask::query()->findOrFail($parentTaskId);

        if ((int) $parent->work_program_id !== (int) $task->work_program_id) {
            throw new \InvalidArgumentException('Parent task harus berada dalam program kerja yang sama.');
        }

        while ($parent) {
            if ($task->exists && (int) $parent->id === (int) $task->id) {
                throw new \InvalidArgumentException('Hierarchy task tidak boleh circular.');
            }

            $parent = $parent->parent_task_id
                ? WorkProgramTask::query()->find($parent->parent_task_id)
                : null;
        }
    }

    public function ensureNoDependencyCycle(
        int $workProgramId,
        int $predecessorTaskId,
        int $successorTaskId,
        ?int $ignoreDependencyId = null
    ): void {
        if ($predecessorTaskId === $successorTaskId) {
            throw new \InvalidArgumentException('Task tidak boleh bergantung pada dirinya sendiri.');
        }

        $taskProgramIds = WorkProgramTask::query()
            ->whereIn('id', [$predecessorTaskId, $successorTaskId])
            ->pluck('work_program_id', 'id');

        if ($taskProgramIds->count() !== 2
            || (int) $taskProgramIds[$predecessorTaskId] !== $workProgramId
            || (int) $taskProgramIds[$successorTaskId] !== $workProgramId) {
            throw new \InvalidArgumentException('Dependency hanya boleh dibuat antar task dalam program kerja yang sama.');
        }

        $edges = WorkProgramTaskDependency::query()
            ->where('work_program_id', $workProgramId)
            ->when($ignoreDependencyId, fn ($query) => $query->whereKeyNot($ignoreDependencyId))
            ->get(['predecessor_task_id', 'successor_task_id'])
            ->map(fn (WorkProgramTaskDependency $dependency) => [
                (int) $dependency->predecessor_task_id,
                (int) $dependency->successor_task_id,
            ])
            ->push([$predecessorTaskId, $successorTaskId]);

        $graph = [];
        foreach ($edges as [$from, $to]) {
            $graph[$from][] = $to;
        }

        if ($this->hasCycleFrom($predecessorTaskId, $graph, [], [])) {
            throw new \InvalidArgumentException('Dependency task tidak boleh circular.');
        }
    }

    /**
     * @param  array<int, list<int>>  $graph
     * @param  array<int, bool>  $visiting
     * @param  array<int, bool>  $visited
     */
    private function hasCycleFrom(int $node, array $graph, array $visiting, array $visited): bool
    {
        if ($visiting[$node] ?? false) {
            return true;
        }

        if ($visited[$node] ?? false) {
            return false;
        }

        $visiting[$node] = true;

        foreach ($graph[$node] ?? [] as $next) {
            if ($this->hasCycleFrom($next, $graph, $visiting, $visited)) {
                return true;
            }
        }

        $visiting[$node] = false;
        $visited[$node] = true;

        return false;
    }
}
