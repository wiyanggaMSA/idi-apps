<?php

namespace App\Services\WorkPrograms;

use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramProgressUpdate;
use App\Models\WorkProgramTask;
use App\Models\WorkProgramTaskAssignee;
use Illuminate\Support\Facades\DB;

class WorkProgramTaskService
{
    public function __construct(private readonly WorkProgramDependencyValidator $validator) {}

    public function create(WorkProgram $program, array $data, User $actor): WorkProgramTask
    {
        return DB::transaction(function () use ($program, $data, $actor) {
            $assigneeIds = $data['assignee_user_ids'] ?? [];
            unset($data['assignee_user_ids']);

            $data = $this->normalizeDefaults($data);
            $data['work_program_id'] = $program->id;
            $data['created_by'] = $actor->id;
            $data['updated_by'] = $actor->id;

            $task = new WorkProgramTask($data);
            $this->validator->ensureNoHierarchyCycle($task, $data['parent_task_id'] ?? null);
            $task->save();

            $this->syncAssignees($task, $assigneeIds);
            $this->log($actor, $task, 'work_program.task.created');

            $freshTask = $task->fresh(['program', 'assignees.user', 'pic']);
            app(WorkProgramNotificationService::class)->notifyTaskAssigned($freshTask, $actor);

            return $freshTask;
        });
    }

