<?php

namespace App\Services\Dues;

use App\Models\CashCategory;
use App\Models\CashMethod;
use App\Models\CashTransaction;
use App\Models\DuesPayment;
use App\Models\DuesPaymentAllocation;
use App\Models\DuesSetting;
use App\Models\Member;
use Carbon\Carbon;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DuesLedgerService
{
    public const GO_LIVE_PERIOD = '2026-01';

    public function activePeriod(): string
    {
        return now()->format('Y-m');
    }

    public function monthlyAmount(): int
    {
        return (int) (DuesSetting::query()->value('dues_amount') ?? 0);
    }

    public function buildIndexPayload(array $filters, int $page, int $perPage): array
    {
        $activePeriod = $this->activePeriod();
        $cacheKey = $this->cacheKey($activePeriod, $filters, $page, $perPage, $this->cacheVersion());

        return Cache::remember($cacheKey, 300, function () use ($filters, $page, $perPage, $activePeriod) {
            $monthlyAmount = $this->monthlyAmount();
            $members = Member::query()
                ->where('status', 'aktif')
                ->orderBy('full_name')
                ->get(['id', 'npa', 'full_name', 'status']);

            $latestPayments = $this->latestPaymentsByMember();
            $metrics = $this->buildMemberMetrics($members, $latestPayments, $activePeriod, $monthlyAmount);
            $metricsByMember = $metrics->keyBy('member_id');
            $filtered = $this->applyFilters($metrics, $filters);

            $paginator = $this->paginate($filtered, $page, $perPage, $filters);

            return [
                'active_period' => $activePeriod,
                'active_period_label' => Carbon::createFromFormat('Y-m', $activePeriod)->translatedFormat('F Y'),
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
    private function buildMemberMetrics(Collection $members, Collection $latestPayments, string $activePeriod, int $monthlyAmount): Collection
    {
        $allocationRows = DuesPaymentAllocation::query()
            ->select('dues_payment_allocations.member_id', 'dues_payment_allocations.period_ym')
            ->join('dues_payments', 'dues_payments.id', '=', 'dues_payment_allocations.dues_payment_id')
            ->whereNull('dues_payments.voided_at')
            ->where('dues_payment_allocations.period_ym', '>=', self::GO_LIVE_PERIOD)
            ->orderBy('dues_payment_allocations.member_id')
            ->orderBy('dues_payment_allocations.period_ym')
            ->get()
            ->groupBy('member_id');

        return $members->map(function (Member $member) use ($allocationRows, $latestPayments, $activePeriod, $monthlyAmount) {
            $periods = $allocationRows->get($member->id, collect())
                ->pluck('period_ym')
                ->unique()
                ->values();

            $lastPaidPeriod = $periods->max();
            $paidThrough = $this->computePaidThrough($periods);
            $dueNow = $this->computeDueNow($periods, $activePeriod);
            $arrears = $this->computeArrearsMonths($periods, $activePeriod);
            $advance = $this->computeAdvanceMonths($periods, $activePeriod);
            $status = $this->resolveStatus($arrears, $advance);
            $latestPayment = $latestPayments->get($member->id);

            return [
                'member_id' => $member->id,
                'npa' => $member->npa,
                'full_name' => $member->full_name,
                'member_status' => $member->status,
                'last_payment_method' => $latestPayment['method_name'] ?? $latestPayment['method'] ?? null,
                'last_payment_method_raw' => $latestPayment['method'] ?? null,
                'last_paid_period' => $lastPaidPeriod,
                'paid_through' => $paidThrough,
                'paid_through_label' => $paidThrough ?? '—',
                'due_now' => $dueNow,
                'due_now_label' => $dueNow ?? '—',
                'arrears_months' => $arrears,
                'advance_months' => $advance,
                'status' => $status,
                'total_arrears_amount' => $arrears * $monthlyAmount,
            ];
        });
    }

    private function computePaidThrough(Collection $periods): ?string
    {
        if ($periods->isEmpty()) {
            return null;
        }

        $periodSet = array_fill_keys($periods->all(), true);
        $cursor = Carbon::createFromFormat('Y-m', self::GO_LIVE_PERIOD)->startOfMonth();
        $last = null;

        for ($i = 0; $i < 240; $i++) {
            $key = $cursor->format('Y-m');
            if (! isset($periodSet[$key])) {
                break;
            }
            $last = $key;
            $cursor->addMonth();
        }

        return $last;
    }

    private function computeDueNow(Collection $periods, string $activePeriod): ?string
    {
        $periodSet = array_fill_keys($periods->all(), true);
        $cursor = Carbon::createFromFormat('Y-m', self::GO_LIVE_PERIOD)->startOfMonth();
        $end = Carbon::createFromFormat('Y-m', $activePeriod)->startOfMonth();

        while ($cursor <= $end) {
            $key = $cursor->format('Y-m');
            if (! isset($periodSet[$key])) {
                return $key;
            }
            $cursor->addMonth();
        }

        if ($periods->isNotEmpty()) {
            return Carbon::createFromFormat('Y-m', $periods->max())
                ->addMonth()
                ->format('Y-m');
        }

        return self::GO_LIVE_PERIOD;
    }

    private function computeArrearsMonths(Collection $periods, string $activePeriod): int
    {
        $periodSet = array_fill_keys($periods->all(), true);
        $cursor = Carbon::createFromFormat('Y-m', self::GO_LIVE_PERIOD)->startOfMonth();
        $end = Carbon::createFromFormat('Y-m', $activePeriod)->startOfMonth();
        $count = 0;

        while ($cursor <= $end) {
            $key = $cursor->format('Y-m');
            if (! isset($periodSet[$key])) {
                $count++;
            }
            $cursor->addMonth();
        }

        return $count;
    }

    private function computeAdvanceMonths(Collection $periods, string $activePeriod): int
    {
        return $periods->filter(fn (string $period) => $period > $activePeriod)->count();
    }

    private function resolveStatus(int $arrears, int $advance): string
    {
        if ($arrears > 0) {
            return 'MENUNGGAK';
        }

        if ($advance > 0) {
            return 'ADVANCE';
        }

        return 'LUNAS';
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
            return ($row['arrears_months'] ?? 0) === 0;
        })->count();
        $arrearsTotal = $metrics->sum(fn (array $row) => $row['arrears_months'] * $monthlyAmount);

        return [
            'total_members' => $totalMembers,
            'paid_members' => $paidCount,
            'unpaid_members' => max($totalMembers - $paidCount, 0),
            'total_arrears' => $arrearsTotal,
        ];
    }

    private function cacheKey(string $activePeriod, array $filters, int $page, int $perPage, string $version): string
    {
        $payload = array_merge($filters, [
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
        $memberId = (int) $payload['member_id'];
        $startPeriod = $payload['start_period'];
        $duration = (int) $payload['duration'];
        $monthlyAmount = $this->monthlyAmount();
        $endPeriod = Carbon::createFromFormat('Y-m', $startPeriod)->addMonths($duration - 1)->format('Y-m');
        $activePeriod = $this->activePeriod();

        $existingPeriods = DuesPaymentAllocation::query()
            ->select('dues_payment_allocations.period_ym')
            ->join('dues_payments', 'dues_payments.id', '=', 'dues_payment_allocations.dues_payment_id')
            ->whereNull('dues_payments.voided_at')
            ->where('dues_payment_allocations.member_id', $memberId)
            ->pluck('dues_payment_allocations.period_ym')
            ->unique()
            ->values();

        $dueNow = $this->computeDueNow($existingPeriods, $activePeriod);
        if ($dueNow && $startPeriod !== $dueNow) {
            throw new \RuntimeException(sprintf(
                'Periode mulai harus mengikuti bulan iuran saat ini (%s).',
                $dueNow
            ));
        }

        $hasOverlap = DuesPaymentAllocation::query()
            ->join('dues_payments', 'dues_payments.id', '=', 'dues_payment_allocations.dues_payment_id')
            ->whereNull('dues_payments.voided_at')
            ->where('dues_payment_allocations.member_id', $memberId)
            ->whereBetween('dues_payment_allocations.period_ym', [$startPeriod, $endPeriod])
            ->exists();

        if ($hasOverlap) {
            throw new \RuntimeException('Periode yang dipilih sudah pernah dibayarkan. Pilih bulan yang belum terbayar.');
        }

        return DB::transaction(function () use ($payload, $memberId, $startPeriod, $duration, $monthlyAmount, $endPeriod, $userId) {
            $payment = DuesPayment::query()->create([
                'dues_invoice_id' => null,
                'member_id' => $memberId,
                'paid_at' => $payload['paid_at'],
                'amount' => $monthlyAmount * $duration,
                'method' => $payload['method'],
                'reference_no' => $payload['reference_no'] ?? null,
                'notes' => $payload['notes'] ?? null,
                'created_by' => $userId,
            ]);

            $allocations = [];
            $cursor = Carbon::createFromFormat('Y-m', $startPeriod)->startOfMonth();
            for ($i = 0; $i < $duration; $i++) {
                $allocations[] = [
                    'dues_payment_id' => $payment->id,
                    'member_id' => $memberId,
                    'period_ym' => $cursor->format('Y-m'),
                    'amount' => $monthlyAmount,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                $cursor->addMonth();
            }

            DuesPaymentAllocation::query()->insert($allocations);
            $this->syncCashTransaction($payment, $userId);

            return $payment;
        });
    }

    public function updatePayment(DuesPayment $payment, array $payload, int $userId): DuesPayment
    {
        if ($payment->voided_at) {
            throw new \RuntimeException('Pembayaran sudah dibatalkan.');
        }

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

        return $payment;
    }

    public function voidPayment(DuesPayment $payment, string $reason, int $userId): DuesPayment
    {
        if ($payment->voided_at) {
            throw new \RuntimeException('Pembayaran sudah dibatalkan.');
        }

        $payment->update([
            'voided_at' => now(),
            'void_reason' => $reason,
            'updated_by' => $userId,
        ]);

        $transaction = CashTransaction::query()->where('dues_payment_id', $payment->id)->first();
        if ($transaction) {
            $transaction->update([
                'voided_at' => now(),
                'voided_by' => $userId,
            ]);
        }

        return $payment;
    }

    private function syncCashTransaction(DuesPayment $payment, int $userId): void
    {
        $category = $this->resolveCashCategory();
        $methodId = $this->resolveCashMethodId($payment->method);

        CashTransaction::query()->create([
            'tx_date' => $payment->paid_at,
            'type' => 'in',
            'category_id' => $category->id,
            'method_id' => $methodId,
            'amount' => $payment->amount,
            'description' => sprintf('Pembayaran iuran anggota #%s', $payment->member_id),
            'reference_no' => $payment->reference_no,
            'member_id' => $payment->member_id,
            'dues_payment_id' => $payment->id,
            'created_by' => $userId,
        ]);
    }

    private function resolveCashCategory(): CashCategory
    {
        $category = CashCategory::query()
            ->where('is_active', true)
            ->where('type', 'in')
            ->where(function ($query) {
                $query->whereRaw('LOWER(code) = ?', ['dues'])
                    ->orWhereRaw('LOWER(name) = ?', ['iuran']);
            })
            ->first();

        if (! $category) {
            $category = CashCategory::query()
                ->where('is_active', true)
                ->where('type', 'in')
                ->orderBy('id')
                ->first();
        }

        if (! $category) {
            throw new \RuntimeException('Kategori kas untuk iuran belum tersedia.');
        }

        return $category;
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
}
