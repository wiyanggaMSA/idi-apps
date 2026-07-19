<?php

namespace App\Http\Controllers\WorkPrograms;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkPrograms\UpsertWorkProgramEvaluationRequest;
use App\Models\DocumentLink;
use App\Models\WorkProgram;
use App\Models\WorkProgramApproval;
use App\Models\WorkProgramEvaluation;
use Illuminate\Http\JsonResponse;

class WorkProgramEvaluationController extends Controller
{
    public function upsert(UpsertWorkProgramEvaluationRequest $request, WorkProgram $workProgram): JsonResponse
    {
        $this->authorize('evaluate', $workProgram);

        $data = $request->validated();
        $markEvaluated = (bool) ($data['mark_evaluated'] ?? false);
        unset($data['mark_evaluated']);

        if (! empty($data['report_document_id'])) {
            $this->ensureDocumentLinked($workProgram, (int) $data['report_document_id']);
        }

        $evaluation = WorkProgramEvaluation::query()->updateOrCreate(
            ['work_program_id' => $workProgram->id],
            [
                ...$data,
                'evaluated_by' => $request->user()->id,
            ]
        );

        if ($markEvaluated) {
            $this->ensureMinimumEvaluation($evaluation);
            $fromStatus = $workProgram->status;
            $workProgram->update([
                'status' => WorkProgram::STATUS_EVALUATED,
                'evaluated_at' => $evaluation->evaluated_at,
                'updated_by' => $request->user()->id,
                'lock_version' => $workProgram->lock_version + 1,
            ]);
            WorkProgramApproval::query()->create([
                'work_program_id' => $workProgram->id,
                'action' => WorkProgramApproval::ACTION_EVALUATED,
                'from_status' => $fromStatus,
                'to_status' => WorkProgram::STATUS_EVALUATED,
                'actor_id' => $request->user()->id,
                'reviewer_id' => null,
                'note' => 'Evaluasi program kerja diselesaikan.',
                'metadata' => [
                    'evaluation_id' => $evaluation->id,
                    'program_code' => $workProgram->program_code,
                    'program_name' => $workProgram->name,
                ],
                'acted_at' => now(),
            ]);
        }

        activity('work_program')
            ->causedBy($request->user())
            ->performedOn($workProgram)
            ->withProperties(['evaluation_id' => $evaluation->id, 'mark_evaluated' => $markEvaluated])
            ->log($markEvaluated ? 'work_program.evaluated' : 'work_program.evaluation.saved');

        return response()->json([
            'data' => $this->serialize($evaluation->fresh(['evaluator:id,name,email', 'reportDocument:id,title'])),
            'program_status' => $workProgram->fresh()->status,
        ]);
    }

    private function ensureDocumentLinked(WorkProgram $workProgram, int $documentId): void
    {
        abort_unless(DocumentLink::query()
            ->where('document_id', $documentId)
            ->where('linkable_type', WorkProgram::class)
            ->where('linkable_id', $workProgram->id)
            ->exists(), 422, 'Dokumen laporan tidak terhubung ke program kerja ini.');
    }

    private function ensureMinimumEvaluation(WorkProgramEvaluation $evaluation): void
    {
        $required = [
            'result_summary',
            'objective_achievement',
            'indicator_result',
            'target_vs_realization',
            'time_evaluation',
            'budget_result',
            'lessons_learned',
            'recommendations',
            'follow_up',
            'evaluated_at',
        ];

        $missing = collect($required)
            ->filter(fn (string $field) => blank($evaluation->{$field}))
            ->values();

        abort_if($missing->isNotEmpty(), 422, 'Evaluasi belum lengkap: '.$missing->implode(', ').'.');
    }

    private function serialize(WorkProgramEvaluation $evaluation): array
    {
        return [
            'id' => $evaluation->id,
            'result_summary' => $evaluation->result_summary,
            'objective_achievement' => $evaluation->objective_achievement,
            'indicator_result' => $evaluation->indicator_result,
            'target_vs_realization' => $evaluation->target_vs_realization,
            'time_evaluation' => $evaluation->time_evaluation,
            'budget_result' => $evaluation->budget_result,
            'constraints' => $evaluation->constraints,
            'supporting_factors' => $evaluation->supporting_factors,
            'inhibiting_factors' => $evaluation->inhibiting_factors,
            'lessons_learned' => $evaluation->lessons_learned,
            'recommendations' => $evaluation->recommendations,
            'follow_up' => $evaluation->follow_up,
            'report_document_id' => $evaluation->report_document_id,
            'report_document' => $evaluation->reportDocument ? [
                'id' => $evaluation->reportDocument->id,
                'title' => $evaluation->reportDocument->title,
            ] : null,
            'evaluated_at' => optional($evaluation->evaluated_at)->format('Y-m-d H:i:s'),
            'evaluator' => $evaluation->evaluator ? [
                'id' => $evaluation->evaluator->id,
                'name' => $evaluation->evaluator->name,
                'email' => $evaluation->evaluator->email,
            ] : null,
        ];
    }
}
