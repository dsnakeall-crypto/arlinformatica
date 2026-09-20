<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_order_items', function (Blueprint $table) {
            $table->unsignedInteger('stock_applied_quantity')->default(0)->after('quantity');
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('service_catalog');
            $table->foreignId('service_order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained();
            $table->string('type', 30)->index();
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('balance_after');
            $table->string('reason', 500);
            $table->timestamps();
            $table->index(['product_id', 'created_at']);
            $table->index(['service_order_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        Schema::table('service_order_items', function (Blueprint $table) {
            $table->dropColumn('stock_applied_quantity');
        });
    }
};
