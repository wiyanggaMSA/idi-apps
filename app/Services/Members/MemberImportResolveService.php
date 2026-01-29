<?php

namespace App\Services\Members;

use App\Models\Member;
use App\Models\MemberImportBatch;
use App\Models\MemberImportRow;
use Carbon\Carbon;
use Illuminate\Support\Arr;

class MemberImportResolveService
{
    public function resolve(MemberImportBatch $batch, array $actions, int $userId): array
    {
        $rows = MemberImportRow::query()
            ->where('batch_id', $batch->id)
            ->whereIn('id', Arr::pluck($actions, 'row_id'))
            ->get()
            ->keyBy('id');

        $resolved = 0;
        $created = 0;

        foreach ($actions as $action) {
            $row = $rows->get($action['row_id']);
            if (! $row || $row->resolved_at) {
                continue;
            }

            $selectedAction = $action['action'] ?? null;
            $targetMemberId = $action['target_member_id'] ?? null;

            if ($selectedAction === 'update' && $targetMemberId) {
                $member = Member::find($targetMemberId);
                if ($member) {
                    $member->fill($this->filledValues($row));
                    $member->save();
                }
            }

            if ($selectedAction === 'create') {
                $data = $this->filledValues($row);
                $notes = trim((string) ($row->notes ?? ''));
                $data['notes'] = trim($notes.' Imported duplicate');
                Member::create($data);
                $created++;
            }

            $row->update([
                'action' => $selectedAction,
                'resolved_at' => Carbon::now(),
                'resolved_by' => $userId,
            ]);

            $resolved++;
        }

        $newCreatedCount = $batch->created_count + $created;

        $remainingConflicts = MemberImportRow::query()
            ->where('batch_id', $batch->id)
            ->whereNull('resolved_at')
            ->count();

        $batch->update([
            'created_count' => $newCreatedCount,
            'conflict_count' => $remainingConflicts,
        ]);

        return [
            'resolved_count' => $resolved,
            'created_count' => $newCreatedCount,
            'remaining_conflicts' => $remainingConflicts,
        ];
    }

    private function filledValues(MemberImportRow $row): array
    {
        return array_filter([
            'npa' => $row->npa,
            'full_name' => $row->full_name,
            'education' => $row->education,
            'phone' => $row->phone,
            'gender' => $row->gender,
            'birth_place' => $row->birth_place,
            'birth_date' => $row->birth_date?->format('Y-m-d'),
            'email' => $row->email,
            'division_id' => $row->division_id,
            'position_id' => $row->position_id,
            'join_date' => $row->join_date?->format('Y-m-d'),
            'status' => $row->status,
            'address' => $row->address,
            'notes' => $row->notes,
        ], function ($value) {
            if ($value instanceof \DateTimeInterface) {
                return true;
            }

            return ! ($value === null || $value === '');
        });
    }
}
