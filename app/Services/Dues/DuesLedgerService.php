<?php

namespace App\Services\Dues;

use App\Actions\Dues\CalculateMemberDuesAction;
use App\Actions\Dues\ProcessDuesPaymentAction;
use App\Actions\Dues\VoidDuesPaymentAction;
use App\Models\CashMethod;
use App\Models\CashTransaction;
use App\Models\DuesPayment;
use App\Models\DuesPaymentAllocation;
use App\Models\DuesSetting;
use App\Models\DuesPeriod;
use App\Models\Member;
use App\Models\MemberStatus;
use Carbon\Carbon;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class DuesLedgerService
{
    private CalculateMemberDuesAction $calculateMemberDues;

    private ProcessDuesPaymentAction $processDuesPayment;

    private VoidDuesPaymentAction $voidDuesPayment;

    public function __construct(
        ?CalculateMemberDuesAction $calculateMemberDues = null,
        ?ProcessDuesPaymentAction $processDuesPayment = null,
        ?VoidDuesPaymentAction $voidDuesPayment = null
    ) {
        $this->calculateMemberDues = $calculateMemberDues ?? app(CalculateMemberDuesAction::class);
        $this->processDuesPayment = $processDuesPayment ?? app(ProcessDuesPaymentAction::class);
        $this->voidDuesPayment = $voidDuesPayment ?? app(VoidDuesPaymentAction::class);
    }

    public function activePeriod(): string
    {
        return max(now()->format('Y-m'), $this->duesStartPeriod());
    }

    public function duesStartPeriod(): string
    {
        $configured = (string) (DuesSetting::query()->value('dues_start_period') ?? '');
        if (preg_match('/^\d{4}-\d{2}$/', $configured) === 1) {
            return $configured;
        }

        $detectedStart = collect([
            DuesPeriod::query()->min('period'),
            DuesPaymentAllocation::query()->min('period_ym'),
        ])->filter()->min();

        if (is_string($detectedStart) && preg_match('/^\d{4}-\d{2}$/', $detectedStart) === 1) {
            return $detectedStart;
        }

        return now()->format('Y-m');
    }

    public function monthlyAmount(): int
    {
        return (int) (DuesSetting::query()->value('dues_amount') ?? 0);
    }

    public function buildIndexPayload(array $filters, int $page, int $perPage): array
    {
        $activePeriod = $this->activePeriod();
        $duesStartPeriod = $this->duesStartPeriod();
        $cacheKey = $this->cacheKey($activePeriod, $duesStartPeriod, $filters, $page, $perPage, $this->cacheVersion());

        return Cache::remember($cacheKey, 300, function () use ($filters, $page, $perPage, $activePeriod, $duesStartPeriod) {
            $monthlyAmount = $this->monthlyAmount();
            $billableStatusCodes = MemberStatus::query()
                ->active()
                ->billable()
                ->pluck('code');
            $members = Member::query()
                ->with('memberStatus')
                ->whereIn('status', $billableStatusCodes->isNotEmpty() ? $billableStatusCodes : collect(['aktif']))
                ->orderBy('full_name')
                ->get(['id', 'npa', 'full_name', 'status']);

            $latestPayments = $this->latestPaymentsByMember();
            $metrics = $this->buildMemberMetrics($members, $latestPayments, $duesStartPeriod, $activePeriod, $monthlyAmount);
            $metricsByMember = $metrics->keyBy('member_id');
            $filtered = $this->applyFilters($metrics, $filters)
                ->sortBy(fn (array $row) => Str::lower($row['full_name'] ?? ''))
                ->values();

            $paginator = $this->paginate($filtered, $page, $perPage, $filters);

            return [
                'active_period' => $activePeriod,
                'active_period_label' => Carbon::createFromFormat('Y-m', $activePeriod)->translatedFormat('F Y'),
                'dues_start_period' => $duesStartPeriod,
                'monthly_amount' => $monthlyAmount,
                'summary' => $this->buildSummary($metrics, $activePeriod, $monthlyAmount),
                'members' => $members->map(function (Member $member) use ($metricsByMember) {
                    $metric = $metricsByMember->get($member->id);

                    return [
                        'id' => $member->id,
                        'npa' => $member->npa,
                        'full_name' => $member->full_name,
                        'due_now' => $metric['due_now'] ?? null,
                    ];
                })->values(),
                'dues' => $this->buildPaginatorPayload($paginator),
            ];
        });
    }

    /**
     * @param Collection<int, Member> $members
     * @return Collection<int, array<string, mixed>>
     */
    private function buildMemberMetrics(
        Collection $members,
        Collection $latestPayments,
        string $duesStartPeriod,
        string $activePeriod,
        int $monthlyAmount
    ): Collection
    {
        return $this->calculateMemberDues->execute(
            $members,
            $latestPayments,
            $duesStartPeriod,
            $activePeriod,
            $monthlyAmount
        );
    }

    private function applyFilters(Collection $rows, array $filters): Collection
    {
        $search = Str::lower(trim((string) ($filters['search'] ?? '')));
        $status = strtoupper((string) ($filters['status'] ?? ''));
        $arrearsOnly = (bool) ($filters['arrears_only'] ?? false);
        $advanceOnly = (bool) ($filters['advance_only'] ?? false);

        return $rows->filter(function (array $row) use ($search, $status, $arrearsOnly, $advanceOnly) {
            if ($search !== '') {
                $haystack = Str::lower($row['npa'].' '.$row['full_name']);
                if (! str_contains($haystack, $search)) {
                    return false;
                }
            }

            if ($status !== '' && $status !== 'ALL' && $row['status'] !== $status) {
                return false;
            }

            if ($arrearsOnly && ($row['arrears_months'] ?? 0) < 1) {
                return false;
            }

            if ($advanceOnly && ($row['advance_months'] ?? 0) < 1) {
                return false;
            }

            return true;
        })->values();
    }

    private function paginate(Collection $rows, int $page, int $perPage, array $filters): LengthAwarePaginator
    {
        $total = $rows->count();
        $items = $rows->slice(($page - 1) * $perPage, $perPage)->values()->all();

        return new LengthAwarePaginator(
            $items,
            $total,
            $perPage,
            $page,
            [
                'path' => LengthAwarePaginator::resolveCurrentPath(),
                'query' => $filters,
            ]
        );
    }

    /**
     * @return array{data: array<int, mixed>, meta: array<string, int>}
     */
    private function buildPaginatorPayload(LengthAwarePaginator $paginator): array
    {
        return [
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ];
    }

    private function buildSummary(Collection $metrics, string $activePeriod, int $monthlyAmount): array
    {
        $totalMembers = $metrics->count();
        $paidCount = $metrics->filter(function (array $row) {
            return in_array(($row['status'] ?? ''), ['LUNAS', 'ADVANCE'], true);
        })->count();
        $arrearsTotal = $metrics->sum(fn (array $row) => $row['arrears_months'] * $monthlyAmount);

        return [
            'total_members' => $totalMembers,
            'paid_members' => $paidCount,
            'unpaid_members' => max($totalMembers - $paidCount, 0),
            'total_arrears' => $arrearsTotal,
        ];
    }

    private function cacheKey(string $activePeriod, string $duesStartPeriod, array $filters, int $page, int $perPage, string $version): string
    {
        $payload = array_merge($filters, [
            'duesStartPeriod' => $duesStartPeriod,
            'page' => $page,
            'perPage' => $perPage,
            'version' => $version,
        ]);

        return sprintf('dues:index:%s:%s', $activePeriod, md5(json_encode($payload)));
    }

    private function cacheVersion(): string
    {
        $allocationVersion = DuesPaymentAllocation::query()->max('updated_at') ?? '0';
        $allocationId = (int) (DuesPaymentAllocation::query()->max('id') ?? 0);
        $paymentVersion = DuesPayment::query()->max('updated_at') ?? '0';
        $paymentId = (int) (DuesPayment::query()->max('id') ?? 0);


        return sprintf('%s:%s:%s:%s', $allocationVersion, $allocationId, $paymentVersion, $paymentId);
    }


    private function latestPaymentsByMember(): Collection
    {
        return DuesPayment::query()
            ->leftJoin('cash_transactions', 'cash_transactions.dues_payment_id', '=', 'dues_payments.id')
            ->leftJoin('cash_methods', 'cash_methods.id', '=', 'cash_transactions.method_id')
            ->whereNull('dues_payments.voided_at')
            ->orderBy('dues_payments.member_id')
            ->orderBy('dues_payments.paid_at')
            ->orderBy('dues_payments.id')
            ->get([
                'dues_payments.member_id',
                'dues_payments.method',
                'cash_methods.name as method_name',
            ])
            ->groupBy('member_id')
            ->map(function (Collection $rows) {
                $latest = $rows->last();
                if (! $latest) {
                    return null;
                }

                return [
                    'method' => $latest->method,
                    'method_name' => $latest->method_name,
                ];
            })
            ->filter();
    }

    public function storePayment(array $payload, int $userId): DuesPayment
    {
        return $this->processDuesPayment->execute($payload, $userId);
    }

    public function updatePayment(DuesPayment $payment, array $payload, int $userId): DuesPayment
    {
        if ($payment->voided_at) {
            throw new \RuntimeException('Pembayaran sudah dibatalkan.');
        }

        $before = $this->paymentSnapshot($payment->fresh(['member', 'allocations']));

        $payment->update([
            'paid_at' => $payload['paid_at'],
            'method' => $payload['method'],
            'reference_no' => $payload['reference_no'] ?? null,
            'notes' => $payload['notes'] ?? null,
            'updated_by' => $userId,
            'last_action_note' => $payload['reason'],
        ]);

        $transaction = CashTransaction::query()->where('dues_payment_id', $payment->id)->first();
        if ($transaction) {
            $transaction->update([
                'tx_date' => $payload['paid_at'],
                'method_id' => $this->resolveCashMethodId($payload['method']),
                'reference_no' => $payload['reference_no'] ?? null,
                'updated_by' => $userId,
            ]);
        }

        activity('finance')
            ->causedBy($userId)
            ->performedOn($payment)
            ->withProperties([
                'reason' => $payload['reason'],
                'before' => $before,
                'after' => $this->paymentSnapshot($payment->fresh(['member', 'allocations'])),
            ])
            ->log('dues_payment.updated');

        return $payment;
    }

    public function voidPayment(DuesPayment $payment, string $reason, int $userId): DuesPayment
    {
        return $this->voidDuesPayment->execute($payment, $reason, $userId);
    }

    private function resolveCashMethodId(?string $method): ?int
    {
        if (! $method) {
            return null;
        }

        $cashMethod = CashMethod::query()
            ->whereRaw('LOWER(name) = ?', [strtolower($method)])
            ->first();

        return $cashMethod?->id;
    }

    private function paymentSnapshot(?DuesPayment $payment): array
    {
        if (! $payment) {
            return [];
        }

        $cashTransaction = CashTransaction::query()
            ->where('dues_payment_id', $payment->id)
            ->first(['id', 'transaction_number', 'voided_at']);

        return [
            'id' => $payment->id,
            'member_id' => $payment->member_id,
            'member_name' => $payment->member?->full_name,
            'paid_at' => optional($payment->paid_at)->format('Y-m-d H:i:s'),
            'amount' => $payment->amount,
            'method' => $payment->method,
            'reference_no' => $payment->reference_no,
            'notes' => $payment->notes,
            'periods' => $payment->allocations?->pluck('period_ym')->values(),
            'voided_at' => optional($payment->voided_at)->format('Y-m-d H:i:s'),
            'void_reason' => $payment->void_reason,
            'cash_transaction_id' => $cashTransaction?->id,
            'cash_transaction_number' => $cashTransaction?->transaction_number,
            'cash_transaction_voided_at' => optional($cashTransaction?->voided_at)->format('Y-m-d H:i:s'),
        ];
    }
}
