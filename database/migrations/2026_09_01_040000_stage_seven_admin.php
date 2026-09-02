<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('checklist_templates', function (Blueprint $table) {
            $table->unsignedInteger('position')->default(0)->after('allows_note');
            $table->unique(['equipment_type_id', 'label']);
            $table->index(['equipment_type_id', 'active', 'position']);
        });
    }

    public function down(): void
    {
        Schema::table('checklist_templates', function (Blueprint $table) {
            $table->dropUnique(['equipment_type_id', 'label']);
            $table->dropIndex(['equipment_type_id', 'active', 'position']);
            $table->dropColumn('position');
        });
    }
};
