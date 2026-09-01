<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', fn (Blueprint $table) => $table->unique('service_order_id'));
        Schema::table('financial_transactions', function (Blueprint $table) {
            $table->string('description')->nullable()->after('origin');
            $table->index(['origin', 'occurred_at']);
        });
        Schema::table('generated_documents', fn (Blueprint $table) => $table->string('period', 7)->nullable()->after('type')->index());
    }

    public function down(): void
    {
        Schema::table('generated_documents', fn (Blueprint $table) => $table->dropColumn('period'));
        Schema::table('financial_transactions', function (Blueprint $table) {
            $table->dropIndex(['origin', 'occurred_at']);
            $table->dropColumn('description');
        });
        Schema::table('payments', fn (Blueprint $table) => $table->dropUnique(['service_order_id']));
    }
};
