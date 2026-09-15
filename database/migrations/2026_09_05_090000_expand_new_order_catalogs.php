<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        foreach ([
            'CPU / Computador' => 'Computador',
            'MacBook' => 'Mac Apple',
        ] as $old => $new) {
            $oldRow = DB::table('equipment_types')->where('name', $old)->first();
            $newRow = DB::table('equipment_types')->where('name', $new)->first();

            if ($oldRow && ! $newRow) {
                DB::table('equipment_types')->where('id', $oldRow->id)->update([
                    'name' => $new,
                    'active' => true,
                    'updated_at' => $now,
                ]);
            } elseif ($oldRow && $newRow) {
                DB::table('equipment_types')->where('id', $oldRow->id)->update([
                    'active' => false,
                    'updated_at' => $now,
                ]);
            }
        }

        foreach (['Computador', 'Notebook', 'Impressora', 'Tablet', 'Mac Apple', 'iPad'] as $name) {
            DB::table('equipment_types')->updateOrInsert(
                ['name' => $name],
                ['active' => true, 'created_at' => $now, 'updated_at' => $now],
            );
        }

        foreach ([
            'Acer', 'Apple', 'ASUS', 'Avell', 'Brother', 'Canon', 'Compaq', 'Dell', 'Epson',
            'Gigabyte', 'HP', 'Huawei', 'Lenovo', 'Lexmark', 'LG', 'Microsoft', 'Motorola',
            'MSI', 'Multi', 'Philco', 'Positivo', 'Razer', 'Samsung', 'Toshiba', 'VAIO',
            'Xerox', 'Xiaomi',
        ] as $name) {
            DB::table('manufacturers')->updateOrInsert(
                ['name' => $name],
                ['active' => true, 'created_at' => $now, 'updated_at' => $now],
            );
        }
    }

    public function down(): void
    {
        // Dados de catálogo podem estar referenciados por OS históricas; rollback não apaga registros.
    }
};
