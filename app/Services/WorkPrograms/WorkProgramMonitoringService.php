<?php

namespace App\Services\WorkPrograms;

use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramProgressUpdate;
use App\Models\WorkProgramRisk;
use App\Models\WorkProgramTask;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class WorkProgramMonitoringService
{
    public function dataset(WorkProgram $program, ?User $user = null): array
    {
        app(WorkProgramNotificationService::class)->refreshOperationalAlerts($program);

        $program->loadMissing([
            'tasks.pic:id,name,email',
            'tasks.assignees.user:id,name,email',
            'risks.owner:id,name,email',
            'risks.task:id,task_code,name',
            'progressUpdates.task:id,task_code,name',
            'progressUpdates.updater:id,name,email',
        ]);

        $tasks = $program->tasks;
        $leafTasks = $this->leafTasks($tasks);
        $today = CarbonImmutable::today();
        $approachingDeadline = $today->addDays(7);

        return [
            'program' => [
                'id' => $program->id,
                'name' => $program->name,
                'program_code' => $program->program_code,
                'status' => $program->status,
                'location' => $program->location,
            ],
            'progress' => [
                'value' => $this->calculateProgress($tasks),
                'formula' => $this->formula($leafTasks),
                'leaf_task_count' => $leafTasks->count(),
                'total_task_count' => $tasks->count(),
                'weighted_task_count' => $leafTasks->filter(fn (WorkProgramTask $task) => (float) $task->weight > 0)->count(),
            ],
            'summary' => [
                'blocked_tasks' => $tasks->where('status', WorkProgramTask::STATUS_BLOCKED)->count(),
                'overdue_tasks' => $this->overdueTasks($tasks, $today)->count(),
                'approaching_deadline_tasks' => $tasks
                    ->filter(fn (WorkProgramTask $task) => $task->planned_end_date
                        && $task->planned_end_date->betweenIncluded($today, $approachingDeadline)
                        && ! in_array($task->status, [WorkProgramTask::STATUS_COMPLETED, WorkProgramTask::STATUS_CANCELLED], true))
                    ->count(),
                'open_risks' => $program->risks
                    ->whereIn('status', ['open', 'mitigating'])
                    ->count(),
                'extreme_risks' => $program->risks
                    ->where('level', WorkProgramRisk::LEVEL_EXTREME)
                    ->whereIn('status', ['open', 'mitigating'])
                    ->count(),
            ],
            'tasks' => $tasks->map(fn (WorkProgramTask $task) => $this->serializeTask($task, $today, $user))->values(),
            'blocked_tasks' => $tasks
                ->where('status', WorkProgramTask::STATUS_BLOCKED)
                ->map(fn (WorkProgramTask $task) => $this->serializeTask($task, $today, $user))
                ->values(),
            'overdue_tasks' => $this->overdueTasks($tasks, $today)
                ->map(fn (WorkProgramTask $task) => $this->serializeTask($task, $today, $user))
                ->values(),
            'approaching_deadline_tasks' => $tasks
                ->filter(fn (WorkProgramTask $task) => $task->planned_end_date
                    && $task->planned_end_date->betweenIncluded($today, $approachingDeadline)
                    && ! in_array($task->status, [WorkProgramTask::STATUS_COMPLETED, WorkProgramTask::STATUS_CANCELLED], true))
                ->map(fn (WorkProgramTask $task) => $this->serializeTask($task, $today, $user))
                ->values(),
            'risks' => $program->risks
                ->sortByDesc(fn (WorkProgramRisk $risk) => $this->levelWeight($risk->level))
                ->map(fn (WorkProgramRisk $risk) => $this->serializeRisk($risk))
                ->values(),
            'progress_history' => $program->progressUpdates
                ->sortByDesc('updated_at_snapshot')
                ->take(20)
                ->map(fn (WorkProgramProgressUpdate $update) => [
                    'id' => $update->id,
                    'progress_before' => $update->progress_before,
                    'progress_after' => $update->progress_after,
                    'status_before' => $update->status_before,
                    'status_after' => $update->status_after,
                    'notes' => $update->notes,
                    'updated_at' => optional($update->updated_at_snapshot)->format('Y-m-d H:i:s'),
                    'task' => $update->task ? [
                        'id' => $update->task->id,
                        'task_code' => $update->task->task_code,
                        'name' => $update->task->name,
                    ] : null,
                    'updater' => $update->updater ? [
                        'id' => $update->updater->id,
                        'name' => $update->updater->name,
                        'email' => $update->updater->email,
                    ] : null,
                ])
                ->values(),
            'latest_update' => optional($program->progressUpdates->sortByDesc('updated_at_snapshot')->first())->updated_at_snapshot?->format('Y-m-d H:i:s'),
        ];
    }

    public function calculateProgress(Collection $tasks): int
    {
        $leafTasks = $this->leafTasks($tasks);

        if ($leafTasks->isEmpty()) {
            return 0;
        }

        $totalWeight = (float) $leafTasks->sum(fn (WorkProgramTask $task) => (float) $task->weight);

        if ($totalWeight > 0) {
            return (int) round(
                $leafTasks->sum(fn (WorkProgramTask $task) => (float) $task->weight * (int) $task->progress) / $totalWeight
            );
        }

        return (int) round($leafTasks->avg('progress') ?? 0);
    }

    public function riskLevel(int $likelihood, int $impact): string
    {
        $score = $likelihood * $impact;

        return match (true) {
            $score >= 20 => WorkProgramRisk::LEVEL_EXTREME,
            $score >= 12 => WorkProgramRisk::LEVEL_HIGH,
            $score >= 6 => WorkProgramRisk::LEVEL_MEDIUM,
            default => WorkProgramRisk::LEVEL_LOW,
        };
    }

    private function leafTasks(Collection $tasks): Collection
    {
        $parentIds = $tasks
            ->pluck('parent_task_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique();

        return $tasks
            ->reject(fn (WorkProgramTask $task) => $parentIds->contains((int) $task->id))
            ->values();
    }

    private function formula(Collection $leafTasks): string
    {
        $totalWeight = (float) $leafTasks->sum(fn (WorkProgramTask $task) => (float) $task->weight);

        if ($totalWeight > 0) {
            return 'weighted_leaf_tasks';
        }

        return 'average_leaf_tasks';
    }

    private function overdueTasks(Collection $tasks, CarbonImmutable $today): Collection
    {
        return $tasks
            ->filter(fn (WorkProgramTask $task) => $task->planned_end_date
                && $task->planned_end_date->lt($today)
                && ! in_array($task->status, [WorkProgramTask::STATUS_COMPLETED, WorkProgramTask::STATUS_CANCELLED], true))
            ->values();
    }

    private function serializeTask(WorkProgramTask $task, CarbonImmutable $today, ?User $user = null): array
    {
        $scheduleDeviationDays = null;

        if ($task->actual_end_date && $task->planned_end_date) {
            $scheduleDeviationDays = $task->actual_end_date->diffInDays($task->planned_end_date, false) * -1;
        } elseif ($task->planned_end_date && ! in_array($task->status, [WorkProgramTask::STATUS_COMPLETED, WorkProgramTask::STATUS_CANCELLED], true)) {
            $scheduleDeviationDays = $task->planned_end_date->lt($today)
                ? $task->planned_end_date->diffInDays($today)
                : 0;
        }

        return [
            'id' => $task->id,
            'task_code' => $task->task_code,
            'name' => $task->name,
            'status' => $task->status,
            'priority' => $task->priority,
            'progress' => $task->progress,
            'weight' => $task->weight,
            'planned_start_date' => optional($task->planned_start_date)->format('Y-m-d'),
            'planned_end_date' => optional($task->planned_end_date)->format('Y-m-d'),
            'actual_start_date' => optional($task->actual_start_date)->format('Y-m-d'),
            'actual_end_date' => optional($task->actual_end_date)->format('Y-m-d'),
            'lock_version' => $task->lock_version,
            'can_update_progress' => $user?->can('updateProgress', $task) ?? false,
            'is_overdue' => $task->planned_end_date
                && $task->planned_end_date->lt($today)
                && ! in_array($task->status, [WorkProgramTask::STATUS_COMPLETED, WorkProgramTask::STATUS_CANCELLED], true),
            'schedule_deviation_days' => $scheduleDeviationDays,
            'pic' => $task->pic ? [
                'id' => $task->pic->id,
                'name' => $task->pic->name,
                'email' => $task->pic->email,
            ] : null,
            'assignees' => $task->assignees->map(fn ($assignee) => [
                'id' => $assignee->user?->id,
                'name' => $assignee->user?->name,
                'email' => $assignee->user?->email,
            ])->filter(fn ($assignee) => $assignee['id'] !== null)->values(),
        ];
    }

    private function serializeRisk(WorkProgramRisk $risk): array
    {
        return [
            'id' => $risk->id,
            'type' => $risk->type,
            'title' => $risk->title,
            'description' => $risk->description,
            'category' => $risk->category,
            'likelihood' => $risk->likelihood,
            'impact' => $risk->impact,
            'level' => $risk->level,
            'severity' => $risk->severity,
            'status' => $risk->status,
            'mitigation_plan' => $risk->mitigation_plan,
            'follow_up' => $risk->follow_up,
            'evidence_note' => $risk->evidence_note,
            'due_date' => optional($risk->due_date)->format('Y-m-d'),
            'resolved_at' => optional($risk->resolved_at)->format('Y-m-d H:i:s'),
            'task' => $risk->task ? [
                'id' => $risk->task->id,
                'task_code' => $risk->task->task_code,
                'name' => $risk->task->name,
            ] : null,
            'owner' => $risk->owner ? [
                'id' => $risk->owner->id,
                'name' => $risk->owner->name,
                'email' => $risk->owner->email,
            ] : null,
        ];
    }

    private function levelWeight(?string $level): int
    {
        return match ($level) {
            WorkProgramRisk::LEVEL_EXTREME => 4,
            WorkProgramRisk::LEVEL_HIGH => 3,
            WorkProgramRisk::LEVEL_MEDIUM => 2,
            WorkProgramRisk::LEVEL_LOW => 1,
            default => 0,
        };
    }
}
