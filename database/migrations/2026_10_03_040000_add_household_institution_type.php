<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cg_institutions', function (Blueprint $table) {
            $table->foreignId('restricted_type_id')->nullable()->constrained('cg_types')->restrictOnDelete();
        });
        Schema::table('cg_debts', fn (Blueprint $table) => $table->string('payment_method', 20)->nullable());
    }

    public function down(): void
    {
        Schema::table('cg_debts', fn (Blueprint $table) => $table->dropColumn('payment_method'));
        Schema::table('cg_institutions', function (Blueprint $table) {
            $table->dropForeign(['restricted_type_id']);
            $table->dropColumn('restricted_type_id');
        });
    }
};
