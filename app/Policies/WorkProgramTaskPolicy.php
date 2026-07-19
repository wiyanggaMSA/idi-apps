<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramTask;

class WorkProgramTaskPolicy
{
    public function view(User $user, WorkProgramTask $task): bool
    {
        return app(WorkProgramPolicy::class)->view($user, $task->program);
    }

    public function create(User $user, WorkProgram $program): bool
    {
        return app(WorkProgramPolicy::class)->manageTasks($user, $program);
    }

    public function update(User $user, WorkProgramTask $task): bool
    {
        return app(WorkProgramPolicy::class)->manageTasks($user, $task->program);
    }

    public function delete(User $user, WorkProgramTask $task): bool
    {
        return app(WorkProgramPolicy::class)->manageTasks($user, $task->program);
    }

    public function updateProgress(User $user, WorkProgramTask $task): bool
    {
        if (! in_array($task->program->status, [
            WorkProgram::STATUS_SCHEDULED,
            WorkProgram::STATUS_IN_PROGRESS,
        ], true)) {
            return false;
        }

        return ($user->can('work_program.update_progress') && app(WorkProgramPolicy::class)->updateProgress($user, $task->program))
            || (int) $task->pic_user_id === (int) $user->id
            || $task->assignees()->where('user_id', $user->id)->exists();
    }

    public function manageDependency(User $user, WorkProgram $program): bool
    {
        return app(WorkProgramPolicy::class)->manageTasks($user, $program);
    }

    public function uploadDocument(User $user, WorkProgramTask $task): bool
    {
        return $user->can('work_program.upload_document')
            && $this->view($user, $task);
    }
}
