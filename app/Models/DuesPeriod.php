<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DuesPeriod extends Model
{
    use HasFactory;

    protected $fillable = [
        'period',
        'name',
        'start_date',
        'end_date',
        'due_date',
        'default_amount',
        'is_closed',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'due_date' => 'date',
        'is_closed' => 'boolean',
    ];

    public function invoices(): HasMany
    {
        return $this->hasMany(DuesInvoice::class);
    }
}
