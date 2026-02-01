<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->string('sip_1')->nullable()->after('status');
            $table->string('sip_2')->nullable()->after('sip_1');
            $table->string('sip_3')->nullable()->after('sip_2');
        });

        DB::table('members')
            ->where('status', 'active')
            ->update(['status' => 'aktif']);

        DB::table('members')
            ->whereIn('status', ['inactive', 'leave', 'alumni'])
            ->update(['status' => 'mutasi']);
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn(['sip_1', 'sip_2', 'sip_3']);
        });
    }
};
