<?php

namespace App\Http\Controllers\WorkPrograms;

use App\Http\Controllers\Controller;
use App\Models\WorkProgram;
use App\Models\WorkProgramCollaboratorDivision;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkProgramCollaboratorDivisionController extends Controller
{
    public function store(Request $request, WorkProgram $workProgram): JsonResponse
    {
        $this->authorize('manageTasks', $workProgram);

        $data = $request->validate([
            'division_id' => ['required', 'integer', 'exists:divisions,id'],
        ]);

        if ((int) $data['division_id'] === (int) $workProgram->division_id) {
            return response()->json(['message' => 'Bidang utama sudah otomatis menjadi bidang utama program.'], 422);
        }

        $collaborator = WorkProgramCollaboratorDivision::query()->firstOrCreate([
            'work_program_id' => $workProgram->id,
            'division_id' => $data['division_id'],
        ]);

        $collaborator->load('division:id,name,code');

        activity('work_program')
            ->causedBy($request->user())
            ->performedOn($workProgram)
            ->withProperties(['division_id' => $data['division_id']])
            ->log('work_program.collaborator_division.created');

        return response()->json([
            'data' => [
                'id' => $collaborator->id,
                'division' => $collaborator->division?->only(['id', 'name', 'code']),
            ],
        ], 201);
    }

    public function destroy(Request $request, WorkProgram $workProgram, WorkProgramCollaboratorDivision $collaborator): JsonResponse
    {
        $this->ensureCollaboratorBelongsToProgram($workProgram, $collaborator);
        $this->authorize('manageTasks', $workProgram);

        $divisionId = $collaborator->division_id;
        $collaborator->delete();

        activity('work_program')
            ->causedBy($request->user())
            ->performedOn($workProgram)
            ->withProperties(['division_id' => $divisionId])
            ->log('work_program.collaborator_division.deleted');

        return response()->json(['message' => 'Bidang kolaborator berhasil dihapus.']);
    }

    private function ensureCollaboratorBelongsToProgram(WorkProgram $workProgram, WorkProgramCollaboratorDivision $collaborator): void
    {
        abort_unless((int) $collaborator->work_program_id === (int) $workProgram->id, 404);
    }
}
