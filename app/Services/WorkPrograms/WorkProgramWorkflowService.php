<?php

namespace App\Services\WorkPrograms;

use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramApproval;
use App\Models\WorkProgramTask;
use Illuminate\Support\Facades\DB;

class WorkProgramWorkflowService
{
    public function submit(WorkProgram $program, User $actor): WorkProgram
    {
        return $this->transition(
            $program,
            $actor,
            WorkProgram::STATUS_SUBMITTED,
            WorkProgramApproval::ACTION_SUBMITTED,
            null,
            function (WorkProgram $program) use ($actor) {
                $this->ensureSubmittable($program);

                return [
                    'submitted_at' => now(),
                    'submitted_by' => $actor->id,
                ];
            }
        );
    }

    public function withdraw(WorkProgram $program, User $actor, ?string $note = null): WorkProgram
    {
        return $this->transition(
            $program,
            $actor,
            WorkProgram::STATUS_DRAFT,
            WorkProgramApproval::ACTION_WITHDRAWN,
            $note,
            fn () => [
                'submitted_at' => null,
                'submitted_by' => null,
            ]
        );
    }

    public function startReview(WorkProgram $program, User $actor, ?string $note = null): WorkProgram
    {
        return $this->transition(
            $program,
            $actor,
            WorkProgram::STATUS_UNDER_REVIEW,
            WorkProgramApproval::ACTION_REVIEW_STARTED,
            $note,
        );
    }

    public function requestRevision(WorkProgram $program, User $actor, string $note): WorkProgram
    {
        return $this->transition(
            $program,
            $actor,
            WorkProgram::STATUS_REVISION_REQUESTED,
            WorkProgramApproval::ACTION_REVISION_REQUESTED,
            $note,
            fn (WorkProgram $program) => $program->status === WorkProgram::STATUS_COMPLETED
                ? [
                    'completed_at' => null,
                    'evaluated_at' => null,
                ]
                : [],
        );
    }

    public function approve(WorkProgram $program, User $actor, ?string $note = null): WorkProgram
    {
        return $this->transition(
            $program,
            $actor,
            WorkProgram::STATUS_APPROVED,
            WorkProgramApproval::ACTION_APPROVED,
            $note,
            fn () => [
                'approved_at' => now(),
                'approved_by' => $actor->id,
                'rejected_at' => null,
                'rejected_by' => null,
            ]
        );
    }

    public function reject(WorkProgram $program, User $actor, string $note): WorkProgram
    {
        return $this->transition(
            $program,
            $actor,
            WorkProgram::STATUS_REJECTED,
            WorkProgramApproval::ACTION_REJECTED,
            $note,
            fn () => [
                'rejected_at' => now(),
                'rejected_by' => $actor->id,
                'approved_at' => null,
                'approved_by' => null,
            ]
        );
    }

    public function schedule(WorkProgram $program, User $actor, ?string $note = null): WorkProgram
    {
        return $this->transition(
            $program,
            $actor,
            WorkProgram::STATUS_SCHEDULED,
            WorkProgramApproval::ACTION_SCHEDULED,
            $note,
            function (WorkProgram $program) {
                $this->ensureSchedulable($program);

                return [];
            }
        );
    }

    public function startExecution(WorkProgram $program, User $actor, ?string $note = null): WorkProgram
    {
        return $this->transition(
            $program,
            $actor,
            WorkProgram::STATUS_IN_PROGRESS,
            WorkProgramApproval::ACTION_STARTED,
            $note,
            fn (WorkProgram $program) => [
                'actual_start_date' => $program->actual_start_date ?: now()->toDateString(),
            ]
        );
    }

    public function hold(WorkProgram $program, User $actor, string $note): WorkProgram
    {
        return $this->transition(
            $program,
            $actor,
            WorkProgram::STATUS_ON_HOLD,
            WorkProgramApproval::ACTION_HELD,
            $note
        );
    }

    public function resume(WorkProgram $program, User $actor, ?string $note = null): WorkProgram
    {
        return $this->transition(
            $program,
            $actor,
            WorkProgram::STATUS_IN_PROGRESS,
            WorkProgramApproval::ACTION_RESUMED,
            $note
        );
    }

    public function complete(WorkProgram $program, User $actor, ?string $note = null): WorkProgram
    {
        return $this->transition(
            $program,
            $actor,
            WorkProgram::STATUS_COMPLETED,
            WorkProgramApproval::ACTION_COMPLETED,
            $note,
            function (WorkProgram $program) {
                $this->ensureCompletable($program);

                return [
                    'completed_at' => now(),
                    'actual_end_date' => $program->actual_end_date ?: now()->toDateString(),
                ];
            }
        );
    }

    public function archive(WorkProgram $program, User $actor, ?string $note = null): WorkProgram
    {
        return $this->transition(
            $program,
            $actor,
            WorkProgram::STATUS_ARCHIVED,
            WorkProgramApproval::ACTION_ARCHIVED,
            $note,
            fn () => [
                'archived_at' => now(),
            ]
        );
    }

