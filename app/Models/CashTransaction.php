<?php

namespace App\Models;

use App\Services\Cash\TransactionNumberService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CashTransaction extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tx_date',
        'type',
        'category_id',
        'method_id',
        'amount',
        'description',
        'reference_no',
        'member_id',
        'dues_payment_id',
        'attachment_document_id',
        'created_by',
        'updated_by',
        'voided_at',
        'voided_by',
    ];

    protected $casts = [
        'tx_date' => 'datetime',
        'voided_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (CashTransaction $transaction) {
            if (! $transaction->transaction_number) {
                $transaction->transaction_number = app(TransactionNumberService::class)
                    ->generate($transaction->tx_date);
            }
        });
    }

    public function scopeValidForFinance(Builder $query): Builder
    {
        return $query->whereNull($this->qualifyColumn('voided_at'));
    }

    public function scopeValid(Builder $query): Builder
    {
        return $query->validForFinance();
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function duesPayment(): BelongsTo
    {
        return $this->belongsTo(DuesPayment::class, 'dues_payment_id');
    }

    public function method(): BelongsTo
    {
        return $this->belongsTo(CashMethod::class, 'method_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(CashCategory::class, 'category_id');
    }

    public function attachmentDocument(): BelongsTo
    {
        return $this->belongsTo(Document::class, 'attachment_document_id');
    }
}
