<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashTransaction extends Model
{
    use HasFactory;

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
}
