<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('postal_code', 8)->nullable()->change();
            $table->string('number', 30)->nullable()->change();
            $table->string('district')->nullable()->change();
            $table->string('city')->nullable()->change();
            $table->char('state', 2)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('postal_code', 8)->nullable(false)->change();
            $table->string('number', 30)->nullable(false)->change();
            $table->string('district')->nullable(false)->change();
            $table->string('city')->nullable(false)->change();
            $table->char('state', 2)->nullable(false)->change();
        });
    }
};