    /**
     * @param  callable(WorkProgram):array<string, mixed>|null  $extraAttributes
     */
    private function transition(
        WorkProgram $program,
        User $actor,
        string $toStatus,
        string $action,
        ?string $note = null,
        ?callable $extraAttributes = null
    ): WorkProgram {
        return DB::transaction(function () use ($program, $actor, $toStatus, $action, $note, $extraAttributes) {
            $program = WorkProgram::query()
                ->whereKey($program->id)
                ->lockForUpdate()
                ->firstOrFail();

            $fromStatus = $program->status;

            if (! $program->canTransitionTo($toStatus)) {
                throw new \RuntimeException("Transisi status {$fromStatus} ke {$toStatus} tidak diizinkan.");
            }

            if ($this->isReviewerDecision($action) && $this->isSubmitterOrCreator($program, $actor)) {
                throw new \RuntimeException('Pembuat atau pengaju program tidak dapat mereview pengajuannya sendiri.');
            }

            $attributes = [
                'status' => $toStatus,
                'updated_by' => $actor->id,
                'lock_version' => $program->lock_version + 1,
            ];

            if ($extraAttributes) {
                $attributes = [
                    ...$attributes,
                    ...$extraAttributes($program),
                ];
            }

            $program->update($attributes);

            $approval = WorkProgramApproval::query()->create([
                'work_program_id' => $program->id,
                'action' => $action,
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'actor_id' => $actor->id,
                'reviewer_id' => $this->isReviewAction($action) ? $actor->id : null,
                'note' => $note,
                'metadata' => [
                    'program_code' => $program->program_code,
                    'program_name' => $program->name,
                ],
                'acted_at' => now(),
            ]);

            activity('work_program')
                ->causedBy($actor)
                ->performedOn($program)
                ->withProperties([
                    'approval_id' => $approval->id,
                    'action' => $action,
                    'from_status' => $fromStatus,
                    'to_status' => $toStatus,
                    'note' => $note,
                ])
                ->log("work_program.{$action}");

            if ($type = $this->notificationType($action)) {
                app(WorkProgramNotificationService::class)->notifyWorkflow($program->fresh(), $type, $actor);
            }

            return $program->fresh(['approvals']);
        });
    }

    private function ensureSubmittable(WorkProgram $program): void
    {
        $missing = [];

        foreach ([
            'name' => $program->name,
            'work_program_period_id' => $program->work_program_period_id,
            'year' => $program->year,
            'division_id' => $program->division_id,
            'planned_start_date' => $program->planned_start_date,
            'planned_end_date' => $program->planned_end_date,
            'primary_pic_user_id' => $program->primary_pic_user_id,
        ] as $field => $value) {
            if (blank($value)) {
                $missing[] = $field;
            }
        }

        if (blank($program->objectives) && blank($program->success_indicators)) {
            $missing[] = 'objectives_or_success_indicators';
        }

        if ($missing) {
            throw new \RuntimeException('Program kerja belum lengkap untuk diajukan: '.implode(', ', $missing).'.');
        }
    }

    private function ensureSchedulable(WorkProgram $program): void
    {
        $tasks = $program->tasks()->get(['id', 'planned_start_date', 'planned_end_date']);

        if ($tasks->isEmpty()) {
            throw new \RuntimeException('Program kerja belum memiliki task untuk dijadwalkan.');
        }

        $invalid = $tasks->first(fn ($task) => blank($task->planned_start_date) || blank($task->planned_end_date));

        if ($invalid) {
            throw new \RuntimeException('Semua task wajib memiliki tanggal rencana sebelum program dijadwalkan.');
        }
    }

    private function ensureCompletable(WorkProgram $program): void
    {
        $tasks = $program->tasks()->get(['id', 'parent_task_id', 'status', 'progress', 'weight']);

        if ($tasks->isEmpty()) {
            throw new \RuntimeException('Program kerja belum memiliki task untuk diselesaikan.');
        }

        $openTask = $tasks
            ->where('status', '!=', WorkProgramTask::STATUS_CANCELLED)
            ->first(fn ($task) => $task->status !== WorkProgramTask::STATUS_COMPLETED);

        if ($openTask) {
            throw new \RuntimeException('Semua task aktif harus selesai sebelum program ditandai completed.');
        }

        if ($this->progressForTasks($tasks) < 100) {
            throw new \RuntimeException('Progress program harus 100% sebelum program ditandai completed.');
        }
    }

    private function progressForTasks($tasks): int
    {
        $parentIds = $tasks
            ->pluck('parent_task_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique();

        $leafTasks = $tasks
            ->reject(fn ($task) => $parentIds->contains((int) $task->id))
            ->values();

        if ($leafTasks->isEmpty()) {
            return 0;
        }

        $totalWeight = (float) $leafTasks->sum(fn ($task) => (float) $task->weight);

        if ($totalWeight <= 0) {
            return (int) round($leafTasks->avg('progress') ?? 0);
        }

        return (int) round($leafTasks->sum(fn ($task) => (float) $task->progress * (float) $task->weight) / $totalWeight);
    }

    private function isReviewAction(string $action): bool
    {
        return in_array($action, [
            WorkProgramApproval::ACTION_REVIEW_STARTED,
            WorkProgramApproval::ACTION_REVISION_REQUESTED,
            WorkProgramApproval::ACTION_APPROVED,
            WorkProgramApproval::ACTION_REJECTED,
        ], true);
    }

    private function isReviewerDecision(string $action): bool
    {
        return in_array($action, [
            WorkProgramApproval::ACTION_REVISION_REQUESTED,
            WorkProgramApproval::ACTION_APPROVED,
            WorkProgramApproval::ACTION_REJECTED,
        ], true);
    }

    private function isSubmitterOrCreator(WorkProgram $program, User $actor): bool
    {
        return (int) $program->submitted_by === (int) $actor->id
            || (int) $program->created_by === (int) $actor->id;
    }

    private function notificationType(string $action): ?string
    {
        return match ($action) {
            WorkProgramApproval::ACTION_SUBMITTED => 'program_submitted',
            WorkProgramApproval::ACTION_REVIEW_STARTED => 'program_review_started',
            WorkProgramApproval::ACTION_REVISION_REQUESTED => 'program_revision_requested',
            WorkProgramApproval::ACTION_APPROVED => 'program_approved',
            WorkProgramApproval::ACTION_REJECTED => 'program_rejected',
            WorkProgramApproval::ACTION_COMPLETED => 'program_completed',
            default => null,
        };
    }
}
