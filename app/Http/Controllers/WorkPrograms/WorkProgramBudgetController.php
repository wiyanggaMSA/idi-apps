<?php

namespace App\Http\Controllers\WorkPrograms;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkPrograms\UpdateWorkProgramBudgetRequest;
use App\Models\WorkProgram;
use App\Models\WorkProgramBudgetItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkProgramBudgetController extends Controller
{
    public function index(WorkProgram $workProgram): JsonResponse
    {
        $this->authorize('view', $workProgram);

        return response()->json($this->budgetPayload($workProgram));
    }

    public function update(UpdateWorkProgramBudgetRequest $request, WorkProgram $workProgram): JsonResponse
    {
        $this->authorize('manageBudget', $workProgram);

        $before = [
            'estimated_budget' => $workProgram->estimated_budget,
            'realized_budget' => $workProgram->realized_budget,
            'budget_source' => $workProgram->budget_source,
            'internal_notes' => $workProgram->internal_notes,
        ];

        $workProgram->update([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
            'lock_version' => $workProgram->lock_version + 1,
        ]);

        activity('work_program')
            ->causedBy($request->user())
            ->performedOn($workProgram)
            ->withProperties([
                'before' => $before,
                'after' => [
                    'estimated_budget' => $workProgram->estimated_budget,
                    'realized_budget' => $workProgram->realized_budget,
                    'budget_source' => $workProgram->budget_source,
                    'internal_notes' => $workProgram->internal_notes,
                ],
            ])
            ->log('work_program.budget.updated');

        return response()->json([
            'data' => [
                'estimated_budget' => $workProgram->estimated_budget,
                'realized_budget' => $workProgram->realized_budget,
                'budget_source' => $workProgram->budget_source,
                'internal_notes' => $workProgram->internal_notes,
                'lock_version' => $workProgram->lock_version,
            ],
        ]);
    }

    public function storeItem(Request $request, WorkProgram $workProgram): JsonResponse
    {
        $this->authorize('manageBudget', $workProgram);

        $data = $this->validatedItem($request);

        DB::transaction(function () use ($data, $request, $workProgram) {
            $workProgram->budgetItems()->create([
                ...$this->normalizeItemAmounts($data),
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);

            $this->syncTotals($workProgram, $request);
        });

        activity('work_program')
            ->causedBy($request->user())
            ->performedOn($workProgram)
            ->withProperties(['description' => $data['description']])
            ->log('work_program.budget_item.created');

        return response()->json($this->budgetPayload($workProgram), 201);
    }

    public function updateItem(Request $request, WorkProgram $workProgram, WorkProgramBudgetItem $item): JsonResponse
    {
        $this->ensureItemBelongsToProgram($workProgram, $item);
        $this->authorize('manageBudget', $workProgram);

        $data = $this->validatedItem($request);

        DB::transaction(function () use ($data, $item, $request, $workProgram) {
            $item->update([
                ...$this->normalizeItemAmounts($data),
                'updated_by' => $request->user()->id,
            ]);

            $this->syncTotals($workProgram, $request);
        });

        activity('work_program')
            ->causedBy($request->user())
            ->performedOn($workProgram)
            ->withProperties(['item_id' => $item->id])
            ->log('work_program.budget_item.updated');

        return response()->json($this->budgetPayload($workProgram));
    }

    public function destroyItem(Request $request, WorkProgram $workProgram, WorkProgramBudgetItem $item): JsonResponse
    {
        $this->ensureItemBelongsToProgram($workProgram, $item);
        $this->authorize('manageBudget', $workProgram);

        DB::transaction(function () use ($item, $request, $workProgram) {
            $item->update(['updated_by' => $request->user()->id]);
            $item->delete();

            $this->syncTotals($workProgram, $request);
        });

        activity('work_program')
            ->causedBy($request->user())
            ->performedOn($workProgram)
            ->withProperties(['item_id' => $item->id])
            ->log('work_program.budget_item.deleted');

        return response()->json($this->budgetPayload($workProgram));
    }

    private function validatedItem(Request $request): array
    {
        return $request->validate([
            'category' => ['nullable', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:255'],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'unit' => ['nullable', 'string', 'max:50'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'estimated_amount' => ['nullable', 'numeric', 'min:0'],
            'realized_amount' => ['nullable', 'numeric', 'min:0'],
            'budget_source' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);
    }

    private function normalizeItemAmounts(array $data): array
    {
        $quantity = max(1, (int) ($data['quantity'] ?? 1));
        $unitCost = (float) ($data['unit_cost'] ?? 0);
        $estimatedAmount = array_key_exists('estimated_amount', $data) && $data['estimated_amount'] !== null
            ? (float) $data['estimated_amount']
            : $quantity * $unitCost;

        return [
            ...$data,
            'quantity' => $quantity,
            'unit_cost' => $unitCost,
            'estimated_amount' => $estimatedAmount,
            'realized_amount' => (float) ($data['realized_amount'] ?? 0),
        ];
    }

    private function syncTotals(WorkProgram $workProgram, Request $request): void
    {
        $totals = $workProgram->budgetItems()
            ->selectRaw('COALESCE(SUM(estimated_amount), 0) as estimated_total, COALESCE(SUM(realized_amount), 0) as realized_total')
            ->first();

        $workProgram->update([
            'estimated_budget' => (float) $totals->estimated_total,
            'realized_budget' => (float) $totals->realized_total,
            'updated_by' => $request->user()->id,
            'lock_version' => $workProgram->lock_version + 1,
        ]);
    }

    private function ensureItemBelongsToProgram(WorkProgram $workProgram, WorkProgramBudgetItem $item): void
    {
        abort_unless((int) $item->work_program_id === (int) $workProgram->id, 404);
    }

    private function budgetPayload(WorkProgram $workProgram): array
    {
        $workProgram->refresh();

        return [
            'data' => [
                'estimated_budget' => $workProgram->estimated_budget,
                'realized_budget' => $workProgram->realized_budget,
                'budget_source' => $workProgram->budget_source,
                'internal_notes' => $workProgram->internal_notes,
                'lock_version' => $workProgram->lock_version,
                'items' => $workProgram->budgetItems()
                    ->latest('id')
                    ->get()
                    ->map(fn (WorkProgramBudgetItem $item) => $this->serializeItem($item))
                    ->values(),
            ],
        ];
    }

    private function serializeItem(WorkProgramBudgetItem $item): array
    {
        return [
            'id' => $item->id,
            'category' => $item->category,
            'description' => $item->description,
            'quantity' => $item->quantity,
            'unit' => $item->unit,
            'unit_cost' => $item->unit_cost,
            'estimated_amount' => $item->estimated_amount,
            'realized_amount' => $item->realized_amount,
            'budget_source' => $item->budget_source,
            'notes' => $item->notes,
        ];
    }
}
