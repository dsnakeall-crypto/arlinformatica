<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('financial_expenses', function (Blueprint $table) {
            $table->string('category', 40)->nullable()->after('description')->index();
        });
    }

    public function down(): void
    {
        Schema::table('financial_expenses', function (Blueprint $table) {
            $table->dropIndex(['category']);
            $table->dropColumn('category');
        });
    }
};
