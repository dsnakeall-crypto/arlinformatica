<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            $table->foreignId('reopened_from_order_id')
                ->nullable()
                ->after('client_id')
                ->constrained('service_orders')
                ->nullOnDelete();
            $table->string('reopen_type', 40)->nullable()->after('reopened_from_order_id')->index();
            $table->text('reopen_note')->nullable()->after('reopen_type');
        });
    }

    public function down(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reopened_from_order_id');
            $table->dropColumn(['reopen_type', 'reopen_note']);
        });
    }
};
