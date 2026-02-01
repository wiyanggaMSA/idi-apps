<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DuesPaymentAllocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'dues_payment_id',
        'member_id',
        'period_ym',
        'amount',
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(DuesPayment::class, 'dues_payment_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
