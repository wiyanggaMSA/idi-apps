<?php

namespace App\Http\Controllers\WorkPrograms;

use App\Http\Controllers\Controller;
use App\Models\WorkProgram;
use App\Services\WorkPrograms\WorkProgramMonitoringService;
use Illuminate\Http\JsonResponse;

class WorkProgramMonitoringController extends Controller
{
    public function show(WorkProgram $workProgram, WorkProgramMonitoringService $service): JsonResponse
    {
        $this->authorize('view', $workProgram);

        return response()->json($service->dataset($workProgram, request()->user()));
    }
}
