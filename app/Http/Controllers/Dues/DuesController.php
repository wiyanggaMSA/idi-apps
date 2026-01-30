<?php

namespace App\Http\Controllers\Dues;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dues\GenerateDuesPeriodRequest;
use App\Http\Requests\Dues\StoreDuesPaymentRequest;
use App\Models\CashMethod;
use App\Models\Division;
use App\Models\DuesInvoice;
use App\Models\DuesPayment;
use App\Models\DuesSetting;
use App\Models\PaymentStatus;
use App\Services\Dues\DuesInvoiceService;
use App\Services\Dues\DuesPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DuesController extends Controller
{
    public function index(Request $request, DuesInvoiceService $invoiceService): Response
    {
        $invoiceService->updateOverdueStatus();

        $perPage = (int) $request->input('perPage', 10);
        $search = trim((string) $request->input('search'));
        $period = $request->input('period');
        $status = $request->input('status');
        $divisionId = $request->input('division_id');
        $sortBy = $request->input('sortBy', 'full_name');
        $sortDir = $request->input('sortDir', 'asc');

        $allowedSorts = [
            'npa' => 'members.npa',
            'full_name' => 'members.full_name',
            'division' => 'members.division_id',
            'status' => 'payment_statuses.code',
            'amount_due' => 'dues_invoices.amount_due',
            'amount_paid' => 'dues_invoices.amount_paid',
            'due_date' => 'dues_invoices.due_date',
        ];

        if (! array_key_exists($sortBy, $allowedSorts)) {
            $sortBy = 'full_name';
        }

        if (! in_array($sortDir, ['asc', 'desc'], true)) {
            $sortDir = 'asc';
        }

        $query = DuesInvoice::query()
            ->select('dues_invoices.*')
            ->join('members', 'members.id', '=', 'dues_invoices.member_id')
            ->join('dues_periods', 'dues_periods.id', '=', 'dues_invoices.dues_period_id')
            ->join('payment_statuses', 'payment_statuses.id', '=', 'dues_invoices.payment_status_id')
            ->with(['member.division', 'period', 'paymentStatus', 'latestPayment']);

        if ($search) {
            $query->where(function ($sub) use ($search) {
                $sub->where('members.npa', 'like', "%{$search}%")
                    ->orWhere('members.full_name', 'like', "%{$search}%");
            });
        }

        if ($period) {
            $query->where('dues_periods.period', $period);
        }

        if ($status) {
            $query->whereRaw('LOWER(payment_statuses.code) = ?', [strtolower($status)]);
        }

        if ($divisionId) {
            $query->where('members.division_id', $divisionId);
        }

        $query->orderBy($allowedSorts[$sortBy], $sortDir);

        $invoices = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (DuesInvoice $invoice) {
                $outstanding = max($invoice->amount_due - $invoice->amount_paid, 0);

                return [
                    'id' => $invoice->id,
                    'member_id' => $invoice->member_id,
                    'npa' => $invoice->member?->npa,
                    'full_name' => $invoice->member?->full_name,
                    'division' => $invoice->member?->division?->name,
                    'status' => $invoice->paymentStatus?->code,
                    'status_name' => $invoice->paymentStatus?->name,
                    'status_color' => $invoice->paymentStatus?->color,
                    'payment_status_id' => $invoice->payment_status_id,
                    'amount_due' => $invoice->amount_due,
                    'amount_paid' => $invoice->amount_paid,
                    'outstanding' => $outstanding,
                    'due_date' => optional($invoice->due_date)->format('Y-m-d'),
                    'period' => $invoice->period?->period,
                    'period_name' => $invoice->period?->name,
                    'last_payment_id' => $invoice->latestPayment?->id,
                    'last_paid_at' => optional($invoice->latestPayment?->paid_at)->format('Y-m-d H:i:s'),
                ];
            });

        $summary = DuesInvoice::query()
            ->join('payment_statuses', 'payment_statuses.id', '=', 'dues_invoices.payment_status_id')
            ->when($period, fn ($q) => $q->whereHas('period', fn ($p) => $p->where('period', $period)))
            ->when($divisionId, fn ($q) => $q->whereHas('member', fn ($m) => $m->where('division_id', $divisionId)))
            ->when($search, function ($q) use ($search) {
                $q->whereHas('member', function ($memberQuery) use ($search) {
                    $memberQuery->where('npa', 'like', "%{$search}%")
                        ->orWhere('full_name', 'like', "%{$search}%");
                });
            })
            ->selectRaw('LOWER(payment_statuses.code) as code, COUNT(*) as total')
            ->groupBy('payment_statuses.code')
            ->pluck('total', 'code');

        return Inertia::render('Dues/Index', [
            'invoices' => $invoices,
            'summary' => [
                'paid' => $summary->get('paid', 0),
                'unpaid' => $summary->get('unpaid', 0),
                'overdue' => $summary->get('overdue', 0),
            ],
            'periods' => \App\Models\DuesPeriod::query()
                ->orderByDesc('period')
                ->get(['id', 'period', 'name', 'start_date', 'end_date', 'due_date']),
            'divisions' => Division::query()->active()->orderBy('name')->get(['id', 'name']),
            'paymentStatuses' => PaymentStatus::query()->active()->orderBy('name')->get(['id', 'code', 'name', 'color']),
            'cashMethods' => CashMethod::query()->active()->orderBy('name')->get(['id', 'name']),
            'settings' => [
                'allow_partial' => DuesSetting::query()->value('allow_partial') ?? false,
            ],
            'filters' => [
                'search' => $search ?: null,
                'period' => $period,
                'status' => $status,
                'division_id' => $divisionId,
                'sortBy' => $sortBy,
                'sortDir' => $sortDir,
                'perPage' => $perPage,
            ],
        ]);
    }

    public function generatePeriodInvoices(GenerateDuesPeriodRequest $request, DuesInvoiceService $invoiceService): RedirectResponse
    {
        $type = $request->input('type');

        if ($type === 'monthly') {
            $period = $request->input('period');
            [$year, $month] = explode('-', $period);
            $invoiceService->generateMonthlyInvoices((int) $year, (int) $month);
        } else {
            $year = (int) $request->input('year');
            $invoiceService->generateYearlyInvoices($year);
        }

        return redirect()->back()->with('success', 'Tagihan iuran berhasil digenerate.');
    }

    public function storePayment(StoreDuesPaymentRequest $request, DuesInvoice $invoice, DuesPaymentService $paymentService): RedirectResponse
    {
        $cashMethod = CashMethod::query()->find($request->input('cash_method_id'));

        $payload = [
            'amount' => (int) $request->input('amount'),
            'paid_at' => $request->input('paid_at'),
            'cash_method_id' => $request->input('cash_method_id'),
            'payment_status_id' => $request->input('payment_status_id'),
            'method_label' => $cashMethod?->name,
            'notes' => $request->input('note'),
            'reference_no' => $request->input('reference_no'),
            'apply_to_year' => (bool) $request->input('apply_to_year'),
            'apply_year' => $request->input('apply_year'),
            'created_by' => $request->user()->id,
        ];

        try {
            $paymentService->applyPayment($invoice, $payload);
        } catch (\RuntimeException $exception) {
            return redirect()->back()->withErrors(['payment' => $exception->getMessage()]);
        }

        return redirect()->back()->with('success', 'Pembayaran iuran berhasil disimpan.');
    }

    public function memberInvoiceDetail(DuesInvoice $invoice): JsonResponse
    {
        $invoice->load(['member.division', 'period', 'paymentStatus', 'payments' => function ($query) {
            $query->orderByDesc('paid_at');
        }]);

        return response()->json([
            'invoice' => [
                'id' => $invoice->id,
                'period' => $invoice->period?->period,
                'period_name' => $invoice->period?->name,
                'due_date' => optional($invoice->due_date)->format('Y-m-d'),
                'amount_due' => $invoice->amount_due,
                'amount_paid' => $invoice->amount_paid,
                'status' => $invoice->paymentStatus?->code,
                'status_name' => $invoice->paymentStatus?->name,
                'member' => [
                    'npa' => $invoice->member?->npa,
                    'name' => $invoice->member?->full_name,
                    'division' => $invoice->member?->division?->name,
                ],
            ],
            'payments' => $invoice->payments->map(fn (DuesPayment $payment) => [
                'id' => $payment->id,
                'paid_at' => optional($payment->paid_at)->format('Y-m-d H:i'),
                'amount' => $payment->amount,
                'method' => $payment->method,
                'reference_no' => $payment->reference_no,
                'notes' => $payment->notes,
            ]),
        ]);
    }

    public function downloadReceipt(DuesPayment $payment): \Symfony\Component\HttpFoundation\Response
    {
        $payment->load(['invoice.period', 'member']);

        return response()
            ->view('dues.receipt', [
                'payment' => $payment,
                'invoice' => $payment->invoice,
                'period' => $payment->invoice?->period,
                'member' => $payment->member,
            ])
            ->header('Content-Type', 'text/html');
    } 
}
