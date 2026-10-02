<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('trade_name')->nullable();
            $t->string('document', 14)->nullable()->unique();
            $t->string('contact_name')->nullable();
            $t->string('phone', 30)->nullable();
            $t->string('email')->nullable();
            $t->string('postal_code', 8)->nullable();
            $t->string('street')->nullable();
            $t->string('number', 30)->nullable();
            $t->string('district')->nullable();
            $t->string('city')->nullable();
            $t->string('state', 2)->nullable();
            $t->string('complement')->nullable();
            $t->text('notes')->nullable();
            $t->boolean('active')->default(true);
            $t->timestamps();
            $t->index(['active', 'name']);
        });
        Schema::create('supplier_purchases', function (Blueprint $t) {
            $t->id();
            $t->foreignId('supplier_id')->constrained();
            $t->foreignId('user_id')->constrained();
            $t->uuid('request_key')->unique();
            $t->string('payload_hash', 64);
            $t->json('supplier_snapshot');
            $t->date('purchased_on');
            $t->date('expected_on')->nullable();
            $t->string('reference', 100)->nullable();
            $t->text('notes')->nullable();
            $t->string('status', 30)->default('pending');
            $t->unsignedBigInteger('total_cents');
            $t->string('cancellation_reason', 500)->nullable();
            $t->timestamp('cancelled_at')->nullable();
            $t->timestamps();
            $t->index(['supplier_id', 'id']);
            $t->index('status');
        });
        Schema::create('supplier_purchase_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('purchase_id')->constrained('supplier_purchases');
            $t->foreignId('product_id')->constrained('service_catalog');
            $t->string('description');
            $t->unsignedInteger('quantity');
            $t->unsignedInteger('received_quantity')->default(0);
            $t->unsignedBigInteger('unit_cost_cents');
            $t->unsignedBigInteger('subtotal_cents');
            $t->timestamps();
            $t->unique(['purchase_id', 'product_id']);
        });
        Schema::create('supplier_purchase_receipts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('purchase_id')->constrained('supplier_purchases');
            $t->foreignId('user_id')->constrained();
            $t->uuid('request_key');
            $t->string('payload_hash', 64);
            $t->date('received_on');
            $t->json('items');
            $t->string('notes', 500)->nullable();
            $t->timestamps();
            $t->unique(['purchase_id', 'request_key']);
        });
        Schema::create('stock_entry_details', function (Blueprint $t) {
            $t->id();
            $t->foreignId('stock_movement_id')->unique()->constrained('stock_movements');
            $t->foreignId('supplier_id')->nullable()->constrained();
            $t->foreignId('purchase_item_id')->nullable()->constrained('supplier_purchase_items');
            $t->foreignId('receipt_id')->nullable()->constrained('supplier_purchase_receipts');
            $t->uuid('request_key')->nullable()->unique();
            $t->string('origin', 30);
            $t->unsignedBigInteger('unit_cost_cents')->nullable();
            $t->json('supplier_snapshot')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['stock_entry_details', 'supplier_purchase_receipts', 'supplier_purchase_items', 'supplier_purchases', 'suppliers'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
