<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL usa o índice unique existente para sustentar a FK. Criamos primeiro
        // um índice comum equivalente para que a remoção do unique seja segura.
        Schema::table('payments', function (Blueprint $table) {
            $table->index('service_order_id', 'payments_service_order_id_partial_index');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique(['service_order_id']);
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->unique('service_order_id');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex('payments_service_order_id_partial_index');
        });
    }
};
