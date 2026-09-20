<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OpeningOrderItemsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
    }

    public function test_opening_items_use_catalog_price_and_warranty_from_the_server(): void
    {
        $user = $this->master('opening-items-master');
        $client = $this->client();
        $catalogId = $this->catalogItem();

        $response = $this->actingAs($user)->postJson('/api/orders', [
            'client_id' => $client->id,
            'equipment_type_id' => DB::table('equipment_types')->value('id'),
            'manufacturer_id' => null,
            'attendance_type' => 'bench',
            'reported_problem' => 'Teste de itens na abertura',
            'checklist' => [],
            'items' => [[
                'catalog_id' => $catalogId,
                'quantity' => 2,
                'description' => 'DESCRIÇÃO ADULTERADA',
                'unit_price_cents' => 1,
                'warranty_enabled' => false,
            ]],
        ])->assertCreated();

        $orderId = $response->json('id');
        $item = DB::table('service_order_items')->where('service_order_id', $orderId)->sole();
        $this->assertSame('Serviço abertura segura', $item->description);
        $this->assertSame(2, (int) $item->quantity);
        $this->assertSame(12345, (int) $item->unit_price_cents);
        $this->assertSame(24690, (int) $item->subtotal_cents);
        $this->assertNull($item->finalization_id);
        $this->assertNull($item->source_budget_id);
        $warranty = json_decode($item->warranty_snapshot, true);
        $this->assertCount(3, $warranty);
        $this->assertTrue($warranty['enabled']);
        $this->assertSame(6, $warranty['term']);
        $this->assertSame('months', $warranty['unit']);

        $detail = $this->getJson("/api/orders/{$orderId}")->assertOk()->json();
        $this->assertSame('Serviço abertura segura', $detail['items'][0]['description']);
        $this->assertSame(12345, $detail['items'][0]['unit_price_cents']);
    }

    public function test_finalization_replaces_provisional_opening_items_with_the_final_snapshot(): void
    {
        $user = $this->master('opening-items-finalize');
        $client = $this->client();
        $catalogId = $this->catalogItem();
        $order = $this->actingAs($user)->postJson('/api/orders', [
            'client_id' => $client->id,
            'equipment_type_id' => DB::table('equipment_types')->value('id'),
            'attendance_type' => 'bench',
            'reported_problem' => 'Finalizar item provisório',
            'checklist' => [],
            'items' => [['catalog_id' => $catalogId, 'quantity' => 1]],
        ])->assertCreated()->json();

        $this->assertDatabaseHas('service_order_items', [
            'service_order_id' => $order['id'],
            'description' => 'Serviço abertura segura',
            'finalization_id' => null,
        ]);

        $this->postJson("/api/orders/{$order['id']}/finalize", [
            'result' => 'repair_completed',
            'technical_report' => 'Serviço final revisado pelo técnico.',
            'discount_cents' => 0,
            'photo_ids' => [],
            'items' => [[
                'catalog_id' => $catalogId,
                'description' => 'Serviço final confirmado',
                'quantity' => 1,
                'unit_price_cents' => 15000,
                'warranty_enabled' => false,
            ]],
        ])->assertCreated();

        $items = DB::table('service_order_items')->where('service_order_id', $order['id'])->get();
        $this->assertCount(1, $items);
        $this->assertSame('Serviço final confirmado', $items->first()->description);
        $this->assertSame(15000, (int) $items->first()->unit_price_cents);
        $this->assertNotNull($items->first()->finalization_id);
        $this->assertNull($items->first()->source_budget_id);
    }

    private function master(string $login): User
    {
        return User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => 'Master Itens',
            'login' => $login,
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
    }

    private function client(): Client
    {
        return Client::create([
            'name' => 'Cliente Itens',
            'document' => '52998224725',
            'phone' => '35999998888',
            'postal_code' => '37160000',
            'street' => 'Rua dos Itens',
            'number' => '10',
            'district' => 'Centro',
            'city' => 'Campos Gerais',
            'state' => 'MG',
        ]);
    }

    private function catalogItem(): int
    {
        return DB::table('service_catalog')->insertGetId([
            'name' => 'Serviço abertura segura',
            'category' => 'service',
            'price_cents' => 12345,
            'warranty_enabled' => true,
            'warranty_term' => 6,
            'warranty_unit' => 'months',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
