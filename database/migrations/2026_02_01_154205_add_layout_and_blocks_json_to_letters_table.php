<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('letters', function (Blueprint $table) {
            $table->json('layout_json')->nullable()->after('content_blocks_json');
            $table->json('blocks_json')->nullable()->after('layout_json');
        });
    }

    public function down(): void
    {
        Schema::table('letters', function (Blueprint $table) {
            $table->dropColumn(['layout_json', 'blocks_json']);
        });
    }
};
