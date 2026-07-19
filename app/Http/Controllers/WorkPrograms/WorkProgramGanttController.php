<?php

namespace App\Http\Controllers\WorkPrograms;

use App\Http\Controllers\Controller;
use App\Models\WorkProgram;
use App\Services\WorkPrograms\WorkProgramGanttDataService;
use Illuminate\Http\JsonResponse;

class WorkProgramGanttController extends Controller
{
    public function show(WorkProgram $workProgram, WorkProgramGanttDataService $service): JsonResponse
    {
        $this->authorize('view', $workProgram);

        return response()->json($service->dataset($workProgram));
    }
}
