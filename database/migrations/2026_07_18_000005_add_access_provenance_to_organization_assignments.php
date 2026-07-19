<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organization_assignments', function (Blueprint $table) {
            $table->boolean('role_was_preexisting')->default(false)->after('portal_role_id');
            $table->boolean('account_was_active')->default(false)->after('role_was_preexisting');
            $table->boolean('account_was_created')->default(false)->after('account_was_active');
            $table->timestamp('access_applied_at')->nullable()->after('account_was_created');
            $table->timestamp('access_revoked_at')->nullable()->after('access_applied_at');

            $table->index('access_applied_at');
            $table->index('access_revoked_at');
        });
    }

    public function down(): void
    {
        Schema::table('organization_assignments', function (Blueprint $table) {
            $table->dropIndex(['access_applied_at']);
            $table->dropIndex(['access_revoked_at']);
            $table->dropColumn([
                'role_was_preexisting',
                'account_was_active',
                'account_was_created',
                'access_applied_at',
                'access_revoked_at',
            ]);
        });
    }
};
