<?php

namespace App\Http\Controllers\WorkPrograms;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkPrograms\StoreWorkProgramRiskRequest;
use App\Http\Requests\WorkPrograms\UpdateWorkProgramRiskRequest;
use App\Models\WorkProgram;
use App\Models\WorkProgramRisk;
use App\Models\WorkProgramTask;
use App\Services\WorkPrograms\WorkProgramMonitoringService;
use Illuminate\Http\JsonResponse;

class WorkProgramRiskController extends Controller
{
    public function store(StoreWorkProgramRiskRequest $request, WorkProgram $workProgram, WorkProgramMonitoringService $service): JsonResponse
    {
        $this->authorize('manageTasks', $workProgram);
        $data = $this->normalize($request->validated(), $workProgram, $service);

        $risk = WorkProgramRisk::query()->create([
            ...$data,
            'work_program_id' => $workProgram->id,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
            'resolved_at' => in_array($data['status'], ['resolved', 'closed'], true) ? now() : null,
        ]);

        activity('work_program')
            ->causedBy($request->user())
            ->performedOn($workProgram)
            ->withProperties(['risk_id' => $risk->id, 'level' => $risk->level])
            ->log('work_program.risk.created');

        return response()->json(['data' => $risk->fresh(['owner:id,name,email', 'task:id,task_code,name'])], 201);
    }

    public function update(UpdateWorkProgramRiskRequest $request, WorkProgram $workProgram, WorkProgramRisk $risk, WorkProgramMonitoringService $service): JsonResponse
    {
        $this->ensureRiskBelongsToProgram($workProgram, $risk);
        $this->authorize('manageTasks', $workProgram);

        $data = $this->normalize($request->validated(), $workProgram, $service);
        $data['updated_by'] = $request->user()->id;
        $data['resolved_at'] = in_array($data['status'], ['resolved', 'closed'], true) ? ($risk->resolved_at ?? now()) : null;

        $risk->update($data);

        activity('work_program')
            ->causedBy($request->user())
            ->performedOn($workProgram)
            ->withProperties(['risk_id' => $risk->id, 'level' => $risk->level])
            ->log('work_program.risk.updated');

        return response()->json(['data' => $risk->fresh(['owner:id,name,email', 'task:id,task_code,name'])]);
    }

    public function destroy(WorkProgram $workProgram, WorkProgramRisk $risk): JsonResponse
    {
        $this->ensureRiskBelongsToProgram($workProgram, $risk);
        $this->authorize('manageTasks', $workProgram);

        $risk->delete();

        activity('work_program')
            ->causedBy(request()->user())
            ->performedOn($workProgram)
            ->withProperties(['risk_id' => $risk->id])
            ->log('work_program.risk.deleted');

        return response()->json(['message' => 'Risiko program kerja berhasil dihapus.']);
    }

    private function normalize(array $data, WorkProgram $program, WorkProgramMonitoringService $service): array
    {
        if (! empty($data['work_program_task_id'])) {
            $belongs = WorkProgramTask::query()
                ->where('work_program_id', $program->id)
                ->whereKey($data['work_program_task_id'])
                ->exists();

            abort_unless($belongs, 422, 'Task tidak berada pada program kerja ini.');
        }

        $data['level'] = $service->riskLevel((int) $data['likelihood'], (int) $data['impact']);
        $data['severity'] = $data['level'] === WorkProgramRisk::LEVEL_EXTREME ? 'critical' : $data['level'];

        return $data;
    }

    private function ensureRiskBelongsToProgram(WorkProgram $program, WorkProgramRisk $risk): void
    {
        abort_unless((int) $risk->work_program_id === (int) $program->id, 404);
    }
}
