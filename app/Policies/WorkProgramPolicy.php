<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorkProgram;

class WorkProgramPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('work_program.view')
            || $user->can('work_program.view_own_field')
            || $user->can('work_program.review')
            || $user->can('work_program.update_progress');
    }

    public function view(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.view')
            || $this->hasFieldScope($user, $program)
            || $this->hasAssignmentScope($user, $program);
    }

    public function create(User $user): bool
    {
        return $user->can('work_program.create');
    }

    public function update(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.update')
            && in_array($program->status, [
                WorkProgram::STATUS_DRAFT,
                WorkProgram::STATUS_REVISION_REQUESTED,
            ], true)
            && $this->canActOnProgram($user, $program);
    }

    public function delete(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.delete')
            && $program->status === WorkProgram::STATUS_DRAFT
            && $user->can('work_program.view');
    }

    public function submit(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.submit')
            && in_array($program->status, [
                WorkProgram::STATUS_DRAFT,
                WorkProgram::STATUS_REVISION_REQUESTED,
            ], true)
            && $this->canActOnProgram($user, $program);
    }

    public function withdraw(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.withdraw')
            && $program->status === WorkProgram::STATUS_SUBMITTED
            && ((int) $program->submitted_by === (int) $user->id || $this->canActOnProgram($user, $program));
    }

    public function review(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.review')
            && $program->status === WorkProgram::STATUS_SUBMITTED
            && (int) $program->submitted_by !== (int) $user->id;
    }

    public function approve(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.approve')
            && $program->status === WorkProgram::STATUS_UNDER_REVIEW
            && ! $this->isSubmitterOrCreator($user, $program);
    }

    public function reject(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.reject')
            && $program->status === WorkProgram::STATUS_UNDER_REVIEW
            && ! $this->isSubmitterOrCreator($user, $program);
    }

    public function requestRevision(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.request_revision')
            && in_array($program->status, [
                WorkProgram::STATUS_UNDER_REVIEW,
                WorkProgram::STATUS_COMPLETED,
            ], true)
            && ! $this->isSubmitterOrCreator($user, $program);
    }

    public function schedule(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.manage_tasks')
            && $program->status === WorkProgram::STATUS_APPROVED
            && $this->canActOnProgram($user, $program);
    }

    public function startExecution(User $user, WorkProgram $program): bool
    {
        return ($user->can('work_program.update_progress') || $user->can('work_program.manage_tasks'))
            && $program->status === WorkProgram::STATUS_SCHEDULED
            && $this->canActOnProgram($user, $program);
    }

    public function hold(User $user, WorkProgram $program): bool
    {
        return ($user->can('work_program.update_progress') || $user->can('work_program.manage_tasks'))
            && $program->status === WorkProgram::STATUS_IN_PROGRESS
            && $this->canActOnProgram($user, $program);
    }

    public function resume(User $user, WorkProgram $program): bool
    {
        return ($user->can('work_program.update_progress') || $user->can('work_program.manage_tasks'))
            && $program->status === WorkProgram::STATUS_ON_HOLD
            && $this->canActOnProgram($user, $program);
    }

    public function complete(User $user, WorkProgram $program): bool
    {
        return ($user->can('work_program.update_progress') || $user->can('work_program.manage_tasks'))
            && $program->status === WorkProgram::STATUS_IN_PROGRESS
            && $this->canActOnProgram($user, $program);
    }

    public function manageTasks(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.manage_tasks')
            && ! in_array($program->status, [
                WorkProgram::STATUS_ARCHIVED,
                WorkProgram::STATUS_CANCELLED,
                WorkProgram::STATUS_REJECTED,
                WorkProgram::STATUS_COMPLETED,
                WorkProgram::STATUS_EVALUATED,
            ], true)
            && $this->canActOnProgram($user, $program);
    }

    public function updateProgress(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.update_progress')
            && in_array($program->status, [
                WorkProgram::STATUS_SCHEDULED,
                WorkProgram::STATUS_IN_PROGRESS,
            ], true)
            && $this->canActOnProgram($user, $program);
    }

    public function manageBudget(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.manage_budget')
            && ! in_array($program->status, [
                WorkProgram::STATUS_COMPLETED,
                WorkProgram::STATUS_EVALUATED,
                WorkProgram::STATUS_ARCHIVED,
                WorkProgram::STATUS_CANCELLED,
                WorkProgram::STATUS_REJECTED,
            ], true)
            && $this->canActOnProgram($user, $program);
    }

    public function uploadDocument(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.upload_document')
            && ! in_array($program->status, [
                WorkProgram::STATUS_COMPLETED,
                WorkProgram::STATUS_EVALUATED,
                WorkProgram::STATUS_ARCHIVED,
                WorkProgram::STATUS_CANCELLED,
                WorkProgram::STATUS_REJECTED,
            ], true)
            && $this->view($user, $program);
    }

    public function evaluate(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.evaluate')
            && $program->status === WorkProgram::STATUS_COMPLETED
            && $this->canActOnProgram($user, $program);
    }

    public function archive(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.archive')
            && $program->status === WorkProgram::STATUS_EVALUATED
            && $user->can('work_program.view');
    }

    public function export(User $user): bool
    {
        return $user->can('work_program.export');
    }

    public function viewAuditLog(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.view_audit_log')
            && $this->view($user, $program);
    }

    private function canActOnProgram(User $user, WorkProgram $program): bool
    {
        return $user->can('work_program.view')
            || $this->hasFieldScope($user, $program)
            || $this->hasAssignmentScope($user, $program);
    }

    private function hasFieldScope(User $user, WorkProgram $program): bool
    {
        $divisionId = $user->member?->division_id;

        if (! $divisionId || ! $user->can('work_program.view_own_field')) {
            return false;
        }

        return (int) $program->division_id === (int) $divisionId
            || $program->collaboratorDivisions()
                ->where('division_id', $divisionId)
                ->exists();
    }

    private function hasAssignmentScope(User $user, WorkProgram $program): bool
    {
        return (int) $program->primary_pic_user_id === (int) $user->id
            || $program->assignments()->where('user_id', $user->id)->exists()
            || $program->tasks()
                ->where(function ($query) use ($user) {
                    $query->where('pic_user_id', $user->id)
                        ->orWhereHas('assignees', fn ($assignee) => $assignee->where('user_id', $user->id));
                })
                ->exists();
    }

    private function isSubmitterOrCreator(User $user, WorkProgram $program): bool
    {
        return (int) $program->submitted_by === (int) $user->id
            || (int) $program->created_by === (int) $user->id;
    }
}
