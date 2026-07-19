<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            // Keep the existing members.user_id relationship and enforce its
            // intended one-to-one cardinality for non-deleted members. A
            // virtual guard preserves the ability to reuse a link after a
            // member record is soft deleted.
            $table->unsignedBigInteger('active_user_link_id')
                ->nullable()
                ->virtualAs('case when deleted_at is null then user_id else null end');

            $table->unique('active_user_link_id', 'members_active_user_link_unique');
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropUnique('members_active_user_link_unique');
            $table->dropColumn('active_user_link_id');
        });
    }
};
