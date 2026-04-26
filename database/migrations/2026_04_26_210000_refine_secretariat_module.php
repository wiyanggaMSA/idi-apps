<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('letter_templates', function (Blueprint $table) {
            if (! Schema::hasColumn('letter_templates', 'number_format')) {
                $table->string('number_format')->default('{number}/IDI-PWK/{roman_month}/{year}')->after('classification');
            }
            if (! Schema::hasColumn('letter_templates', 'number_reset_policy')) {
                $table->string('number_reset_policy', 20)->default('yearly')->after('number_format');
            }
            if (! Schema::hasColumn('letter_templates', 'last_number')) {
                $table->unsignedInteger('last_number')->default(0)->after('number_reset_policy');
            }
            if (! Schema::hasColumn('letter_templates', 'signer_name')) {
                $table->string('signer_name')->nullable()->after('placeholders_schema_json');
            }
            if (! Schema::hasColumn('letter_templates', 'signer_title')) {
                $table->string('signer_title')->nullable()->after('signer_name');
            }
            if (! Schema::hasColumn('letter_templates', 'signature_enabled')) {
                $table->boolean('signature_enabled')->default(true)->after('signer_title');
            }
            if (! Schema::hasColumn('letter_templates', 'qr_enabled')) {
                $table->boolean('qr_enabled')->default(true)->after('signature_enabled');
            }
        });

        Schema::table('letter_sequences', function (Blueprint $table) {
            if (! Schema::hasColumn('letter_sequences', 'letter_template_id')) {
                $table->foreignId('letter_template_id')
                    ->nullable()
                    ->after('numbering_profile_id')
                    ->constrained('letter_templates')
                    ->cascadeOnDelete();
            }
        });

        Schema::table('documents', function (Blueprint $table) {
            if (! Schema::hasColumn('documents', 'document_number')) {
                $table->string('document_number')->nullable()->after('category');
            }
            if (! Schema::hasColumn('documents', 'document_date')) {
                $table->date('document_date')->nullable()->after('document_number');
            }
            if (! Schema::hasColumn('documents', 'description')) {
                $table->text('description')->nullable()->after('size');
            }
            if (! Schema::hasColumn('documents', 'source')) {
                $table->string('source', 30)->default('manual')->after('description');
            }
            if (! Schema::hasColumn('documents', 'disk')) {
                $table->string('disk', 30)->default('public')->after('source');
            }
            if (! Schema::hasColumn('documents', 'original_name')) {
                $table->string('original_name')->nullable()->after('disk');
            }
        });

        Schema::table('letters', function (Blueprint $table) {
            if (! Schema::hasColumn('letters', 'archived_at')) {
                $table->timestamp('archived_at')->nullable()->after('is_revoked');
            }
            if (! Schema::hasColumn('letters', 'finalized_at')) {
                $table->timestamp('finalized_at')->nullable()->after('archived_at');
            }
        });

        Schema::table('agendas', function (Blueprint $table) {
            if (! Schema::hasColumn('agendas', 'status')) {
                $table->string('status', 20)->default('planned')->after('type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('agendas', function (Blueprint $table) {
            $table->dropColumn('status');
        });

        Schema::table('letters', function (Blueprint $table) {
            $table->dropColumn(['archived_at', 'finalized_at']);
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn([
                'document_number',
                'document_date',
                'description',
                'source',
                'disk',
                'original_name',
            ]);
        });

        Schema::table('letter_sequences', function (Blueprint $table) {
            $table->dropConstrainedForeignId('letter_template_id');
        });

        Schema::table('letter_templates', function (Blueprint $table) {
            $table->dropColumn([
                'number_format',
                'number_reset_policy',
                'last_number',
                'signer_name',
                'signer_title',
                'signature_enabled',
                'qr_enabled',
            ]);
        });
    }
};
