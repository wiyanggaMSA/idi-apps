<?php

namespace App\Http\Controllers\WorkPrograms;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkPrograms\StoreWorkProgramTaskDependencyRequest;
use App\Models\WorkProgram;
use App\Models\WorkProgramTask;
use App\Models\WorkProgramTaskDependency;
use App\Services\WorkPrograms\WorkProgramTaskDependencyService;
use Illuminate\Http\JsonResponse;

class WorkProgramTaskDependencyController extends Controller
{
    public function index(WorkProgram $workProgram): JsonResponse
    {
        $this->authorize('view', $workProgram);

        return response()->json([
            'data' => $workProgram->tasks()
                ->with('outgoingDependencies')
                ->get()
                ->flatMap->outgoingDependencies
                ->map(fn (WorkProgramTaskDependency $dependency) => $this->serialize($dependency))
                ->values(),
        ]);
    }

    public function store(StoreWorkProgramTaskDependencyRequest $request, WorkProgram $workProgram, WorkProgramTaskDependencyService $service): JsonResponse
    {
        $this->authorize('manageDependency', [WorkProgramTask::class, $workProgram]);

        try {
            $dependency = $service->create($workProgram, $request->validated(), $request->user());
        } catch (\InvalidArgumentException|\RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json(['data' => $this->serialize($dependency)], 201);
    }

    public function destroy(WorkProgram $workProgram, WorkProgramTaskDependency $dependency, WorkProgramTaskDependencyService $service): JsonResponse
    {
        abort_unless((int) $dependency->work_program_id === (int) $workProgram->id, 404);
        $this->authorize('manageDependency', [WorkProgramTask::class, $workProgram]);

        $service->delete($dependency, request()->user());

        return response()->json(['message' => 'Dependency task berhasil dihapus.']);
    }

    private function serialize(WorkProgramTaskDependency $dependency): array
    {
        return [
            'id' => $dependency->id,
            'work_program_id' => $dependency->work_program_id,
            'predecessor_task_id' => $dependency->predecessor_task_id,
            'successor_task_id' => $dependency->successor_task_id,
            'type' => $dependency->type,
            'lag_days' => $dependency->lag_days,
        ];
    }
}
