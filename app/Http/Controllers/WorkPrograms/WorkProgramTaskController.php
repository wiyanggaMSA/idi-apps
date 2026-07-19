<?php

namespace App\Http\Controllers\WorkPrograms;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkPrograms\BulkUpdateWorkProgramTaskScheduleRequest;
use App\Http\Requests\WorkPrograms\StoreWorkProgramTaskRequest;
use App\Http\Requests\WorkPrograms\UpdateWorkProgramTaskProgressRequest;
use App\Http\Requests\WorkPrograms\UpdateWorkProgramTaskRequest;
use App\Models\WorkProgram;
use App\Models\WorkProgramTask;
use App\Services\WorkPrograms\WorkProgramTaskService;
use Illuminate\Http\JsonResponse;

class WorkProgramTaskController extends Controller
{
    public function index(WorkProgram $workProgram): JsonResponse
    {
        $this->authorize('view', $workProgram);

        $tasks = $workProgram->tasks()
            ->with(['pic:id,name,email', 'assignees.user:id,name,email'])
            ->orderBy('parent_task_id')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (WorkProgramTask $task) => $this->serialize($task));

        return response()->json(['data' => $tasks]);
    }

    public function store(StoreWorkProgramTaskRequest $request, WorkProgram $workProgram, WorkProgramTaskService $service): JsonResponse
    {
        $this->authorize('create', [WorkProgramTask::class, $workProgram]);

        try {
            $task = $service->create($workProgram, $request->validated(), $request->user());
        } catch (\InvalidArgumentException|\RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json(['data' => $this->serialize($task)], 201);
    }

    public function update(UpdateWorkProgramTaskRequest $request, WorkProgram $workProgram, WorkProgramTask $task, WorkProgramTaskService $service): JsonResponse
    {
        $this->ensureTaskBelongsToProgram($workProgram, $task);
        $this->authorize('update', $task);

        try {
            $task = $service->update($task, $request->validated(), $request->user());
        } catch (\InvalidArgumentException|\RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json(['data' => $this->serialize($task)]);
    }

    public function updateProgress(UpdateWorkProgramTaskProgressRequest $request, WorkProgram $workProgram, WorkProgramTask $task, WorkProgramTaskService $service): JsonResponse
    {
        $this->ensureTaskBelongsToProgram($workProgram, $task);
        $this->authorize('updateProgress', $task);

        try {
            $task = $service->update($task, $request->validated(), $request->user());
        } catch (\InvalidArgumentException|\RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json(['data' => $this->serialize($task)]);
    }

    public function destroy(WorkProgram $workProgram, WorkProgramTask $task, WorkProgramTaskService $service): JsonResponse
    {
        $this->ensureTaskBelongsToProgram($workProgram, $task);
        $this->authorize('delete', $task);

        $service->delete($task, request()->user());

        return response()->json(['message' => 'Task program kerja berhasil dihapus.']);
    }

    public function bulkSchedule(BulkUpdateWorkProgramTaskScheduleRequest $request, WorkProgram $workProgram, WorkProgramTaskService $service): JsonResponse
    {
        $this->authorize('manageDependency', [WorkProgramTask::class, $workProgram]);

        try {
            $tasks = $service->bulkSchedule($workProgram, $request->validated('tasks'), $request->user());
        } catch (\InvalidArgumentException|\RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json([
            'data' => collect($tasks)->map(fn (WorkProgramTask $task) => $this->serialize($task))->values(),
        ]);
    }

    private function ensureTaskBelongsToProgram(WorkProgram $program, WorkProgramTask $task): void
    {
        abort_unless((int) $task->work_program_id === (int) $program->id, 404);
    }

    private function serialize(WorkProgramTask $task): array
    {
        $task->loadMissing(['pic:id,name,email', 'assignees.user:id,name,email']);

        return [
            'id' => $task->id,
            'work_program_id' => $task->work_program_id,
            'parent_task_id' => $task->parent_task_id,
            'task_code' => $task->task_code,
            'sort_order' => $task->sort_order,
            'name' => $task->name,
            'description' => $task->description,
            'planned_start_date' => optional($task->planned_start_date)->format('Y-m-d'),
            'planned_end_date' => optional($task->planned_end_date)->format('Y-m-d'),
            'actual_start_date' => optional($task->actual_start_date)->format('Y-m-d'),
            'actual_end_date' => optional($task->actual_end_date)->format('Y-m-d'),
            'duration_days' => $task->duration_days,
            'progress' => $task->progress,
            'weight' => $task->weight,
            'status' => $task->status,
            'priority' => $task->priority,
            'is_milestone' => $task->is_milestone,
            'estimated_cost' => $task->estimated_cost,
            'realized_cost' => $task->realized_cost,
            'notes' => $task->notes,
            'lock_version' => $task->lock_version,
            'pic' => $task->pic?->only(['id', 'name', 'email']),
            'assignees' => $task->assignees->map(fn ($assignee) => $assignee->user?->only(['id', 'name', 'email']))->filter()->values(),
        ];
    }
}
