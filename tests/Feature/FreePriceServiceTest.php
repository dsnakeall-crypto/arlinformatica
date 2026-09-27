<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FreePriceServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
        $this->actingAs(User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => 'Preço Livre', 'login' => 'preco-livre',
            'password' => 'Senha#Forte123', 'active' => true,
        ]));
    }

    public function test_fixed_and_free_service_prices_are_enforced_by_the_server(): void
    {
        $fixed = $this->postJson('/api/catalogs/services', [
            'name' => 'Serviço com preço fixo', 'price_cents' => 10000,
            'free_price' => false, 'warranty_enabled' => false,
        ])->assertCreated()->json();
        $free = $this->postJson('/api/catalogs/services', [
            'name' => 'Serviço com preço livre', 'price_cents' => 0,
            'free_price' => true, 'warranty_enabled' => false,
        ])->assertCreated()->assertJsonPath('free_price', 1)->json();

        $order = $this->createOrder([
            ['catalog_id' => $fixed['id'], 'quantity' => 1, 'unit_price_cents' => 99999],
            ['catalog_id' => $free['id'], 'quantity' => 1, 'unit_price_cents' => 15000],
        ]);
        $this->assertDatabaseHas('service_order_items', [
            'service_order_id' => $order['id'], 'catalog_id' => $fixed['id'], 'unit_price_cents' => 10000,
        ]);
        $this->assertDatabaseHas('service_order_items', [
            'service_order_id' => $order['id'], 'catalog_id' => $free['id'], 'unit_price_cents' => 15000,
        ]);

        $this->patchJson("/api/orders/{$order['id']}", ['items' => [
            ['catalog_id' => $fixed['id'], 'quantity' => 1, 'unit_price_cents' => 1],
            ['catalog_id' => $free['id'], 'quantity' => 1, 'unit_price_cents' => 17500],
        ]])->assertOk();
        $this->assertDatabaseHas('service_order_items', [
            'service_order_id' => $order['id'], 'catalog_id' => $fixed['id'], 'unit_price_cents' => 10000,
        ]);
        $this->assertDatabaseHas('service_order_items', [
            'service_order_id' => $order['id'], 'catalog_id' => $free['id'], 'unit_price_cents' => 17500,
        ]);

        $this->postJson("/api/orders/{$order['id']}/finalize", [
            'technical_report' => 'Serviços concluídos.', 'discount_cents' => 0,
            'items' => [
                ['catalog_id' => $fixed['id'], 'description' => $fixed['name'], 'quantity' => 1, 'unit_price_cents' => 1, 'warranty_enabled' => false],
                ['catalog_id' => $free['id'], 'description' => $free['name'], 'quantity' => 1, 'unit_price_cents' => 20000, 'warranty_enabled' => false],
            ],
        ])->assertCreated()->assertJsonPath('finalization.total_cents', 20001);

        $this->assertDatabaseHas('service_order_items', [
            'service_order_id' => $order['id'], 'catalog_id' => $fixed['id'],
            'unit_price_cents' => 1, 'subtotal_cents' => 1,
        ]);
    }

    public function test_free_price_service_rejects_zero_value(): void
    {
        $free = $this->postJson('/api/catalogs/services', [
            'name' => 'Serviço livre sem valor', 'price_cents' => 0,
            'free_price' => true, 'warranty_enabled' => false,
        ])->assertCreated()->json();

        $this->postJson('/api/orders', $this->orderPayload([
            ['catalog_id' => $free['id'], 'quantity' => 1, 'unit_price_cents' => 0],
        ]))->assertUnprocessable()->assertJsonValidationErrors('items');

        $order = $this->createOrder([]);
        $this->postJson("/api/orders/{$order['id']}/finalize", [
            'technical_report' => 'Tentativa sem valor.', 'discount_cents' => 0,
            'items' => [[
                'catalog_id' => $free['id'], 'description' => $free['name'],
                'quantity' => 1, 'unit_price_cents' => 0, 'warranty_enabled' => false,
            ]],
        ])->assertUnprocessable()->assertJsonValidationErrors('items');
    }

    private function createOrder(array $items): array
    {
        return $this->postJson('/api/orders', $this->orderPayload($items))->assertCreated()->json();
    }

    private function orderPayload(array $items): array
    {
        $clientId = DB::table('clients')->value('id') ?: $this->postJson('/api/clients', [
            'name' => 'Cliente Preço Livre', 'document' => '52998224725',
            'phone' => '35999999999', 'street' => 'Rua Teste',
        ])->assertCreated()->json('id');

        return [
            'client_id' => $clientId,
            'equipment_type_id' => DB::table('equipment_types')->value('id'),
            'attendance_type' => 'bench', 'reported_problem' => 'Teste de preço livre',
            'items' => $items, 'checklist' => [],
        ];
    }
}
