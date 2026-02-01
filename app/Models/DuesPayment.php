<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DuesPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'dues_invoice_id',
        'member_id',
        'paid_at',
        'amount',
        'method',
        'reference_no',
        'notes',
        'created_by',
        'updated_by',
        'voided_at',
        'void_reason',
        'last_action_note',
    ];

    protected $casts = [
        'paid_at' => 'datetime',
        'voided_at' => 'datetime',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(DuesInvoice::class, 'dues_invoice_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function allocations(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(DuesPaymentAllocation::class, 'dues_payment_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
