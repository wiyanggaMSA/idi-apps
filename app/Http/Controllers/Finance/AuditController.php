<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\CashTransaction;
use App\Models\DuesPayment;
use App\Models\FinancialActionRequest;
use App\Services\Finance\FinancialActionRequestService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class AuditController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', FinancialActionRequest::class);

        $activities = Activity::query()
            ->with('causer')
            ->when($request->input('event'), fn ($query, $event) => $query->where('description', $event))
            ->when($request->input('module'), function ($query, $module) {
                $query->where(function ($sub) use ($module) {
                    $sub->where('description', 'like', "{$module}.%")
                        ->orWhere('log_name', $module);
                });
            })
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($sub) use ($search) {
                    $sub->where('description', 'like', "%{$search}%")
                        ->orWhere('properties', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Activity $activity) => [
                'id' => $activity->id,
                'event' => $activity->description,
                'log_name' => $activity->log_name,
                'subject_type' => class_basename((string) $activity->subject_type),
                'subject_id' => $activity->subject_id,
                'causer_name' => $activity->causer?->name,
                'causer_id' => $activity->causer_id,
                'properties' => $activity->properties,
                'created_at' => optional($activity->created_at)->format('Y-m-d H:i:s'),
            ]);

        $requests = FinancialActionRequest::query()
            ->with(['requestedBy', 'reviewedBy', 'actionable'])
            ->when($request->input('request_status'), fn ($query, $status) => $query->where('status', $status))
            ->latest()
            ->paginate(10, ['*'], 'requests_page')
            ->withQueryString()
            ->through(fn (FinancialActionRequest $actionRequest) => $this->mapRequest($actionRequest));

        return Inertia::render('Audit/Index', [
            'activities' => $activities,
            'actionRequests' => $requests,
            'filters' => [
                'search' => $request->input('search'),
                'event' => $request->input('event'),
                'module' => $request->input('module'),
                'request_status' => $request->input('request_status', FinancialActionRequest::STATUS_PENDING),
            ],
        ]);
    }

    public function approve(Request $request, FinancialActionRequest $actionRequest, FinancialActionRequestService $service): RedirectResponse
    {
        $this->authorize('approve', $actionRequest);

        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $service->approve($actionRequest, $request->user(), $data['note'] ?? null);
        } catch (\RuntimeException $exception) {
            return back()->withErrors(['approval' => $exception->getMessage()]);
        }

        return back()->with('success', 'Request void disetujui.');
    }

    public function reject(Request $request, FinancialActionRequest $actionRequest, FinancialActionRequestService $service): RedirectResponse
    {
        $this->authorize('reject', $actionRequest);

        $data = $request->validate([
            'note' => ['required', 'string', 'max:500'],
        ]);

        try {
            $service->reject($actionRequest, $request->user(), $data['note']);
        } catch (\RuntimeException $exception) {
            return back()->withErrors(['approval' => $exception->getMessage()]);
        }

        return back()->with('success', 'Request void ditolak.');
    }

    private function mapRequest(FinancialActionRequest $actionRequest): array
    {
        $target = $actionRequest->actionable;
        $targetLabel = '-';
        $amount = null;
        $date = null;

        if ($target instanceof DuesPayment) {
            $target->loadMissing('member');
            $targetLabel = trim(sprintf('Iuran %s', $target->member?->full_name ?? "#{$target->id}"));
            $amount = $target->amount;
            $date = optional($target->paid_at)->format('Y-m-d');
        } elseif ($target instanceof CashTransaction) {
            $targetLabel = trim(sprintf('Transaksi %s', $target->description ?: "#{$target->id}"));
            $amount = $target->amount;
            $date = optional($target->tx_date)->format('Y-m-d');
        }

        return [
            'id' => $actionRequest->id,
            'action' => $actionRequest->action,
            'status' => $actionRequest->status,
            'reason' => $actionRequest->reason,
            'target_type' => class_basename((string) $actionRequest->actionable_type),
            'target_id' => $actionRequest->actionable_id,
            'target_label' => $targetLabel,
            'amount' => $amount,
            'date' => $date,
            'requested_by' => $actionRequest->requestedBy?->name,
            'requested_by_id' => $actionRequest->requested_by,
            'reviewed_by' => $actionRequest->reviewedBy?->name,
            'review_note' => $actionRequest->review_note,
            'reviewed_at' => optional($actionRequest->reviewed_at)->format('Y-m-d H:i:s'),
            'created_at' => optional($actionRequest->created_at)->format('Y-m-d H:i:s'),
        ];
    }
}
