<?php

namespace App\Services\WorkPrograms;

use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramNotification;
use App\Models\WorkProgramTask;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class WorkProgramNotificationService
{
    public function notifyWorkflow(WorkProgram $program, string $type, ?User $actor = null): void
    {
        $program->loadMissing(['primaryPic:id,name', 'creator:id,name', 'tasks.pic:id,name']);

        $recipients = match ($type) {
            'program_submitted' => $this->usersWithAnyPermission(['work_program.review', 'work_program.approve']),
            'program_review_started',
            'program_revision_requested',
            'program_approved',
            'program_rejected' => $this->programActors($program),
            'program_completed' => $this->programActors($program),
            'evaluation_required' => $this->usersWithAnyPermission(['work_program.evaluate'])->merge($this->programActors($program)),
            default => $this->programActors($program),
        };

        $copy = $this->workflowCopy($program, $type);
        $this->notifyMany($recipients, $program, null, $type, $copy['title'], $copy['message'], [
            'actor_id' => $actor?->id,
            'status' => $program->status,
        ]);
    }

    public function notifyTaskAssigned(WorkProgramTask $task, User $actor): void
    {
        $task->loadMissing(['program', 'pic:id,name', 'assignees.user:id,name']);
        $users = collect([$task->pic])
            ->merge($task->assignees->pluck('user'))
            ->filter()
            ->unique('id')
            ->reject(fn (User $user) => (int) $user->id === (int) $actor->id)
            ->values();

        $this->notifyMany(
            $users,
            $task->program,
            $task,
            'task_assigned',
            'Task program kerja ditugaskan',
            "Anda ditugaskan pada task {$task->name}.",
            ['actor_id' => $actor->id]
        );
    }

    public function refreshOperationalAlerts(WorkProgram $program): void
    {
        $program->loadMissing(['primaryPic:id,name', 'tasks.pic:id,name', 'tasks.assignees.user:id,name', 'evaluation']);
        $today = CarbonImmutable::today();

        foreach ($program->tasks as $task) {
            $recipients = collect([$task->pic])
                ->merge($task->assignees->pluck('user'))
                ->merge($this->programActors($program))
                ->filter()
                ->unique('id')
                ->values();

            if ($task->planned_end_date && $task->planned_end_date->betweenIncluded($today, $today->addDays(7)) && ! in_array($task->status, [WorkProgramTask::STATUS_COMPLETED, WorkProgramTask::STATUS_CANCELLED], true)) {
                $this->notifyMany($recipients, $program, $task, 'task_deadline_soon', 'Deadline task mendekat', "Task {$task->name} mendekati deadline.", [
                    'planned_end_date' => optional($task->planned_end_date)->format('Y-m-d'),
                ]);
            }

            if ($task->planned_end_date && $task->planned_end_date->lt($today) && ! in_array($task->status, [WorkProgramTask::STATUS_COMPLETED, WorkProgramTask::STATUS_CANCELLED], true)) {
                $this->notifyMany($recipients, $program, $task, 'task_overdue', 'Task overdue', "Task {$task->name} sudah melewati deadline.", [
                    'planned_end_date' => optional($task->planned_end_date)->format('Y-m-d'),
                ]);
            }

            if ($task->updated_at && $task->updated_at->lt(now()->subDays(14)) && ! in_array($task->status, [WorkProgramTask::STATUS_COMPLETED, WorkProgramTask::STATUS_CANCELLED], true)) {
                $this->notifyMany($recipients, $program, $task, 'progress_stale', 'Progress belum diperbarui', "Task {$task->name} belum diperbarui lebih dari 14 hari.", [
                    'last_update' => optional($task->updated_at)->format('Y-m-d H:i:s'),
                ]);
            }
        }

        if ($program->status === WorkProgram::STATUS_COMPLETED && ! $program->evaluation) {
            $this->notifyWorkflow($program, 'evaluation_required');
        }
    }

    /**
     * @param  Collection<int, User|null>  $recipients
     */
    private function notifyMany(Collection $recipients, WorkProgram $program, ?WorkProgramTask $task, string $type, string $title, string $message, array $payload = []): void
    {
        $recipients
            ->filter()
            ->unique('id')
            ->each(function (User $recipient) use ($program, $task, $type, $title, $message, $payload) {
                WorkProgramNotification::query()->updateOrCreate(
                    ['dedupe_key' => $this->dedupeKey($recipient, $program, $task, $type)],
                    [
                        'work_program_id' => $program->id,
                        'work_program_task_id' => $task?->id,
                        'recipient_user_id' => $recipient->id,
                        'type' => $type,
                        'title' => $title,
                        'message' => $message,
                        'payload' => $payload,
                    ]
                );
            });
    }

    private function dedupeKey(User $recipient, WorkProgram $program, ?WorkProgramTask $task, string $type): string
    {
        return implode(':', [
            $type,
            $program->id,
            $task?->id ?: 'program',
            $recipient->id,
        ]);
    }

    private function programActors(WorkProgram $program): Collection
    {
        return collect([
            $program->primaryPic,
            $program->creator,
        ])->filter()->unique('id')->values();
    }

    private function usersWithAnyPermission(array $permissions): Collection
    {
        return User::query()
            ->where('is_active', true)
            ->get()
            ->filter(fn (User $user) => collect($permissions)->contains(fn (string $permission) => $user->can($permission)))
            ->values();
    }

    private function workflowCopy(WorkProgram $program, string $type): array
    {
        return match ($type) {
            'program_submitted' => [
                'title' => 'Program kerja diajukan',
                'message' => "Program {$program->name} menunggu review.",
            ],
            'program_review_started' => [
                'title' => 'Program kerja masuk review',
                'message' => "Program {$program->name} sedang direview.",
            ],
            'program_revision_requested' => [
                'title' => 'Revisi program kerja diminta',
                'message' => "Program {$program->name} perlu direvisi.",
            ],
            'program_approved' => [
                'title' => 'Program kerja approved',
                'message' => "Program {$program->name} telah disetujui.",
            ],
            'program_rejected' => [
                'title' => 'Program kerja rejected',
                'message' => "Program {$program->name} ditolak.",
            ],
            'program_completed' => [
                'title' => 'Program kerja completed',
                'message' => "Program {$program->name} sudah selesai.",
            ],
            'evaluation_required' => [
                'title' => 'Evaluasi program diperlukan',
                'message' => "Program {$program->name} sudah selesai dan perlu evaluasi.",
            ],
            default => [
                'title' => 'Update program kerja',
                'message' => "Ada update pada program {$program->name}.",
            ],
        };
    }
}
