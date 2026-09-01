<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_order_finalizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_order_id')->constrained();
            $table->unsignedInteger('revision')->default(1);
            $table->string('result', 40);
            $table->string('result_other')->nullable();
            $table->text('technical_report')->nullable();
            $table->unsignedBigInteger('subtotal_cents');
            $table->unsignedBigInteger('discount_cents');
            $table->unsignedBigInteger('total_cents');
            $table->json('snapshot');
            $table->foreignId('completed_by')->constrained('users');
            $table->timestamp('completed_at');
            $table->timestamps();
            $table->unique(['service_order_id', 'revision']);
        });
        Schema::table('service_order_items', function (Blueprint $table) {
            $table->foreignId('finalization_id')->nullable()->after('service_order_id')->constrained('service_order_finalizations');
            $table->foreignId('source_budget_id')->nullable()->after('catalog_id')->constrained('budgets');
        });
        Schema::table('technical_report_templates', function (Blueprint $table) {
            $table->string('kind', 40)->default('general')->after('name');
            $table->boolean('used')->default(false)->after('active');
        });
        Schema::table('technical_reports', function (Blueprint $table) {
            $table->string('status', 20)->default('draft')->after('revision');
            $table->json('snapshot')->nullable()->after('content');
            $table->foreignId('issued_by')->nullable()->after('issued_at')->constrained('users');
        });
    }

    public function down(): void
    {
        Schema::table('technical_reports', function (Blueprint $table) {
            $table->dropConstrainedForeignId('issued_by');
            $table->dropColumn(['status', 'snapshot']);
        });
        Schema::table('technical_report_templates', fn (Blueprint $table) => $table->dropColumn(['kind', 'used']));
        Schema::table('service_order_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('source_budget_id');
            $table->dropConstrainedForeignId('finalization_id');
        });
        Schema::dropIfExists('service_order_finalizations');
    }
};
