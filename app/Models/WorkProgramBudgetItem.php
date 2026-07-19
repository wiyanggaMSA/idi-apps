<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkProgramBudgetItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'work_program_id',
        'category',
        'description',
        'quantity',
        'unit',
        'unit_cost',
        'estimated_amount',
        'realized_amount',
        'budget_source',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_cost' => 'decimal:2',
        'estimated_amount' => 'decimal:2',
        'realized_amount' => 'decimal:2',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(WorkProgram::class, 'work_program_id');
    }
}
