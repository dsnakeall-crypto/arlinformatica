<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProgressiveCatalogSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_order_has_expected_equipment_and_broad_manufacturer_catalogs(): void
    {
        $this->seed(DatabaseSeeder::class);

        foreach (['Computador', 'Notebook', 'Impressora', 'Tablet', 'Mac Apple', 'iPad'] as $name) {
            $this->assertDatabaseHas('equipment_types', ['name' => $name, 'active' => true]);
        }

        foreach (['Dell', 'Acer', 'Lenovo', 'Samsung', 'Epson', 'HP', 'Compaq', 'VAIO', 'Apple', 'ASUS', 'Canon', 'Brother', 'Lexmark', 'Xerox'] as $name) {
            $this->assertDatabaseHas('manufacturers', ['name' => $name, 'active' => true]);
        }
    }

    public function test_client_and_catalog_search_accepts_one_character_and_refines_progressively(): void
    {
        $this->seed(DatabaseSeeder::class);
        $role = Role::where('name', 'Master')->firstOrFail();
        $user = User::create([
            'role_id' => $role->id,
            'name' => 'Operador',
            'login' => 'operador-busca',
            'password' => bcrypt('safe-password'),
            'active' => true,
        ]);
        $now = now();

        foreach ([
            ['Alberto Silva', '10000000001'],
            ['Allan Souza', '10000000002'],
            ['Dalton Lima', '10000000003'],
        ] as [$name, $document]) {
            DB::table('clients')->insert([
                'name' => $name,
                'document' => $document,
                'phone' => '35999999999',
                'postal_code' => '37160000',
                'street' => 'Rua Teste',
                'number' => '1',
                'district' => 'Centro',
                'city' => 'Campos Gerais',
                'state' => 'MG',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        DB::table('service_catalog')->insert([
            ['name' => 'Formatação com Backup', 'category' => 'service', 'price_cents' => 10000, 'warranty_enabled' => false, 'active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Limpeza interna', 'category' => 'service', 'price_cents' => 8000, 'warranty_enabled' => false, 'active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);

        $clientsA = $this->actingAs($user)->getJson('/api/clients?q=A&per_page=100')->assertOk()->json('data');
        $this->assertCount(3, $clientsA);

        $clientsAl = $this->getJson('/api/clients?q=Al&per_page=100')->assertOk()->json('data');
        $this->assertSame(['Alberto Silva', 'Allan Souza', 'Dalton Lima'], array_column($clientsAl, 'name'));

        $servicesA = $this->getJson('/api/catalogs/services?q=a')->assertOk()->json();
        $this->assertCount(2, $servicesA);

        $servicesFo = $this->getJson('/api/catalogs/services?q=Fo')->assertOk()->json();
        $this->assertSame(['Formatação com Backup'], array_column($servicesFo, 'name'));
    }
}
