<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cg_photo_reads', function (Blueprint $table) {
            $table->id();
            $table->uuid('request_key')->unique();
            $table->char('source_hash', 64);
            $table->char('payload_hash', 64)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('model', 80);
            $table->string('status', 20);
            $table->unsignedInteger('reserved_micro_usd')->default(0);
            $table->unsignedInteger('cost_micro_usd')->nullable();
            $table->unsignedInteger('input_tokens')->nullable();
            $table->unsignedInteger('output_tokens')->nullable();
            $table->json('result')->nullable();
            $table->timestamps();
            $table->index(['created_at', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cg_photo_reads');
    }
};
