<?php

namespace App\Services\WorkPrograms;

use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramTaskDependency;
use Illuminate\Support\Facades\DB;

class WorkProgramTaskDependencyService
{
    public function __construct(private readonly WorkProgramDependencyValidator $validator) {}

    public function create(WorkProgram $program, array $data, User $actor): WorkProgramTaskDependency
    {
        return DB::transaction(function () use ($program, $data, $actor) {
            $this->validator->ensureNoDependencyCycle(
                $program->id,
                (int) $data['predecessor_task_id'],
                (int) $data['successor_task_id']
            );

            $dependency = WorkProgramTaskDependency::query()->create([
                'work_program_id' => $program->id,
                'predecessor_task_id' => $data['predecessor_task_id'],
                'successor_task_id' => $data['successor_task_id'],
                'type' => $data['type'],
                'lag_days' => $data['lag_days'] ?? 0,
                'created_by' => $actor->id,
            ]);

            activity('work_program')
                ->causedBy($actor)
                ->performedOn($dependency)
                ->withProperties(['attributes' => $dependency->only([
                    'work_program_id',
                    'predecessor_task_id',
                    'successor_task_id',
                    'type',
                    'lag_days',
                ])])
                ->log('work_program.dependency.created');

            return $dependency->fresh(['predecessor', 'successor']);
        });
    }

    public function delete(WorkProgramTaskDependency $dependency, User $actor): void
    {
        DB::transaction(function () use ($dependency, $actor) {
            $dependency = WorkProgramTaskDependency::query()
                ->whereKey($dependency->id)
                ->lockForUpdate()
                ->firstOrFail();

            $snapshot = $dependency->only([
                'id',
                'work_program_id',
                'predecessor_task_id',
                'successor_task_id',
                'type',
                'lag_days',
            ]);

            $dependency->delete();

            activity('work_program')
                ->causedBy($actor)
                ->performedOn($dependency)
                ->withProperties(['attributes' => $snapshot])
                ->log('work_program.dependency.deleted');
        });
    }
}
