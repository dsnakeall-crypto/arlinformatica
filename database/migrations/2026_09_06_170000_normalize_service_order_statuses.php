<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('service_orders')
            ->where('status', 'in_service')
            ->update(['status' => 'analysis']);
    }

    public function down(): void
    {
        // Conversão intencionalmente irreversível: não recriamos o status legado "Em Serviço".
    }
};
