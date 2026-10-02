<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->string('whatsapp', 11)->nullable();
            $table->string('landline', 10)->nullable();
        });
        Schema::table('supplier_purchases', function (Blueprint $table) {
            $table->string('payment_terms', 30)->nullable();
            $table->string('payment_method', 30)->nullable();
        });
        Schema::create('supplier_payables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained('supplier_purchases');
            $table->unsignedSmallInteger('installment');
            $table->unsignedBigInteger('amount_cents');
            $table->date('due_on')->index();
            $table->date('paid_on')->nullable();
            $table->string('paid_method', 30)->nullable();
            $table->foreignId('paid_by')->nullable()->constrained('users');
            $table->string('payment_reference', 255)->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->string('void_reason', 500)->nullable();
            $table->timestamps();
            $table->unique(['purchase_id', 'installment']);
        });
        Schema::create('supplier_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained('supplier_purchases');
            $table->foreignId('user_id')->constrained('users');
            $table->uuid('request_key')->unique();
            $table->string('path');
            $table->string('original_name');
            $table->string('mime', 100);
            $table->unsignedInteger('bytes');
            $table->string('sha256', 64);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_invoices');
        Schema::dropIfExists('supplier_payables');
        Schema::table('supplier_purchases', fn (Blueprint $table) => $table->dropColumn(['payment_terms', 'payment_method']));
        Schema::table('suppliers', fn (Blueprint $table) => $table->dropColumn(['whatsapp', 'landline']));
    }
};
