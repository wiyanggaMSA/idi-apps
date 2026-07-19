<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkProgramEvaluation extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_program_id',
        'result_summary',
        'objective_achievement',
        'indicator_result',
        'target_vs_realization',
        'time_evaluation',
        'budget_result',
        'constraints',
        'supporting_factors',
        'inhibiting_factors',
        'lessons_learned',
        'recommendations',
        'follow_up',
        'report_document_id',
        'evaluated_by',
        'evaluated_at',
    ];

    protected $casts = [
        'evaluated_at' => 'datetime',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(WorkProgram::class, 'work_program_id');
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluated_by');
    }

    public function reportDocument(): BelongsTo
    {
        return $this->belongsTo(Document::class, 'report_document_id');
    }
}
