<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_catalog', function (Blueprint $table) {
            $table->boolean('free_price')->default(false)->after('price_cents');
        });
    }

    public function down(): void
    {
        // A coluna é preservada para não apagar a configuração dos serviços.
    }
};
