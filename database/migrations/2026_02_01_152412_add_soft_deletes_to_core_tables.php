<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('members', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('cash_transactions', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('cash_categories', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('cash_methods', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('divisions', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('positions', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('payment_statuses', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('letter_templates', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('letter_numbering_profiles', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('agendas', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('members', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('cash_transactions', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('cash_categories', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('cash_methods', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('divisions', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('positions', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('payment_statuses', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('letter_templates', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('letter_numbering_profiles', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('agendas', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
