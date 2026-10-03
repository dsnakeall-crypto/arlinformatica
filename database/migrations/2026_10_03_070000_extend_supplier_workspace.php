<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supplier_payables', function (Blueprint $t) {
            $t->unsignedBigInteger('interest_cents')->default(0);
            $t->unsignedBigInteger('discount_cents')->default(0);
        });
        Schema::table('suppliers', fn (Blueprint $t) => $t->json('profile')->nullable());
        Schema::table('supplier_purchase_items', function (Blueprint $t) {
            $t->string('lot', 80)->nullable();
        });
        Schema::create('supplier_offerings', function (Blueprint $t) {
            $t->id();
            $t->foreignId('supplier_id')->constrained();
            $t->foreignId('product_id')->constrained('service_catalog');
            $t->string('supplier_code', 80)->nullable();
            $t->string('brand', 100)->nullable();
            $t->unsignedBigInteger('cost_cents')->nullable();
            $t->unsignedInteger('minimum_quantity')->default(1);
            $t->unsignedInteger('delivery_days')->nullable();
            $t->boolean('active')->default(true);
            $t->timestamps();
            $t->unique(['supplier_id', 'product_id']);
        });
        Schema::create('supplier_documents', function (Blueprint $t) {
            $t->id();
            $t->foreignId('supplier_id')->constrained();
            $t->foreignId('purchase_id')->nullable()->constrained('supplier_purchases');
            $t->foreignId('user_id')->constrained();
            $t->uuid('request_key')->unique();
            $t->string('category', 30);
            $t->string('path');
            $t->string('original_name');
            $t->string('mime', 100);
            $t->unsignedBigInteger('bytes');
            $t->string('sha256', 64);
            $t->timestamps();
        });
        Schema::create('supplier_returns', function (Blueprint $t) {
            $t->id();
            $t->foreignId('supplier_id')->constrained();
            $t->foreignId('purchase_item_id')->constrained('supplier_purchase_items');
            $t->foreignId('user_id')->constrained();
            $t->foreignId('stock_movement_id')->constrained('stock_movements');
            $t->uuid('request_key')->unique();
            $t->string('payload_hash', 64);
            $t->string('description');
            $t->unsignedInteger('quantity');
            $t->unsignedBigInteger('value_cents');
            $t->string('resolution', 20);
            $t->date('returned_on');
            $t->string('reason', 500);
            $t->timestamps();
        });
        Schema::create('supplier_occurrences', function (Blueprint $t) {
            $t->id();
            $t->foreignId('supplier_id')->constrained();
            $t->foreignId('user_id')->constrained();
            $t->date('occurred_on');
            $t->string('category', 30);
            $t->string('description', 1000);
            $t->unsignedTinyInteger('delivery_rating')->nullable();
            $t->unsignedTinyInteger('quality_rating')->nullable();
            $t->unsignedTinyInteger('price_rating')->nullable();
            $t->unsignedTinyInteger('service_rating')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('supplier_payables', fn (Blueprint $t) => $t->dropColumn(['interest_cents', 'discount_cents']));
        foreach (['supplier_occurrences', 'supplier_returns', 'supplier_documents', 'supplier_offerings'] as $table) {
            Schema::dropIfExists($table);
        }Schema::table('supplier_purchase_items', fn (Blueprint $t) => $t->dropColumn('lot'));
        Schema::table('suppliers', fn (Blueprint $t) => $t->dropColumn('profile'));
    }
};
