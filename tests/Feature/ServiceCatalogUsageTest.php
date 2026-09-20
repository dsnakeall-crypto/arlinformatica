<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ServiceCatalogUsageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_catalog_reports_distinct_order_usage_and_keeps_history_after_deactivation(): void
    {
        $user = User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => 'Master Catálogo',
            'login' => 'catalog-usage-master',
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
        $client = Client::create([
            'name' => 'Cliente Catálogo',
            'document' => '52998224725',
            'phone' => '35999998888',
            'postal_code' => '37160000',
            'street' => 'Rua Catálogo',
            'number' => '10',
            'district' => 'Centro',
            'city' => 'Campos Gerais',
            'state' => 'MG',
        ]);
        $catalogId = DB::table('service_catalog')->insertGetId([
            'name' => 'Serviço histórico original',
            'category' => 'service',
            'price_cents' => 12000,
            'warranty_enabled' => true,
            'warranty_term' => 30,
            'warranty_unit' => 'days',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($user);
        $orderIds = [];
        foreach ([2, 1] as $quantity) {
            $order = $this->postJson('/api/orders', [
                'client_id' => $client->id,
                'equipment_type_id' => DB::table('equipment_types')->value('id'),
                'attendance_type' => 'bench',
                'reported_problem' => 'Uso do catálogo '.$quantity,
                'checklist' => [],
                'items' => [['catalog_id' => $catalogId, 'quantity' => $quantity]],
            ])->assertCreated()->json();
            $orderIds[] = $order['id'];
        }

        $listed = collect($this->getJson('/api/catalogs/services?active=0')->assertOk()->json());
        $item = $listed->firstWhere('id', $catalogId);
        $this->assertNotNull($item);
        $this->assertSame(2, (int) $item['usage_count']);

        $this->patchJson("/api/catalogs/services/{$catalogId}", [
            'name' => 'Serviço alterado depois',
            'price_cents' => 99900,
            'active' => false,
        ])->assertOk();

        $activeOnly = collect($this->getJson('/api/catalogs/services')->assertOk()->json());
        $this->assertFalse($activeOnly->contains('id', $catalogId));

        $all = collect($this->getJson('/api/catalogs/services?active=0')->assertOk()->json());
        $inactive = $all->firstWhere('id', $catalogId);
        $this->assertNotNull($inactive);
        $this->assertFalse((bool) $inactive['active']);
        $this->assertSame(2, (int) $inactive['usage_count']);

        $historicItems = DB::table('service_order_items')
            ->whereIn('service_order_id', $orderIds)
            ->orderBy('service_order_id')
            ->get();
        $this->assertCount(2, $historicItems);
        foreach ($historicItems as $historic) {
            $this->assertSame('Serviço histórico original', $historic->description);
            $this->assertSame(12000, (int) $historic->unit_price_cents);
            $warranty = json_decode($historic->warranty_snapshot, true);
            $this->assertTrue($warranty['enabled']);
            $this->assertSame(30, $warranty['term']);
            $this->assertSame('days', $warranty['unit']);
        }
    }

    public function test_services_and_products_are_listed_separately_without_recreating_existing_records(): void
    {
        $user = User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => 'Master Catálogos Separados',
            'login' => 'catalog-split-master',
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
        $serviceId = DB::table('service_catalog')->insertGetId([
            'name' => 'Limpeza técnica', 'category' => 'service', 'price_cents' => 9000,
            'warranty_enabled' => false, 'active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $productId = DB::table('service_catalog')->insertGetId([
            'name' => 'SSD já cadastrado', 'category' => 'product', 'price_cents' => 35000,
            'warranty_enabled' => false, 'active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->actingAs($user);

        $services = collect($this->getJson('/api/catalogs/services')->assertOk()->json());
        $products = collect($this->getJson('/api/catalogs/products')->assertOk()->json());
        $items = collect($this->getJson('/api/catalogs/items')->assertOk()->json());

        $this->assertTrue($services->contains('id', $serviceId));
        $this->assertFalse($services->contains('id', $productId));
        $this->assertTrue($products->contains('id', $productId));
        $this->assertFalse($products->contains('id', $serviceId));
        $this->assertTrue($items->contains('id', $serviceId));
        $this->assertTrue($items->contains('id', $productId));
        $this->assertDatabaseHas('service_catalog', ['id' => $productId, 'category' => 'product']);
    }
}
