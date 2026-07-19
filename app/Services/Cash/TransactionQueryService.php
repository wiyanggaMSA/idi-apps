<?php

namespace App\Services\Cash;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class TransactionQueryService
{
    public function applyFilters(Builder $query, Request $request, bool $includeDateRange = true): Builder
    {
        $query->validForFinance();

        $type = $request->input('type');
        $categoryId = $request->input('category_id');
        $methodId = $request->input('method_id');
        $search = trim((string) $request->input('search'));
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        if ($type && in_array($type, ['in', 'out'], true)) {
            $query->where('type', $type);
        }

        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }

        if ($methodId) {
            $query->where('method_id', $methodId);
        }

        if ($includeDateRange && ($startDate || $endDate)) {
            $start = $startDate ? $this->startOfReportDay($startDate) : null;
            $end = $endDate ? $this->endOfReportDay($endDate) : null;

            if ($start && $end) {
                $query->whereBetween('tx_date', [$start, $end]);
            } elseif ($start) {
                $query->where('tx_date', '>=', $start);
            } elseif ($end) {
                $query->where('tx_date', '<=', $end);
            }
        }

        if ($search !== '') {
            $query->where(function (Builder $sub) use ($search) {
                $sub->where('description', 'like', "%{$search}%")
                    ->orWhere('reference_no', 'like', "%{$search}%")
                    ->orWhereHas('member', function (Builder $memberQuery) use ($search) {
                        $memberQuery->where('npa', 'like', "%{$search}%")
                            ->orWhere('full_name', 'like', "%{$search}%");
                    });
            });
        }

        return $query;
    }

    public function applySorting(Builder $query, ?string $sortBy, ?string $sortDir): Builder
    {
        $allowedSorts = [
            'tx_date',
            'amount',
            'type',
            'category',
            'method',
            'created_at',
        ];

        if (! in_array($sortBy, $allowedSorts, true)) {
            $sortBy = 'tx_date';
        }

        if (! in_array($sortDir, ['asc', 'desc'], true)) {
            $sortDir = 'desc';
        }

        if ($sortBy === 'category') {
            $query->orderBy(
                \App\Models\CashCategory::select('name')
                    ->whereColumn('cash_categories.id', 'cash_transactions.category_id'),
                $sortDir
            );
        } elseif ($sortBy === 'method') {
            $query->orderBy(
                \App\Models\CashMethod::select('name')
                    ->whereColumn('cash_methods.id', 'cash_transactions.method_id'),
                $sortDir
            );
        } elseif ($sortBy === 'tx_date') {
            $query->orderBy('tx_date', $sortDir);

            if ($sortDir === 'asc') {
                $query->orderByRaw(
                    "CASE WHEN category_id IN (
                        SELECT id FROM cash_categories
                        WHERE LOWER(name) IN ('pre-saldo', 'presaldo', 'saldo awal')
                    ) THEN 0 ELSE 1 END ASC"
                );
            }

            $query
                ->orderBy('created_at', $sortDir);
        } else {
            $query->orderBy($sortBy, $sortDir);
        }

        return $query->orderBy('id', $sortDir);
    }

    public function startOfReportDay(string $date): Carbon
    {
        return Carbon::parse($date, $this->reportTimezone())->startOfDay();
    }

    public function endOfReportDay(string $date): Carbon
    {
        return Carbon::parse($date, $this->reportTimezone())->endOfDay();
    }

    public function reportTimezone(): string
    {
        return config('finance.reporting_timezone') ?: 'Asia/Jakarta';
    }
}
