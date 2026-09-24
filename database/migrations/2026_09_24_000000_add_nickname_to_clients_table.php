<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('nickname', 80)->nullable()->after('name');
        });
    }

    public function down(): void
    {
        // A coluna é preservada para não apagar referências cadastradas.
    }
};
