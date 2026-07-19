<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('positions', function (Blueprint $table) {
            $table->text('description')->nullable()->after('code');
            $table->unsignedSmallInteger('level')->default(0)->after('description');
            $table->unsignedInteger('display_order')->default(0)->after('level');
            $table->boolean('is_leadership')->default(false)->after('display_order');

            $table->index(['is_active', 'display_order'], 'positions_active_display_order_index');
            $table->index(['is_leadership', 'level'], 'positions_leadership_level_index');
        });
    }

    public function down(): void
    {
        Schema::table('positions', function (Blueprint $table) {
            $table->dropIndex('positions_active_display_order_index');
            $table->dropIndex('positions_leadership_level_index');
            $table->dropColumn([
                'description',
                'level',
                'display_order',
                'is_leadership',
            ]);
        });
    }
};
