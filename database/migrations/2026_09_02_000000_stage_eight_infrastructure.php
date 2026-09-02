<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('backups', function (Blueprint $table) {
            $table->string('kind', 20)->default('manual')->after('id');
            $table->boolean('protected')->default(false)->after('status');
            $table->text('error')->nullable()->after('protected');
        });
    }

    public function down(): void
    {
        Schema::table('backups', fn (Blueprint $table) => $table->dropColumn(['kind', 'protected', 'error']));
    }
};
