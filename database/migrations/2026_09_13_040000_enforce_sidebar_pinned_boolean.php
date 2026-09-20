<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->whereNull('sidebar_pinned')->update(['sidebar_pinned' => false]);

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('sidebar_pinned')->default(false)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('sidebar_pinned')->nullable()->default(false)->change();
        });
    }
};