    public function update(WorkProgramTask $task, array $data, User $actor): WorkProgramTask
    {
        return DB::transaction(function () use ($task, $data, $actor) {
            $task = WorkProgramTask::query()
                ->whereKey($task->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (array_key_exists('lock_version', $data) && (int) $data['lock_version'] !== (int) $task->lock_version) {
                throw new \RuntimeException('Task sudah berubah. Muat ulang data sebelum menyimpan.');
            }

            $assigneeIds = $data['assignee_user_ids'] ?? null;
            unset($data['assignee_user_ids'], $data['lock_version']);

            $data = $this->normalizeDefaults($data, false);
            $data['updated_by'] = $actor->id;
            $data['lock_version'] = $task->lock_version + 1;

            $candidate = $task->replicate();
            $candidate->exists = true;
            $candidate->id = $task->id;
            $candidate->fill($data);
            $this->validator->ensureNoHierarchyCycle($candidate, $candidate->parent_task_id);

            $before = $this->snapshot($task);
            $task->update($data);

            if (is_array($assigneeIds)) {
                $this->syncAssignees($task, $assigneeIds);
            }

            $this->log($actor, $task, 'work_program.task.updated', [
                'before' => $before,
                'after' => $this->snapshot($task->fresh()),
            ]);

            $freshTask = $task->fresh(['assignees.user', 'pic']);
            $this->recordProgressUpdate($freshTask, $before, $actor, $data['notes'] ?? null);

            if (array_key_exists('pic_user_id', $data) || is_array($assigneeIds)) {
                app(WorkProgramNotificationService::class)->notifyTaskAssigned($freshTask->load('program'), $actor);
            }

            return $freshTask;
        });
    }

    public function delete(WorkProgramTask $task, User $actor): void
    {
        DB::transaction(function () use ($task, $actor) {
            $task = WorkProgramTask::query()
                ->whereKey($task->id)
                ->lockForUpdate()
                ->firstOrFail();

            $snapshot = $this->snapshot($task);
            $task->delete();

            $this->log($actor, $task, 'work_program.task.deleted', ['attributes' => $snapshot]);
        });
    }

    public function bulkSchedule(WorkProgram $program, array $items, User $actor): array
    {
        return DB::transaction(function () use ($program, $items, $actor) {
            $updated = [];

            foreach ($items as $item) {
                $task = WorkProgramTask::query()
                    ->where('work_program_id', $program->id)
                    ->whereKey($item['id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                if (isset($item['lock_version']) && (int) $item['lock_version'] !== (int) $task->lock_version) {
                    throw new \RuntimeException("Task {$task->id} sudah berubah. Muat ulang data sebelum menyimpan.");
                }

                $data = array_intersect_key($item, array_flip([
                    'parent_task_id',
                    'sort_order',
                    'planned_start_date',
                    'planned_end_date',
                ]));

                $data['lock_version'] = $task->lock_version + 1;
                $data['updated_by'] = $actor->id;

                $candidate = $task->replicate();
                $candidate->exists = true;
                $candidate->id = $task->id;
                $candidate->fill($data);
                $this->validator->ensureNoHierarchyCycle($candidate, $candidate->parent_task_id);

                $task->update($data);
                $updated[] = $task->fresh();
            }

            activity('work_program')
                ->causedBy($actor)
                ->performedOn($program)
                ->withProperties(['task_ids' => collect($updated)->pluck('id')->values()])
                ->log('work_program.task.bulk_schedule_updated');

            return $updated;
        });
    }

    private function syncAssignees(WorkProgramTask $task, array $userIds): void
    {
        $userIds = collect($userIds)->filter()->unique()->values();

        WorkProgramTaskAssignee::query()
            ->where('work_program_task_id', $task->id)
            ->whereNotIn('user_id', $userIds)
            ->delete();

        foreach ($userIds as $userId) {
            WorkProgramTaskAssignee::query()->firstOrCreate([
                'work_program_task_id' => $task->id,
                'user_id' => $userId,
            ]);
        }
    }

    private function normalizeDefaults(array $data, bool $forCreate = true): array
    {
        foreach (['progress', 'weight', 'estimated_cost', 'realized_cost', 'sort_order'] as $field) {
            if ($forCreate && ! array_key_exists($field, $data)) {
                $data[$field] = 0;
            }
        }

        $data['status'] ??= $forCreate ? WorkProgramTask::STATUS_TODO : null;
        $data['priority'] ??= $forCreate ? 'medium' : null;
        $data['is_milestone'] ??= $forCreate ? false : null;

        if (! $forCreate) {
            foreach (['status', 'priority', 'is_milestone'] as $field) {
                if (array_key_exists($field, $data) && $data[$field] === null) {
                    unset($data[$field]);
                }
            }
        }

        return $data;
    }

    private function snapshot(WorkProgramTask $task): array
    {
        return [
            'id' => $task->id,
            'work_program_id' => $task->work_program_id,
            'parent_task_id' => $task->parent_task_id,
            'task_code' => $task->task_code,
            'name' => $task->name,
            'status' => $task->status,
            'progress' => $task->progress,
            'planned_start_date' => optional($task->planned_start_date)->format('Y-m-d'),
            'planned_end_date' => optional($task->planned_end_date)->format('Y-m-d'),
            'lock_version' => $task->lock_version,
        ];
    }

    private function recordProgressUpdate(WorkProgramTask $task, array $before, User $actor, ?string $notes = null): void
    {
        $changed = ((int) $before['progress'] !== (int) $task->progress)
            || $before['status'] !== $task->status
            || $before['planned_start_date'] !== optional($task->planned_start_date)->format('Y-m-d')
            || $before['planned_end_date'] !== optional($task->planned_end_date)->format('Y-m-d');

        if (! $changed && blank($notes)) {
            return;
        }

        WorkProgramProgressUpdate::query()->create([
            'work_program_id' => $task->work_program_id,
            'work_program_task_id' => $task->id,
            'progress_before' => (int) $before['progress'],
            'progress_after' => (int) $task->progress,
            'status_before' => $before['status'],
            'status_after' => $task->status,
            'planned_start_date' => $task->planned_start_date,
            'planned_end_date' => $task->planned_end_date,
            'actual_start_date' => $task->actual_start_date,
            'actual_end_date' => $task->actual_end_date,
            'notes' => $notes,
            'updated_by' => $actor->id,
            'updated_at_snapshot' => now(),
        ]);
    }

    private function log(User $actor, WorkProgramTask $task, string $event, array $properties = []): void
    {
        activity('work_program')
            ->causedBy($actor)
            ->performedOn($task)
            ->withProperties($properties ?: ['attributes' => $this->snapshot($task)])
            ->log($event);
    }
}
