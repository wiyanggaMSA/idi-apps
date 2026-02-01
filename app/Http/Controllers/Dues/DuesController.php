<?php

namespace App\Http\Controllers\Dues;

use App\Http\Controllers\Controller;
use App\Models\DuesPayment;
use App\Models\Member;
use App\Services\Dues\DuesLedgerService;
use App\Services\Dues\DuesInvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DuesController extends Controller
{
    public function index(Request $request, DuesLedgerService $ledgerService): Response
    {
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
            'monthly_amount' => $payload['monthly_amount'],
            'filters' => array_merge($filters, [
                'perPage' => $perPage,
                'page' => $page,
            ]),
        ]);
    }

    public function storePayment(Request $request, DuesLedgerService $ledgerService): RedirectResponse
    {
        $data = $request->validate([
            'member_id' => ['required', 'exists:members,id'],
            'start_period' => ['required', 'date_format:Y-m', 'after_or_equal:'.DuesLedgerService::GO_LIVE_PERIOD],
            'duration' => ['required', 'integer', 'min:1', 'max:36'],
            'method' => ['required', 'in:cash,transfer'],
            'paid_at' => ['required', 'date'],
            'reference_no' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
        ]);

        try {
            $ledgerService->storePayment($data, $request->user()->id);
        } catch (\RuntimeException $exception) {
            return redirect()->back()->withErrors(['payment' => $exception->getMessage()]);
        }

        return redirect()->back()->with('success', 'Pembayaran iuran berhasil disimpan.');
    }

    public function syncMembers(DuesInvoiceService $invoiceService): RedirectResponse
    {
        $now = now();
        $invoiceService->generateMonthlyInvoices((int) $now->format('Y'), (int) $now->format('m'));

        return redirect()->back()->with('success', 'Sinkronisasi iuran selesai.');
    }

    public function updatePayment(Request $request, DuesPayment $payment, DuesLedgerService $ledgerService): RedirectResponse
    {
        $data = $request->validate([
            'paid_at' => ['required', 'date'],
            'method' => ['required', 'in:cash,transfer'],
            'reference_no' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $ledgerService->updatePayment($payment, $data, $request->user()->id);
        } catch (\RuntimeException $exception) {
            return redirect()->back()->withErrors(['payment' => $exception->getMessage()]);
        }

        return redirect()->back()->with('success', 'Pembayaran berhasil diperbarui.');
    }

    public function voidPayment(Request $request, DuesPayment $payment, DuesLedgerService $ledgerService): RedirectResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        try {
            $ledgerService->voidPayment($payment, $data['reason'], $request->user()->id);
        } catch (\RuntimeException $exception) {
            return redirect()->back()->withErrors(['payment' => $exception->getMessage()]);
        }

        return redirect()->back()->with('success', 'Pembayaran berhasil dibatalkan.');
    }

    public function memberPayments(Member $member): JsonResponse
    {
        $payments = DuesPayment::query()
            ->where('member_id', $member->id)
            ->with(['allocations' => function ($query) {
                $query->orderBy('period_ym');
            }])
            ->orderByDesc('paid_at')
            ->get();

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
            'payments' => $payments->map(function (DuesPayment $payment) {
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
                ];
            }),
        ]);
    }
}
