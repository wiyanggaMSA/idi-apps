<?php

namespace App\Http\Controllers\WorkPrograms;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkPrograms\WorkProgramNoteRequest;
use App\Http\Requests\WorkPrograms\WorkProgramRequiredNoteRequest;
use App\Models\WorkProgram;
use App\Services\WorkPrograms\WorkProgramWorkflowService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class WorkProgramWorkflowController extends Controller
{
    public function submit(Request $request, WorkProgram $workProgram, WorkProgramWorkflowService $service): RedirectResponse
    {
        $this->authorize('submit', $workProgram);

        return $this->runWorkflow(
            fn () => $service->submit($workProgram, $request->user()),
            'Program kerja berhasil diajukan.'
        );
    }

    public function withdraw(WorkProgramNoteRequest $request, WorkProgram $workProgram, WorkProgramWorkflowService $service): RedirectResponse
    {
        $this->authorize('withdraw', $workProgram);

        return $this->runWorkflow(
            fn () => $service->withdraw($workProgram, $request->user(), $request->validated('note')),
            'Pengajuan program kerja berhasil ditarik.'
        );
    }

    public function startReview(WorkProgramNoteRequest $request, WorkProgram $workProgram, WorkProgramWorkflowService $service): RedirectResponse
    {
        $this->authorize('review', $workProgram);

        return $this->runWorkflow(
            fn () => $service->startReview($workProgram, $request->user(), $request->validated('note')),
            'Review program kerja dimulai.'
        );
    }

    public function requestRevision(WorkProgramRequiredNoteRequest $request, WorkProgram $workProgram, WorkProgramWorkflowService $service): RedirectResponse
    {
        $this->authorize('requestRevision', $workProgram);

        return $this->runWorkflow(
            fn () => $service->requestRevision($workProgram, $request->user(), $request->validated('note')),
            'Revisi program kerja berhasil diminta.'
        );
    }

    public function approve(WorkProgramNoteRequest $request, WorkProgram $workProgram, WorkProgramWorkflowService $service): RedirectResponse
    {
        $this->authorize('approve', $workProgram);

        return $this->runWorkflow(
            fn () => $service->approve($workProgram, $request->user(), $request->validated('note')),
            'Program kerja berhasil disetujui.'
        );
    }

    public function reject(WorkProgramRequiredNoteRequest $request, WorkProgram $workProgram, WorkProgramWorkflowService $service): RedirectResponse
    {
        $this->authorize('reject', $workProgram);

        return $this->runWorkflow(
            fn () => $service->reject($workProgram, $request->user(), $request->validated('note')),
            'Program kerja berhasil ditolak.'
        );
    }

    public function schedule(WorkProgramNoteRequest $request, WorkProgram $workProgram, WorkProgramWorkflowService $service): RedirectResponse
    {
        $this->authorize('schedule', $workProgram);

        return $this->runWorkflow(
            fn () => $service->schedule($workProgram, $request->user(), $request->validated('note')),
            'Program kerja berhasil dijadwalkan.'
        );
    }

    public function startExecution(WorkProgramNoteRequest $request, WorkProgram $workProgram, WorkProgramWorkflowService $service): RedirectResponse
    {
        $this->authorize('startExecution', $workProgram);

        return $this->runWorkflow(
            fn () => $service->startExecution($workProgram, $request->user(), $request->validated('note')),
            'Pelaksanaan program kerja dimulai.'
        );
    }

    public function hold(WorkProgramRequiredNoteRequest $request, WorkProgram $workProgram, WorkProgramWorkflowService $service): RedirectResponse
    {
        $this->authorize('hold', $workProgram);

        return $this->runWorkflow(
            fn () => $service->hold($workProgram, $request->user(), $request->validated('note')),
            'Program kerja berhasil ditahan.'
        );
    }

    public function resume(WorkProgramNoteRequest $request, WorkProgram $workProgram, WorkProgramWorkflowService $service): RedirectResponse
    {
        $this->authorize('resume', $workProgram);

        return $this->runWorkflow(
            fn () => $service->resume($workProgram, $request->user(), $request->validated('note')),
            'Program kerja berhasil dilanjutkan.'
        );
    }

    public function complete(WorkProgramNoteRequest $request, WorkProgram $workProgram, WorkProgramWorkflowService $service): RedirectResponse
    {
        $this->authorize('complete', $workProgram);

        return $this->runWorkflow(
            fn () => $service->complete($workProgram, $request->user(), $request->validated('note')),
            'Program kerja berhasil ditandai selesai.'
        );
    }

    public function archive(WorkProgramNoteRequest $request, WorkProgram $workProgram, WorkProgramWorkflowService $service): RedirectResponse
    {
        $this->authorize('archive', $workProgram);

        return $this->runWorkflow(
            fn () => $service->archive($workProgram, $request->user(), $request->validated('note')),
            'Program kerja berhasil diarsipkan.'
        );
    }

    /**
     * @param  callable():mixed  $callback
     */
    private function runWorkflow(callable $callback, string $successMessage): RedirectResponse
    {
        try {
            $callback();
        } catch (\RuntimeException $exception) {
            return back()->withErrors(['workflow' => $exception->getMessage()]);
        }

        return back()->with('success', $successMessage);
    }
}
