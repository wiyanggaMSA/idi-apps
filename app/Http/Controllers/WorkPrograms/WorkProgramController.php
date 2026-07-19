<?php

namespace App\Http\Controllers\WorkPrograms;

use App\Http\Controllers\Controller;
use App\Http\Requests\WorkPrograms\StoreWorkProgramRequest;
use App\Http\Requests\WorkPrograms\UpdateWorkProgramRequest;
use App\Models\Division;
use App\Models\User;
use App\Models\WorkProgram;
use App\Models\WorkProgramNotification;
use App\Models\WorkProgramPeriod;
use App\Services\WorkPrograms\WorkProgramCrudService;
use App\Services\WorkPrograms\WorkProgramQueryService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class WorkProgramController extends Controller
{
    public function index(Request $request, WorkProgramQueryService $queryService): Response
    {
        $this->authorize('viewAny', WorkProgram::class);

        $perPage = min(max((int) $request->input('perPage', 15), 1), 100);

        $programs = $queryService
            ->query($request, $request->user())
            ->with(['period:id,name,code', 'division:id,name,code', 'primaryPic:id,name,email', 'tasks:id,work_program_id,progress,weight'])
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (WorkProgram $program) => $this->serializeSummary($program, $request->user()));

        return Inertia::render('WorkPrograms/Index', [
            'programs' => $programs,
            'dashboard' => $this->dashboard($request),
            'filters' => $this->filters($request),
            'notifications' => $this->notifications($request),
            'options' => $this->options(),
        ]);
    }

    public function show(WorkProgram $workProgram): Response
    {
        $this->authorize('view', $workProgram);

        $workProgram->load([
            'period:id,name,code,start_date,end_date',
            'division:id,name,code',
            'primaryPic:id,name,email',
            'creator:id,name,email',
            'updater:id,name,email',
            'assignments.user:id,name,email',
            'collaboratorDivisions.division:id,name,code',
            'tasks.pic:id,name,email',
            'tasks.assignees.user:id,name,email',
            'tasks.outgoingDependencies:id,predecessor_task_id,successor_task_id,type,lag_days',
            'budgetItems',
            'approvals.actor:id,name,email',
            'approvals.reviewer:id,name,email',
            'risks.owner:id,name,email',
            'risks.task:id,task_code,name',
            'evaluation.evaluator:id,name,email',
            'evaluation.reportDocument:id,title',
            'documentLinks.document:id,title,category,document_number,document_date,mime_type,size,description,created_at',
            'tasks.documentLinks.document:id,title,category,document_number,document_date,mime_type,size,description,created_at',
        ]);

        return Inertia::render('WorkPrograms/Show', [
            'program' => $this->serializeDetail($workProgram, request()->user()),
            'options' => $this->options(),
        ]);
    }

    public function store(StoreWorkProgramRequest $request, WorkProgramCrudService $service): RedirectResponse
    {
        $program = $service->createDraft($request->validated(), $request->user());

        return redirect()
            ->route('work-programs.show', $program)
            ->with('success', 'Draft program kerja berhasil dibuat.');
    }

    public function update(UpdateWorkProgramRequest $request, WorkProgram $workProgram, WorkProgramCrudService $service): RedirectResponse
    {
        try {
            $service->updateDraft($workProgram, $request->validated(), $request->user());
        } catch (\RuntimeException $exception) {
            return back()->withErrors(['program' => $exception->getMessage()]);
        }

        return back()->with('success', 'Draft program kerja berhasil diperbarui.');
    }

    public function destroy(WorkProgram $workProgram, WorkProgramCrudService $service): RedirectResponse
    {
        $this->authorize('delete', $workProgram);

        try {
            $service->deleteDraft($workProgram, request()->user());
        } catch (\RuntimeException $exception) {
            return back()->withErrors(['program' => $exception->getMessage()]);
        }

        return redirect()
            ->route('work-programs.index')
            ->with('success', 'Draft program kerja berhasil dihapus.');
    }

    private function serializeSummary(WorkProgram $program, ?User $user = null): array
    {
        return [
            'id' => $program->id,
            'uuid' => $program->uuid,
            'program_code' => $program->program_code,
            'name' => $program->name,
            'year' => $program->year,
            'period' => $program->period ? [
                'id' => $program->period->id,
                'name' => $program->period->name,
                'code' => $program->period->code,
            ] : null,
            'division' => $program->division ? [
                'id' => $program->division->id,
                'name' => $program->division->name,
                'code' => $program->division->code,
            ] : null,
            'category' => $program->category,
            'type' => $program->type,
            'nature' => $program->nature,
            'source' => $program->source,
            'status' => $program->status,
            'priority' => $program->priority,
            'description' => $program->description,
            'background' => $program->background,
            'objectives' => $program->objectives,
            'target_audience' => $program->target_audience,
            'success_indicators' => $program->success_indicators,
            'expected_output' => $program->expected_output,
            'location' => $program->location,
            'planned_start_date' => optional($program->planned_start_date)->format('Y-m-d'),
            'planned_end_date' => optional($program->planned_end_date)->format('Y-m-d'),
            'estimated_budget' => $program->estimated_budget,
            'realized_budget' => $program->realized_budget,
            'budget_source' => $program->budget_source,
            'internal_notes' => $program->internal_notes,
            'progress' => $this->progressForTasks($program->tasks ?? collect()),
            'primary_pic' => $program->primaryPic ? [
                'id' => $program->primaryPic->id,
                'name' => $program->primaryPic->name,
                'email' => $program->primaryPic->email,
            ] : null,
            'lock_version' => $program->lock_version,
            'workflow_actions' => $this->workflowActions($program, $user),
            'created_at' => optional($program->created_at)->format('Y-m-d H:i:s'),
            'updated_at' => optional($program->updated_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function serializeDetail(WorkProgram $program, ?User $user = null): array
    {
        return [
            ...$this->serializeSummary($program, $user),
            'description' => $program->description,
            'background' => $program->background,
            'objectives' => $program->objectives,
            'target_audience' => $program->target_audience,
            'success_indicators' => $program->success_indicators,
            'expected_output' => $program->expected_output,
            'location' => $program->location,
            'actual_start_date' => optional($program->actual_start_date)->format('Y-m-d'),
            'actual_end_date' => optional($program->actual_end_date)->format('Y-m-d'),
            'budget_source' => $program->budget_source,
            'internal_notes' => $program->internal_notes,
            'submitted_at' => optional($program->submitted_at)->format('Y-m-d H:i:s'),
            'approved_at' => optional($program->approved_at)->format('Y-m-d H:i:s'),
            'rejected_at' => optional($program->rejected_at)->format('Y-m-d H:i:s'),
            'completed_at' => optional($program->completed_at)->format('Y-m-d H:i:s'),
            'evaluated_at' => optional($program->evaluated_at)->format('Y-m-d H:i:s'),
            'archived_at' => optional($program->archived_at)->format('Y-m-d H:i:s'),
            'assignments' => $program->assignments->map(fn ($assignment) => [
                'id' => $assignment->id,
                'role' => $assignment->role,
                'assigned_at' => optional($assignment->assigned_at)->format('Y-m-d H:i:s'),
                'user' => $assignment->user ? [
                    'id' => $assignment->user->id,
                    'name' => $assignment->user->name,
                    'email' => $assignment->user->email,
                ] : null,
            ])->values(),
            'collaborator_divisions' => $program->collaboratorDivisions->map(fn ($collaborator) => [
                'id' => $collaborator->id,
                'division' => $collaborator->division ? [
                    'id' => $collaborator->division->id,
                    'name' => $collaborator->division->name,
                    'code' => $collaborator->division->code,
                ] : null,
            ])->values(),
            'budget_items' => $program->budgetItems->map(fn ($item) => [
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
            ])->values(),
            'tasks' => $program->tasks->map(fn ($task) => [
                'id' => $task->id,
                'parent_task_id' => $task->parent_task_id,
                'task_code' => $task->task_code,
                'name' => $task->name,
                'status' => $task->status,
                'priority' => $task->priority,
                'progress' => $task->progress,
                'planned_start_date' => optional($task->planned_start_date)->format('Y-m-d'),
                'planned_end_date' => optional($task->planned_end_date)->format('Y-m-d'),
                'is_milestone' => $task->is_milestone,
                'assignees' => $task->assignees->map(fn ($assignee) => [
                    'id' => $assignee->id,
                    'user' => $assignee->user ? [
                        'id' => $assignee->user->id,
                        'name' => $assignee->user->name,
                        'email' => $assignee->user->email,
                    ] : null,
                ])->values(),
                'dependencies' => $task->outgoingDependencies->map(fn ($dependency) => [
                    'id' => $dependency->id,
                    'predecessor_task_id' => $dependency->predecessor_task_id,
                    'successor_task_id' => $dependency->successor_task_id,
                    'type' => $dependency->type,
                    'lag_days' => $dependency->lag_days,
                ])->values(),
                'pic' => $task->pic ? [
                    'id' => $task->pic->id,
                    'name' => $task->pic->name,
                    'email' => $task->pic->email,
                ] : null,
            ])->values(),
            'approvals' => $program->approvals->sortByDesc('acted_at')->map(fn ($approval) => [
                'id' => $approval->id,
                'action' => $approval->action,
                'from_status' => $approval->from_status,
                'to_status' => $approval->to_status,
                'note' => $approval->note,
                'acted_at' => optional($approval->acted_at)->format('Y-m-d H:i:s'),
                'actor' => $approval->actor ? [
                    'id' => $approval->actor->id,
                    'name' => $approval->actor->name,
                ] : null,
            ])->values(),
            'risks' => $program->risks->map(fn ($risk) => [
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
            ])->values(),
            'documents' => $program->documentLinks
                ->map(fn ($link) => $this->serializeDocumentLink($link))
                ->filter()
                ->values(),
            'task_documents' => $program->tasks
                ->flatMap(fn ($task) => $task->documentLinks->map(function ($link) use ($task) {
                    $document = $this->serializeDocumentLink($link);

                    if (! $document) {
                        return null;
                    }

                    return [
                        ...$document,
                        'task' => [
                            'id' => $task->id,
                            'task_code' => $task->task_code,
                            'name' => $task->name,
                        ],
                    ];
                }))
                ->filter()
                ->values(),
            'evaluation' => $program->evaluation ? [
                'id' => $program->evaluation->id,
                'result_summary' => $program->evaluation->result_summary,
                'objective_achievement' => $program->evaluation->objective_achievement,
                'indicator_result' => $program->evaluation->indicator_result,
                'target_vs_realization' => $program->evaluation->target_vs_realization,
                'time_evaluation' => $program->evaluation->time_evaluation,
                'budget_result' => $program->evaluation->budget_result,
                'constraints' => $program->evaluation->constraints,
                'supporting_factors' => $program->evaluation->supporting_factors,
                'inhibiting_factors' => $program->evaluation->inhibiting_factors,
                'lessons_learned' => $program->evaluation->lessons_learned,
                'recommendations' => $program->evaluation->recommendations,
                'follow_up' => $program->evaluation->follow_up,
                'report_document_id' => $program->evaluation->report_document_id,
                'report_document' => $program->evaluation->reportDocument ? [
                    'id' => $program->evaluation->reportDocument->id,
                    'title' => $program->evaluation->reportDocument->title,
                ] : null,
                'evaluated_at' => optional($program->evaluation->evaluated_at)->format('Y-m-d H:i:s'),
                'evaluator' => $program->evaluation->evaluator ? [
                    'id' => $program->evaluation->evaluator->id,
                    'name' => $program->evaluation->evaluator->name,
                    'email' => $program->evaluation->evaluator->email,
                ] : null,
            ] : null,
        ];
    }

    private function dashboard(Request $request): array
    {
        $today = CarbonImmutable::today();
        $deadline = $today->addDays(14);
        $programs = WorkProgram::query()
            ->visibleTo($request->user())
            ->with(['period:id,name,code', 'division:id,name,code', 'primaryPic:id,name,email', 'tasks:id,work_program_id,progress,weight'])
            ->get();

        $terminalStatuses = [
            WorkProgram::STATUS_COMPLETED,
            WorkProgram::STATUS_EVALUATED,
            WorkProgram::STATUS_ARCHIVED,
            WorkProgram::STATUS_CANCELLED,
            WorkProgram::STATUS_REJECTED,
        ];

        return [
            'total' => $programs->count(),
            'draft' => $programs->where('status', WorkProgram::STATUS_DRAFT)->count(),
            'pending_approval' => $programs
                ->whereIn('status', [WorkProgram::STATUS_SUBMITTED, WorkProgram::STATUS_UNDER_REVIEW])
                ->count(),
            'revision_requested' => $programs->where('status', WorkProgram::STATUS_REVISION_REQUESTED)->count(),
            'approved' => $programs->where('status', WorkProgram::STATUS_APPROVED)->count(),
            'in_progress' => $programs->where('status', WorkProgram::STATUS_IN_PROGRESS)->count(),
            'completed' => $programs
                ->whereIn('status', [WorkProgram::STATUS_COMPLETED, WorkProgram::STATUS_EVALUATED])
                ->count(),
            'overdue' => $programs
                ->filter(fn (WorkProgram $program) => $program->planned_end_date
                    && $program->planned_end_date->lt($today)
                    && ! in_array($program->status, $terminalStatuses, true))
                ->count(),
            'approval_queue' => $programs
                ->whereIn('status', [WorkProgram::STATUS_SUBMITTED, WorkProgram::STATUS_UNDER_REVIEW])
                ->values()
                ->take(5)
                ->map(fn (WorkProgram $program) => $this->serializeSummary($program, $request->user()))
                ->values(),
            'upcoming_deadlines' => $programs
                ->filter(fn (WorkProgram $program) => $program->planned_end_date
                    && $program->planned_end_date->betweenIncluded($today, $deadline)
                    && ! in_array($program->status, $terminalStatuses, true))
                ->sortBy('planned_end_date')
                ->take(5)
                ->map(fn (WorkProgram $program) => $this->serializeSummary($program, $request->user()))
                ->values(),
            'progress_average' => (int) round($programs->avg(fn (WorkProgram $program) => $this->progressForTasks($program->tasks)) ?? 0),
        ];
    }

    private function progressForTasks(Collection $tasks): int
    {
        $leafTasks = $this->leafTasks($tasks);

        if ($leafTasks->isEmpty()) {
            return 0;
        }

        $totalWeight = (float) $leafTasks->sum(fn ($task) => (float) $task->weight);

        if ($totalWeight <= 0) {
            return (int) round($leafTasks->avg('progress') ?? 0);
        }

        $weighted = $leafTasks->sum(fn ($task) => ((float) $task->progress) * ((float) $task->weight));

        return (int) round($weighted / $totalWeight);
    }

    private function leafTasks(Collection $tasks): Collection
    {
        $parentIds = $tasks
            ->pluck('parent_task_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique();

        return $tasks
            ->reject(fn ($task) => $parentIds->contains((int) $task->id))
            ->values();
    }

    private function workflowActions(WorkProgram $program, ?User $user): array
    {
        if (! $user) {
            return [
                'submit' => false,
                'withdraw' => false,
                'start_review' => false,
                'request_revision' => false,
                'approve' => false,
                'reject' => false,
                'schedule' => false,
                'start_execution' => false,
                'hold' => false,
                'resume' => false,
                'complete' => false,
                'archive' => false,
            ];
        }

        return [
            'submit' => $user->can('submit', $program),
            'withdraw' => $user->can('withdraw', $program),
            'start_review' => $user->can('review', $program),
            'request_revision' => $user->can('requestRevision', $program),
            'approve' => $user->can('approve', $program),
            'reject' => $user->can('reject', $program),
            'schedule' => $user->can('schedule', $program),
            'start_execution' => $user->can('startExecution', $program),
            'hold' => $user->can('hold', $program),
            'resume' => $user->can('resume', $program),
            'complete' => $user->can('complete', $program),
            'archive' => $user->can('archive', $program),
        ];
    }

    private function serializeDocumentLink($link): ?array
    {
        if (! $link->document) {
            return null;
        }

        return [
            'id' => $link->document->id,
            'title' => $link->document->title,
            'category' => $link->document->category,
            'document_number' => $link->document->document_number,
            'document_date' => optional($link->document->document_date)->format('Y-m-d'),
            'mime_type' => $link->document->mime_type,
            'size' => $link->document->size,
            'description' => $link->document->description,
            'created_at' => optional($link->document->created_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function filters(Request $request): array
    {
        return [
            'search' => $request->input('search'),
            'year' => $request->input('year'),
            'period_id' => $request->input('period_id'),
            'division_id' => $request->input('division_id'),
            'status' => $request->input('status'),
            'priority' => $request->input('priority'),
            'pic_user_id' => $request->input('pic_user_id'),
            'category' => $request->input('category'),
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
            'sortBy' => $request->input('sortBy', 'created_at'),
            'sortDir' => $request->input('sortDir', 'desc'),
            'perPage' => (int) $request->input('perPage', 15),
        ];
    }

    private function notifications(Request $request): Collection
    {
        return WorkProgramNotification::query()
            ->where('recipient_user_id', $request->user()->id)
            ->with(['program:id,name,program_code', 'task:id,name,task_code'])
            ->latest()
            ->take(8)
            ->get()
            ->map(fn (WorkProgramNotification $notification) => [
                'id' => $notification->id,
                'type' => $notification->type,
                'title' => $notification->title,
                'message' => $notification->message,
                'read_at' => optional($notification->read_at)->format('Y-m-d H:i:s'),
                'created_at' => optional($notification->created_at)->format('Y-m-d H:i:s'),
                'program' => $notification->program ? [
                    'id' => $notification->program->id,
                    'name' => $notification->program->name,
                    'program_code' => $notification->program->program_code,
                ] : null,
                'task' => $notification->task ? [
                    'id' => $notification->task->id,
                    'name' => $notification->task->name,
                    'task_code' => $notification->task->task_code,
                ] : null,
            ]);
    }

    private function options(): array
    {
        return [
            'periods' => WorkProgramPeriod::query()
                ->active()
                ->orderByDesc('start_date')
                ->get(['id', 'name', 'code', 'start_date', 'end_date']),
            'divisions' => Division::query()
                ->active()
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'users' => User::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'email']),
            'statuses' => WorkProgram::STATUSES,
            'priorities' => [
                WorkProgram::PRIORITY_LOW,
                WorkProgram::PRIORITY_MEDIUM,
                WorkProgram::PRIORITY_HIGH,
                WorkProgram::PRIORITY_CRITICAL,
            ],
            'natures' => [
                WorkProgram::NATURE_ROUTINE,
                WorkProgram::NATURE_INCIDENTAL,
                WorkProgram::NATURE_STRATEGIC,
                WorkProgram::NATURE_COLLABORATIVE,
            ],
            'sources' => [
                WorkProgram::SOURCE_FIELD_PROPOSAL,
                WorkProgram::SOURCE_ORGANIZATIONAL_MANDATE,
                WorkProgram::SOURCE_WORK_MEETING_RESULT,
                WorkProgram::SOURCE_EVALUATION_FOLLOW_UP,
            ],
        ];
    }
}
