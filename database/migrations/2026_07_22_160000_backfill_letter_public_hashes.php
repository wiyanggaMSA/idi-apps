<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('letters')
            ->whereNull('public_hash')
            ->orderBy('id')
            ->eachById(function (object $letter): void {
                DB::table('letters')
                    ->where('id', $letter->id)
                    ->update(['public_hash' => (string) Str::uuid()]);
            });
    }

    public function down(): void
    {
        // Public verification tokens remain stable after deployment.
    }
};
