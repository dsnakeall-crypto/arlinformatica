<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cg_photo_imports', function (Blueprint $table) {
            $table->id();
            $table->uuid('request_key')->unique();
            $table->char('payload_hash', 64);
            $table->char('source_hash', 64);
            $table->foreignId('institution_id')->constrained('cg_institutions')->restrictOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('debt_ids');
            $table->timestamps();
            $table->unique(['institution_id', 'source_hash']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cg_photo_imports');
    }
};
