<?php

namespace App\Services\Cash;

use App\Models\CashMethod;
use App\Models\CashTransaction;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\URL;

class LedgerBalanceService
{
    public function openingBalance(Request $request, TransactionQueryService $queryService): int
    {
        $startDate = $request->input('start_date');
        if (! $startDate) {
            return 0;
        }

        $query = CashTransaction::query();
        $queryService->applyFilters($query, $request, false);

        $start = $queryService->startOfReportDay($startDate);
        $query->where('tx_date', '<', $start);

        return $this->netFromQuery($query);
    }

    public function openingBalanceByMethod(Request $request, TransactionQueryService $queryService): array
    {
        $startDate = $request->input('start_date');
        if (! $startDate) {
            return [];
        }

        $query = CashTransaction::query();
        $queryService->applyFilters($query, $request, false);

        $start = $queryService->startOfReportDay($startDate);
        $query->where('tx_date', '<', $start);

        return $query
            ->selectRaw('method_id, SUM(CASE WHEN type = "in" THEN amount ELSE 0 END) as total_in, SUM(CASE WHEN type = "out" THEN amount ELSE 0 END) as total_out')
            ->groupBy('method_id')
            ->get()
            ->mapWithKeys(function ($row) {
                $net = (int) $row->total_in - (int) $row->total_out;
                return [$row->method_id => $net];
            })
            ->all();
    }

    public function offsetBalance(Builder $sortedQuery, int $page, int $perPage): int
    {
        $offset = max(($page - 1) * $perPage, 0);

        if ($offset === 0) {
            return 0;
        }

        $priorRows = (clone $sortedQuery)
            ->limit($offset)
            ->get(['type', 'amount']);

        return $priorRows->reduce(function ($carry, $row) {
            $delta = $row->type === 'in' ? $row->amount : -$row->amount;
            return $carry + $delta;
        }, 0);
    }

    public function totals(Request $request, TransactionQueryService $queryService): array
    {
        $query = CashTransaction::query();
        $queryService->applyFilters($query, $request, true);

        $totals = $query->selectRaw('SUM(CASE WHEN type = "in" THEN amount ELSE 0 END) as total_in, SUM(CASE WHEN type = "out" THEN amount ELSE 0 END) as total_out')
            ->first();

        $totalIn = (int) ($totals->total_in ?? 0);
        $totalOut = (int) ($totals->total_out ?? 0);
        $netCash = $this->netCashOnly($query);

        return [
            'total_in' => $totalIn,
            'total_out' => $totalOut,
            'net' => $totalIn - $totalOut,
            'net_cash' => $netCash,
        ];
    }

    public function summaryForPage(
        Request $request,
        TransactionQueryService $queryService,
        Builder $sortedQuery,
        int $page,
        int $perPage,
        string $sortDir
    ): array {
        $openingBalance = $this->openingBalance($request, $queryService);
        $offsetBalance = $this->offsetBalance($sortedQuery, $page, $perPage);
        $summary = $this->totals($request, $queryService);
        $closingBalance = $openingBalance + ($summary['net'] ?? 0);
        $runningBalance = $sortDir === 'desc'
            ? $closingBalance - $offsetBalance
            : $openingBalance + $offsetBalance;

        return [
            'summary' => $summary,
            'opening_balance' => $openingBalance,
            'closing_balance' => $closingBalance,
            'running_balance_start' => $runningBalance,
        ];
    }

    public function decorateTransactions(Collection $transactions, int $runningBalance, string $sortDir, array $pendingVoidIds): Collection
    {
        return $transactions->map(function (CashTransaction $transaction) use (&$runningBalance, $sortDir, $pendingVoidIds) {
            $delta = $transaction->type === 'in' ? $transaction->amount : -$transaction->amount;
            $description = $transaction->description;

            if ($transaction->dues_payment_id && $transaction->member) {
                $memberLabel = $transaction->member->npa
                    ? sprintf('%s (%s)', $transaction->member->full_name, $transaction->member->npa)
                    : $transaction->member->full_name;
                $description = sprintf('Pembayaran iuran anggota %s', $memberLabel);
            }

            $rowRunningBalance = $sortDir === 'desc' ? $runningBalance : ($runningBalance += $delta);

            if ($sortDir === 'desc') {
                $runningBalance -= $delta;
            }

            return [
                'id' => $transaction->id,
                'tx_date' => optional($transaction->tx_date)->format('Y-m-d H:i:s'),
                'type' => $transaction->type,
                'category_id' => $transaction->category_id,
                'category' => $transaction->category?->name,
                'method_id' => $transaction->method_id,
                'method' => $transaction->method?->name,
                'amount' => $transaction->amount,
                'description' => $description,
                'reference_no' => $transaction->reference_no,
                'member_name' => $transaction->member?->full_name,
                'member_npa' => $transaction->member?->npa,
                'dues_payment_id' => $transaction->dues_payment_id,
                'source' => $transaction->dues_payment_id ? 'Iuran' : 'Manual',
                'attachment' => $transaction->attachmentDocument ? [
                    'id' => $transaction->attachmentDocument->id,
                    'title' => $transaction->attachmentDocument->title,
                    'url' => URL::temporarySignedRoute(
                        'transactions.attachments.show',
                        now()->addMinutes(10),
                        [
                            'transaction' => $transaction->id,
                            'document' => $transaction->attachmentDocument->id,
                        ]
                    ),
                    'download_url' => URL::temporarySignedRoute(
                        'transactions.attachments.show',
                        now()->addMinutes(10),
                        [
                            'transaction' => $transaction->id,
                            'document' => $transaction->attachmentDocument->id,
                            'download' => 1,
                        ]
                    ),
                    'mime_type' => $transaction->attachmentDocument->mime_type,
                    'size' => $transaction->attachmentDocument->size,
                ] : null,
                'running_balance' => $rowRunningBalance,
                'is_locked' => (bool) $transaction->dues_payment_id,
                'has_pending_void_request' => in_array((int) $transaction->id, $pendingVoidIds, true),
            ];
        });
    }

    private function netCashOnly(Builder $query): int
    {
        $cashMethodId = CashMethod::query()
            ->whereRaw('LOWER(name) in (?, ?)', ['cash', 'kas'])
            ->value('id');

        if (! $cashMethodId) {
            return 0;
        }

        $cashQuery = (clone $query)->where('method_id', $cashMethodId);

        return $this->netFromQuery($cashQuery);
    }

    private function netFromQuery(Builder $query): int
    {
        $totals = $query
            ->selectRaw('SUM(CASE WHEN type = "in" THEN amount ELSE 0 END) as total_in, SUM(CASE WHEN type = "out" THEN amount ELSE 0 END) as total_out')
            ->first();

        return (int) ($totals->total_in ?? 0) - (int) ($totals->total_out ?? 0);
    }
}
