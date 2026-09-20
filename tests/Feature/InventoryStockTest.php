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

class InventoryStockTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
        $this->user = User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => 'Master Estoque',
            'login' => 'stock-master',
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
        $this->client = Client::create([
            'name' => 'Cliente Estoque',
            'document' => '52998224725',
            'phone' => '35999998888',
            'postal_code' => '37160000',
            'street' => 'Rua Estoque',
            'number' => '10',
            'district' => 'Centro',
            'city' => 'Campos Gerais',
            'state' => 'MG',
        ]);
        $this->actingAs($this->user);
    }

    public function test_opening_order_deducts_stock_and_never_allows_negative_balance(): void
    {
        $product = $this->product(3);

        $order = $this->postJson('/api/orders', $this->orderPayload($product, 2))->assertCreated()->json();

        $this->assertSame(1, (int) DB::table('service_catalog')->where('id', $product)->value('stock_quantity'));
        $this->assertDatabaseHas('service_order_items', [
            'service_order_id' => $order['id'],
            'catalog_id' => $product,
            'quantity' => 2,
            'stock_applied_quantity' => 2,
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product,
            'service_order_id' => $order['id'],
            'type' => 'order_out',
            'quantity' => 2,
            'balance_after' => 1,
        ]);

        $this->postJson('/api/orders', $this->orderPayload($product, 2))
            ->assertUnprocessable()
            ->assertJsonPath('errors.items.0', 'Estoque insuficiente para SSD controlado. Disponível: 1 unidade.');
        $this->assertSame(1, (int) DB::table('service_catalog')->where('id', $product)->value('stock_quantity'));
    }

    public function test_removing_product_from_active_order_returns_applied_quantity(): void
    {
        $product = $this->product(4);
        $order = $this->postJson('/api/orders', $this->orderPayload($product, 3))->assertCreated()->json();

        $this->patchJson("/api/orders/{$order['id']}", ['items' => []])->assertOk();

        $this->assertSame(4, (int) DB::table('service_catalog')->where('id', $product)->value('stock_quantity'));
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product,
            'service_order_id' => $order['id'],
            'type' => 'order_return',
            'quantity' => 3,
            'balance_after' => 4,
        ]);
    }

    public function test_interruption_returns_products_before_active_items_are_deleted(): void
    {
        $product = $this->product(5);
        $order = $this->postJson('/api/orders', $this->orderPayload($product, 2))->assertCreated()->json();

        $this->patchJson("/api/orders/{$order['id']}/status", [
            'status' => 'interrupted',
            'interruption_reason' => 'Cliente desistiu.',
            'interruption_work_done' => 'Nenhum reparo realizado.',
        ])->assertOk();

        $this->assertSame(5, (int) DB::table('service_catalog')->where('id', $product)->value('stock_quantity'));
        $this->assertDatabaseMissing('service_order_items', ['service_order_id' => $order['id'], 'finalization_id' => null]);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product,
            'service_order_id' => $order['id'],
            'type' => 'order_return',
            'quantity' => 2,
            'balance_after' => 5,
        ]);
    }

    public function test_budget_only_consults_stock_and_warns_when_product_is_unavailable(): void
    {
        $product = $this->product(0);
        $order = $this->postJson('/api/orders', $this->orderPayload())->assertCreated()->json();

        $response = $this->postJson("/api/orders/{$order['id']}/budgets", [
            'diagnosis' => 'SSD precisa ser substituído.',
            'proposal' => 'Fornecer um SSD novo.',
            'validity_days' => 7,
            'items' => [[
                'catalog_id' => $product,
                'description' => 'SSD controlado',
                'quantity' => 1,
                'unit_price_cents' => 25000,
                'warranty_enabled' => false,
            ]],
        ])->assertCreated();

        $response->assertJsonPath('items.0.stock_warning', 'Sem estoque');
        $this->assertSame(0, (int) DB::table('service_catalog')->where('id', $product)->value('stock_quantity'));
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_finalization_and_later_administrative_reopen_do_not_change_stock(): void
    {
        $product = $this->product(2);
        $order = $this->postJson('/api/orders', $this->orderPayload($product, 1))->assertCreated()->json();

        $this->postJson("/api/orders/{$order['id']}/finalize", [
            'result' => 'repair_completed',
            'technical_report' => 'Produto instalado.',
            'discount_cents' => 0,
            'photo_ids' => [],
            'items' => [[
                'catalog_id' => $product,
                'description' => 'SSD controlado',
                'quantity' => 1,
                'unit_price_cents' => 25000,
                'warranty_enabled' => false,
            ]],
        ])->assertCreated();
        $this->assertSame(1, (int) DB::table('service_catalog')->where('id', $product)->value('stock_quantity'));

        $this->postJson("/api/orders/{$order['id']}/reopen", ['note' => 'Correção administrativa.'])->assertOk();
        $this->patchJson("/api/orders/{$order['id']}", ['items' => []])->assertOk();

        $this->assertSame(1, (int) DB::table('service_catalog')->where('id', $product)->value('stock_quantity'));
        $this->assertSame(1, DB::table('stock_movements')->where('product_id', $product)->count());
    }

    public function test_product_added_only_during_finalization_is_debited_once_and_order_is_completed(): void
    {
        $product = $this->product(2);
        $order = $this->postJson('/api/orders', $this->orderPayload())->assertCreated()->json();

        $this->postJson("/api/orders/{$order['id']}/finalize", [
            'result' => 'repair_completed',
            'technical_report' => 'Tentativa de incluir só no fechamento.',
            'discount_cents' => 0,
            'photo_ids' => [],
            'items' => [[
                'catalog_id' => $product,
                'description' => 'SSD controlado',
                'quantity' => 1,
                'unit_price_cents' => 25000,
                'warranty_enabled' => false,
            ]],
        ])->assertCreated()
            ->assertJsonPath('order.status', 'completed');

        $this->assertSame(1, (int) DB::table('service_catalog')->where('id', $product)->value('stock_quantity'));
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product,
            'service_order_id' => $order['id'],
            'type' => 'order_out',
            'quantity' => 1,
            'balance_after' => 1,
        ]);
        $this->assertSame(1, DB::table('stock_movements')->where('product_id', $product)->count());
    }

    public function test_stock_entry_adds_to_current_balance_and_records_reason(): void
    {
        $product = $this->product(2);

        $this->postJson("/api/catalogs/products/{$product}/stock-entries", [
            'quantity' => 5,
            'reason' => 'Brinde recebido da empresa cliente',
        ])->assertOk()->assertJsonPath('stock_quantity', 7);

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product,
            'user_id' => $this->user->id,
            'type' => 'entry',
            'quantity' => 5,
            'balance_after' => 7,
            'reason' => 'Brinde recebido da empresa cliente',
        ]);
        $this->getJson("/api/catalogs/products/{$product}/stock-movements")
            ->assertOk()
            ->assertJsonPath('0.reason', 'Brinde recebido da empresa cliente');
    }

    private function product(int $stock): int
    {
        return DB::table('service_catalog')->insertGetId([
            'name' => 'SSD controlado',
            'category' => 'product',
            'price_cents' => 25000,
            'stock_quantity' => $stock,
            'warranty_enabled' => false,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function orderPayload(?int $product = null, int $quantity = 1): array
    {
        return [
            'client_id' => $this->client->id,
            'equipment_type_id' => DB::table('equipment_types')->value('id'),
            'attendance_type' => 'bench',
            'reported_problem' => 'Teste controlado de estoque',
            'checklist' => [],
            'items' => $product ? [['catalog_id' => $product, 'quantity' => $quantity]] : [],
        ];
    }
}
