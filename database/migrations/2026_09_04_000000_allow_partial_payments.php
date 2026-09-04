<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique(['service_order_id']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->index('service_order_id');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['service_order_id']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->unique('service_order_id');
        });
    }
};
