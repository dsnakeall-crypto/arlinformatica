<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budgets', function (Blueprint $table) {
            $table->text('observation')->nullable()->after('proposal');
            $table->string('institutional_text', 1000)->nullable()->after('observation');
            $table->string('status', 20)->default('draft')->change();
            $table->foreignId('decided_by')->nullable()->after('decided_at')->constrained('users');
            $table->text('decision_note')->nullable()->after('decided_by');
            $table->json('snapshot')->nullable()->after('decision_note');
        });
        Schema::table('budget_items', function (Blueprint $table) {
            $table->foreignId('catalog_id')->nullable()->after('budget_id')->constrained('service_catalog')->nullOnDelete();
            $table->json('warranty_snapshot')->nullable()->after('subtotal_cents');
        });
    }

    public function down(): void
    {
        Schema::table('budget_items', fn (Blueprint $table) => $table->dropConstrainedForeignId('catalog_id'));
        Schema::table('budgets', fn (Blueprint $table) => $table->dropConstrainedForeignId('decided_by'));
    }
};
