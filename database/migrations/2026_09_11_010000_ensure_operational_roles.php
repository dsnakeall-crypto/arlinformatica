<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        foreach ([
            'Administrador' => ['orders', 'clients', 'finance', 'settings'],
            'Funcionário' => ['orders', 'clients'],
        ] as $name => $permissions) {
            DB::table('roles')->updateOrInsert(
                ['name' => $name],
                ['permissions' => json_encode($permissions), 'updated_at' => $now, 'created_at' => $now],
            );
        }
    }

    public function down(): void
    {
        // Perfis podem estar vinculados a usuários; rollback nunca remove dados de acesso.
    }
};
