<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DuesInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'dues_period_id',
        'member_id',
        'amount_due',
        'amount_paid',
        'payment_status_id',
        'due_date',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'due_date' => 'date',
        'paid_at' => 'datetime',
    ];

    public function period(): BelongsTo
    {
        return $this->belongsTo(DuesPeriod::class, 'dues_period_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function paymentStatus(): BelongsTo
    {
        return $this->belongsTo(PaymentStatus::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(DuesPayment::class);
    }

    public function latestPayment(): HasOne
    {
        return $this->hasOne(DuesPayment::class)->latestOfMany();
    }
}
