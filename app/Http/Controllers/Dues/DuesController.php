<?php

namespace App\Http\Controllers\Dues;

use App\Http\Controllers\Controller;
use App\Models\DuesPayment;
use App\Models\FinancialActionRequest;
use App\Models\Member;
use App\Services\Dues\DuesLedgerService;
use App\Services\Dues\DuesInvoiceService;
use App\Services\Finance\FinancePeriodService;
use App\Services\Finance\FinancialActionRequestService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DuesController extends Controller
{
    public function index(Request $request, DuesLedgerService $ledgerService): Response
    {
        $this->authorize('viewAny', DuesPayment::class);

        $perPage = 10;
        $page = max((int) $request->input('page', 1), 1);
        $filters = [
            'search' => $request->input('search'),
            'status' => $request->input('status', 'ALL'),
            'arrears_only' => $request->boolean('arrears_only'),
            'advance_only' => $request->boolean('advance_only'),
        ];

        $payload = $ledgerService->buildIndexPayload($filters, $page, $perPage);

        return Inertia::render('Dues/Index', [
            'dues' => $payload['dues'],
            'summary' => $payload['summary'],
            'members' => $payload['members'],
            'active_period' => $payload['active_period'],
            'active_period_label' => $payload['active_period_label'],
            'dues_start_period' => $payload['dues_start_period'],
            'monthly_amount' => $payload['monthly_amount'],
            'filters' => array_merge($filters, [
                'perPage' => $perPage,
                'page' => $page,
            ]),
        ]);
    }

    public function storePayment(Request $request, DuesLedgerService $ledgerService, FinancePeriodService $financePeriodService): RedirectResponse
    {
        $this->authorize('create', DuesPayment::class);

        $duesStartPeriod = $ledgerService->duesStartPeriod();

        $data = $request->validate([
            'member_id' => ['required', 'exists:members,id'],
            'start_period' => ['required', 'date_format:Y-m', 'after_or_equal:'.$duesStartPeriod],
            'duration' => ['required', 'integer', 'min:1'],
            'method' => ['required', 'in:cash,transfer'],
            'paid_at' => ['required', 'date'],
            'reference_no' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
        ]);

        try {
            $financePeriodService->ensureOpen(
                $data['paid_at'],
                'Periode pembayaran sudah closed. Gunakan adjustment pada periode yang masih open.'
            );
            $ledgerService->storePayment($data, $request->user()->id);
        } catch (\RuntimeException $exception) {
            return redirect()->back()->withErrors(['payment' => $exception->getMessage()]);
        }

        return redirect()->back()->with('success', 'Pembayaran iuran berhasil disimpan.');
    }

    public function syncMembers(DuesInvoiceService $invoiceService): RedirectResponse
    {
        $this->authorize('sync', DuesPayment::class);

        $now = now();
        $invoiceService->generateMonthlyInvoices((int) $now->format('Y'), (int) $now->format('m'));

        return redirect()->back()->with('success', 'Sinkronisasi iuran selesai.');
    }

    public function updatePayment(Request $request, DuesPayment $payment, DuesLedgerService $ledgerService, FinancePeriodService $financePeriodService): RedirectResponse
    {
        $this->authorize('update', $payment);

        $data = $request->validate([
            'paid_at' => ['required', 'date'],
            'method' => ['required', 'in:cash,transfer'],
            'reference_no' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $financePeriodService->ensureOpen(
                $payment->paid_at,
                'Periode pembayaran sudah closed. Pembayaran tidak dapat diubah setelah tutup buku.'
            );
            $ledgerService->updatePayment($payment, $data, $request->user()->id);
        } catch (\RuntimeException $exception) {
            return redirect()->back()->withErrors(['payment' => $exception->getMessage()]);
        }

        return redirect()->back()->with('success', 'Pembayaran berhasil diperbarui.');
    }

    public function voidPayment(Request $request, DuesPayment $payment, FinancialActionRequestService $actionRequestService, FinancePeriodService $financePeriodService): RedirectResponse
    {
        $this->authorize('requestVoid', $payment);

        $data = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        try {
            $financePeriodService->ensureOpen(
                $payment->paid_at,
                'Periode pembayaran sudah closed. Void hanya dapat dilakukan melalui adjustment pada periode open.'
            );
            $actionRequestService->requestVoid($payment, $data['reason'], $request->user());
        } catch (\RuntimeException $exception) {
            return redirect()->back()->withErrors(['payment' => $exception->getMessage()]);
        }

        return redirect()->back()->with('success', 'Request void pembayaran dikirim untuk approval.');
    }

    public function memberPayments(Member $member, DuesLedgerService $ledgerService): JsonResponse
    {
        $this->authorize('viewAny', DuesPayment::class);

        $payments = DuesPayment::query()
            ->where('member_id', $member->id)
            ->with(['allocations' => function ($query) {
                $query->orderBy('period_ym');
            }])
            ->orderByDesc('paid_at')
            ->get();

        $pendingVoidIds = FinancialActionRequest::query()
            ->where('actionable_type', (new DuesPayment())->getMorphClass())
            ->where('action', FinancialActionRequest::ACTION_VOID)
            ->where('status', FinancialActionRequest::STATUS_PENDING)
            ->whereIn('actionable_id', $payments->pluck('id'))
            ->pluck('actionable_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return response()->json([
            'member' => [
                'id' => $member->id,
                'npa' => $member->npa,
                'full_name' => $member->full_name,
                'email' => $member->email,
                'phone' => $member->phone,
                'education' => $member->education,
                'sip_1' => $member->sip_1,
                'sip_2' => $member->sip_2,
                'sip_3' => $member->sip_3,
            ],
            'payments' => $payments->map(function (DuesPayment $payment) use ($pendingVoidIds) {
                $start = $payment->allocations->first()?->period_ym;
                $end = $payment->allocations->last()?->period_ym;

                return [
                    'id' => $payment->id,
                    'paid_at' => optional($payment->paid_at)->format('Y-m-d'),
                    'amount' => $payment->amount,
                    'method' => $payment->method,
                    'reference_no' => $payment->reference_no,
                    'notes' => $payment->notes,
                    'start_period' => $start,
                    'end_period' => $end,
                    'voided_at' => optional($payment->voided_at)->format('Y-m-d H:i'),
                    'void_reason' => $payment->void_reason,
                    'has_pending_void_request' => in_array((int) $payment->id, $pendingVoidIds, true),
                    'status' => $payment->voided_at ? 'void' : 'paid',
                    'can_edit' => $payment->voided_at === null,
                    'can_void' => $payment->voided_at === null,
                ];
            }),
            'history' => $this->buildMemberDuesHistory($payments, $pendingVoidIds, $ledgerService),
        ]);
    }

    private function buildMemberDuesHistory($payments, array $pendingVoidIds, DuesLedgerService $ledgerService): array
    {
        $duesStartPeriod = $ledgerService->duesStartPeriod();
        $activePeriod = $ledgerService->activePeriod();
        $monthlyAmount = $ledgerService->monthlyAmount();
        $latestAllocatedPeriod = $payments
            ->flatMap(fn (DuesPayment $payment) => $payment->allocations->pluck('period_ym'))
            ->filter()
            ->max();
        $endPeriod = max($activePeriod, $latestAllocatedPeriod ?: $activePeriod);

        $periodMap = [];
        foreach ($payments as $payment) {
            foreach ($payment->allocations as $allocation) {
                $periodMap[$allocation->period_ym][] = [
                    'payment' => $payment,
                    'allocation' => $allocation,
                ];
            }
        }

        $rows = [];
        $cursor = Carbon::createFromFormat('Y-m', $duesStartPeriod)->startOfMonth();
        $end = Carbon::createFromFormat('Y-m', $endPeriod)->startOfMonth();

        while ($cursor <= $end) {
            $period = $cursor->format('Y-m');
            $entries = $periodMap[$period] ?? [];

            if ($entries === []) {
                $rows[] = [
                    'id' => "period-{$period}",
                    'payment_id' => null,
                    'paid_at' => null,
                    'period' => $period,
                    'start_period' => $period,
                    'end_period' => $period,
                    'amount' => $monthlyAmount,
                    'method' => null,
                    'reference_no' => null,
                    'notes' => null,
                    'status' => $period <= $activePeriod ? 'unpaid' : 'future',
                    'voided_at' => null,
                    'void_reason' => null,
                    'has_pending_void_request' => false,
                    'can_edit' => false,
                    'can_void' => false,
                ];
                $cursor->addMonth();
                continue;
            }

            foreach ($entries as $entry) {
                /** @var DuesPayment $payment */
                $payment = $entry['payment'];
                $allocation = $entry['allocation'];
                $isVoided = $payment->voided_at !== null;

                $rows[] = [
                    'id' => "payment-{$payment->id}-{$period}",
                    'payment_id' => $payment->id,
                    'paid_at' => optional($payment->paid_at)->format('Y-m-d'),
                    'period' => $period,
                    'start_period' => $period,
                    'end_period' => $period,
                    'amount' => $allocation->amount,
                    'method' => $payment->method,
                    'reference_no' => $payment->reference_no,
                    'notes' => $payment->notes,
                    'status' => $isVoided ? 'void' : 'paid',
                    'voided_at' => optional($payment->voided_at)->format('Y-m-d H:i'),
                    'void_reason' => $payment->void_reason,
                    'has_pending_void_request' => in_array((int) $payment->id, $pendingVoidIds, true),
                    'can_edit' => ! $isVoided,
                    'can_void' => ! $isVoided,
                ];
            }

            $cursor->addMonth();
        }

        return collect($rows)
            ->sortByDesc('period')
            ->values()
            ->all();
    }
}
