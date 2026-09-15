<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            $table->string('equipment_description', 500)->nullable();
        });

        if (! DB::table('equipment_types')->where('name', 'Informado manualmente')->exists()) {
            DB::table('equipment_types')->insert([
                'name' => 'Informado manualmente',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        $manualId = DB::table('equipment_types')->where('name', 'Informado manualmente')->value('id');
        if ($manualId && ! DB::table('service_orders')->where('equipment_type_id', $manualId)->exists()) {
            DB::table('equipment_types')->where('id', $manualId)->delete();
        }

        Schema::table('service_orders', function (Blueprint $table) {
            $table->dropColumn('equipment_description');
        });
    }
};
