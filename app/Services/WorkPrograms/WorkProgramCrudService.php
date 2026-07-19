<?php

namespace App\Services\WorkPrograms;

use App\Models\User;
use App\Models\WorkProgram;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WorkProgramCrudService
{
    public function createDraft(array $data, User $actor): WorkProgram
    {
        return DB::transaction(function () use ($data, $actor) {
            $data['uuid'] = $data['uuid'] ?? (string) Str::uuid();
            $data['status'] = WorkProgram::STATUS_DRAFT;
            $data['program_code'] = $data['program_code'] ?? $this->generateProgramCode((int) $data['year']);
            $data['estimated_budget'] = $data['estimated_budget'] ?? 0;
            $data['realized_budget'] = $data['realized_budget'] ?? 0;
            $data['created_by'] = $actor->id;
            $data['updated_by'] = $actor->id;

            $program = WorkProgram::query()->create($data);

            activity('work_program')
                ->causedBy($actor)
                ->performedOn($program)
                ->withProperties(['attributes' => $this->snapshot($program)])
                ->log('work_program.created');

            return $program;
        });
    }

    public function updateDraft(WorkProgram $program, array $data, User $actor): WorkProgram
    {
        return DB::transaction(function () use ($program, $data, $actor) {
            $program = WorkProgram::query()
                ->whereKey($program->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! in_array($program->status, [WorkProgram::STATUS_DRAFT, WorkProgram::STATUS_REVISION_REQUESTED], true)) {
                throw new \RuntimeException('Program kerja hanya dapat diubah saat draft atau revision requested.');
            }

            $before = $this->snapshot($program);
            $data['updated_by'] = $actor->id;
            $data['lock_version'] = $program->lock_version + 1;

            if (array_key_exists('estimated_budget', $data)) {
                $data['estimated_budget'] ??= 0;
            }

            if (array_key_exists('realized_budget', $data)) {
                $data['realized_budget'] ??= 0;
            }

            $program->update($data);

            activity('work_program')
                ->causedBy($actor)
                ->performedOn($program)
                ->withProperties([
                    'before' => $before,
                    'after' => $this->snapshot($program->fresh()),
                ])
                ->log('work_program.updated');

            return $program->fresh();
        });
    }

    public function deleteDraft(WorkProgram $program, User $actor): void
    {
        DB::transaction(function () use ($program, $actor) {
            $program = WorkProgram::query()
                ->whereKey($program->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($program->status !== WorkProgram::STATUS_DRAFT) {
                throw new \RuntimeException('Hanya program kerja draft yang dapat dihapus.');
            }

            $snapshot = $this->snapshot($program);
            $program->delete();

            activity('work_program')
                ->causedBy($actor)
                ->performedOn($program)
                ->withProperties(['attributes' => $snapshot])
                ->log('work_program.deleted');
        });
    }

    private function generateProgramCode(int $year): string
    {
        $prefix = "PROKER/{$year}/";
        $next = WorkProgram::query()
            ->where('program_code', 'like', "{$prefix}%")
            ->withTrashed()
            ->count() + 1;

        return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    private function snapshot(WorkProgram $program): array
    {
        return [
            'id' => $program->id,
            'uuid' => $program->uuid,
            'program_code' => $program->program_code,
            'name' => $program->name,
            'year' => $program->year,
            'division_id' => $program->division_id,
            'status' => $program->status,
            'priority' => $program->priority,
            'planned_start_date' => optional($program->planned_start_date)->format('Y-m-d'),
            'planned_end_date' => optional($program->planned_end_date)->format('Y-m-d'),
            'estimated_budget' => $program->estimated_budget,
            'realized_budget' => $program->realized_budget,
            'lock_version' => $program->lock_version,
        ];
    }
}
