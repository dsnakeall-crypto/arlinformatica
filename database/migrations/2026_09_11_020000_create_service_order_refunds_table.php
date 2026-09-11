<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_order_refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_order_id')->constrained()->restrictOnDelete();
            $table->foreignId('financial_transaction_id')->unique()->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('amount_cents');
            $table->string('reason', 1000);
            $table->string('method', 30);
            $table->timestamp('refunded_at')->index();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->index(['service_order_id', 'refunded_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_order_refunds');
    }
};
