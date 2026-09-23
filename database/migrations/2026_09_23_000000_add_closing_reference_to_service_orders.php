<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('closing_reference_cents')->nullable()->after('total_cents');
            $table->foreignId('closing_marked_by')->nullable()->after('closing_reference_cents')->constrained('users')->nullOnDelete();
            $table->timestamp('closing_marked_at')->nullable()->after('closing_marked_by');
        });
    }

    public function down(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            $table->dropForeign(['closing_marked_by']);
            $table->dropColumn(['closing_reference_cents', 'closing_marked_by', 'closing_marked_at']);
        });
    }
};
