<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active_member')->default(false);
            $table->boolean('is_billable')->default(false);
            $table->boolean('is_deceased')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'sort_order']);
            $table->index('is_active_member');
            $table->index('is_billable');
        });

        DB::table('member_statuses')->insert([
            [
                'code' => 'aktif',
                'name' => 'Aktif',
                'sort_order' => 10,
                'is_active_member' => true,
                'is_billable' => true,
                'is_deceased' => false,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'mutasi',
                'name' => 'Mutasi',
                'sort_order' => 20,
                'is_active_member' => false,
                'is_billable' => false,
                'is_deceased' => false,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'meninggal',
                'name' => 'Meninggal',
                'sort_order' => 30,
                'is_active_member' => false,
                'is_billable' => false,
                'is_deceased' => true,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('member_statuses');
    }
};
