<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class E2ESeeder extends Seeder
{
    public function run(): void
    {
        foreach (['Master', 'Administrador', 'Funcionário'] as $role) {
            $login = match ($role) {
                'Master' => 'master',
                'Administrador' => 'admin',
                default => 'funcionario',
            };

            User::updateOrCreate(
                ['login' => 'e2e.'.$login],
                [
                    'role_id' => DB::table('roles')->where('name', $role)->value('id'),
                    'name' => "E2E {$role}",
                    'password' => Hash::make('E2e-Segura-2026!'),
                    'active' => true,
                ]
            );
        }

        DB::table('service_catalog')->updateOrInsert(
            ['name' => 'Formatação E2E'],
            [
                'category' => 'service',
                'price_cents' => 15000,
                'active' => true,
                'warranty_enabled' => true,
                'warranty_term' => 90,
                'warranty_unit' => 'days',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
