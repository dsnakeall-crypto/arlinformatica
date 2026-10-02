<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use App\Services\BackupService;
use App\Services\DatabaseResetService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class SuppliersTest extends TestCase
{
    use RefreshDatabase;

    private User $master;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        config(['backup.disk' => 'local']);
        $this->seed(DatabaseSeeder::class);
        $this->master = User::create(['role_id' => Role::where('name', 'Master')->value('id'), 'name' => 'Master Compras', 'login' => 'supplier-master', 'password' => 'Senha#Forte123', 'active' => true]);
        $this->actingAs($this->master);
    }

    private function supplier(): Supplier
    {
        return Supplier::create(['name' => 'Parceiro de compras', 'phone' => '35999999999']);
    }

    private function product(int $stock = 0): int
    {
        return DB::table('service_catalog')->insertGetId(['name' => 'SSD '.Str::uuid(), 'category' => 'product', 'stock_quantity' => $stock, 'price_cents' => 48000, 'active' => true, 'warranty_enabled' => false, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function payload(int $product, bool $received = false): array
    {
        return ['request_key' => (string) Str::uuid(), 'purchased_on' => today()->toDateString(), 'received_now' => $received, 'items' => [['product_id' => $product, 'quantity' => 3, 'unit_cost_cents' => 20000]]];
    }

    public function test_supplier_directory_validates_optional_document_and_preserves_history_when_inactivated(): void
    {
        $id = $this->postJson('/api/suppliers', ['name' => 'Empresa parceira', 'document' => '11.222.333/0001-81', 'email' => 'compras@example.test'])->assertCreated()->json('id');
        $this->postJson('/api/suppliers', ['name' => 'Duplicado', 'document' => '11222333000181'])->assertUnprocessable()->assertJsonValidationErrors('document');
        $this->postJson('/api/suppliers', ['name' => 'Inválido', 'document' => '123'])->assertUnprocessable();
        foreach ([['document' => 'letras'], ['document' => ['123']], ['postal_code' => 'letras'], ['state' => ['MG']]] as $invalid) {
            $this->postJson('/api/suppliers', ['name' => 'Dados inválidos'] + $invalid)->assertUnprocessable();
        }
        $this->postJson('/api/suppliers', ['name' => 'Sem documento'])->assertCreated();
        $this->postJson('/api/suppliers', ['name' => 'Sem documento dois'])->assertCreated();
        $this->getJson('/api/suppliers?q=Empresa')->assertOk()->assertJsonPath('data.0.name', 'Empresa parceira')->assertJsonPath('data.0.purchase_count', 0);
        $this->putJson('/api/suppliers/'.$id, ['name' => 'Empresa alterada', 'document' => '11222333000181', 'active' => false])->assertOk();
        $this->getJson('/api/suppliers/'.$id)->assertOk()->assertJsonPath('supplier.active', false);
        $this->assertDatabaseCount('suppliers', 3);
    }

    public function test_pending_purchase_receives_partially_then_fully_without_duplicate_stock_or_financial_expense(): void
    {
        $supplier = $this->supplier();
        $product = $this->product(2);
        $data = $this->payload($product);
        $purchase = $this->postJson('/api/suppliers/'.$supplier->id.'/purchases', $data)->assertCreated()->assertJsonPath('total_cents', 60000)->json();
        $this->postJson('/api/suppliers/'.$supplier->id.'/purchases', $data)->assertCreated();
        $this->assertDatabaseCount('supplier_purchases', 1);
        $this->assertDatabaseHas('service_catalog', ['id' => $product, 'stock_quantity' => 2]);
        $item = DB::table('supplier_purchase_items')->where('purchase_id', $purchase['id'])->value('id');
        $receipt = ['request_key' => (string) Str::uuid(), 'received_on' => today()->toDateString(), 'items' => [['item_id' => $item, 'quantity' => 1]]];
        $url = '/api/supplier-purchases/'.$purchase['id'].'/receipts';
        $this->postJson($url, $receipt)->assertCreated();
        $this->postJson($url, $receipt)->assertCreated();
        $this->assertDatabaseHas('service_catalog', ['id' => $product, 'stock_quantity' => 3]);
        $this->assertDatabaseCount('stock_movements', 1);
        $this->assertDatabaseHas('supplier_purchases', ['id' => $purchase['id'], 'status' => 'partially_received']);
        $this->postJson($url, array_replace($receipt, ['items' => [['item_id' => $item, 'quantity' => 2]]]))->assertConflict();
        $receipt['request_key'] = (string) Str::uuid();
        $receipt['items'][0]['quantity'] = 2;
        $this->postJson($url, $receipt)->assertCreated();
        $this->getJson('/api/supplier-purchases/'.$purchase['id'])->assertOk()->assertJsonPath('status', 'received')->assertJsonCount(2, 'receipts')->assertJsonPath('items.0.received_quantity', 3);
        $this->assertDatabaseHas('service_catalog', ['id' => $product, 'stock_quantity' => 5]);
        $this->assertDatabaseHas('stock_entry_details', ['supplier_id' => $supplier->id, 'unit_cost_cents' => 20000, 'origin' => 'purchase']);
        $this->assertDatabaseCount('financial_expenses', 0);
        $this->assertDatabaseCount('financial_transactions', 0);
        $this->getJson('/api/suppliers/'.$supplier->id)->assertOk()->assertJsonPath('products.0.received_quantity', 3);
    }

    public function test_immediate_receipt_preserves_supplier_product_and_cost_snapshots(): void
    {
        $supplier = $this->supplier();
        $product = $this->product();
        $data = $this->payload($product, true);
        $purchase = $this->postJson('/api/suppliers/'.$supplier->id.'/purchases', $data)->assertCreated()->assertJsonPath('status', 'received')->json();
        $this->postJson('/api/suppliers/'.$supplier->id.'/purchases', $data)->assertCreated();
        $this->assertDatabaseHas('service_catalog', ['id' => $product, 'stock_quantity' => 3]);
        $this->assertDatabaseCount('supplier_purchase_receipts', 1);
        $supplier->update(['name' => 'Novo nome']);
        $oldName = DB::table('service_catalog')->where('id', $product)->value('name');
        DB::table('service_catalog')->where('id', $product)->update(['name' => 'Produto renomeado', 'price_cents' => 99999]);
        $this->getJson('/api/supplier-purchases/'.$purchase['id'])->assertOk()->assertJsonPath('supplier_snapshot.name', 'Parceiro de compras')->assertJsonPath('items.0.description', $oldName)->assertJsonPath('items.0.unit_cost_cents', 20000);
    }

    public function test_cancelling_partial_purchase_preserves_received_stock_and_blocks_future_receipts(): void
    {
        $supplier = $this->supplier();
        $product = $this->product();
        $purchase = $this->postJson('/api/suppliers/'.$supplier->id.'/purchases', $this->payload($product))->json();
        $item = DB::table('supplier_purchase_items')->where('purchase_id', $purchase['id'])->value('id');
        $receipt = ['request_key' => (string) Str::uuid(), 'received_on' => today()->toDateString(), 'items' => [['item_id' => $item, 'quantity' => 1]]];
        $this->postJson('/api/supplier-purchases/'.$purchase['id'].'/receipts', $receipt)->assertCreated();
        $this->postJson('/api/supplier-purchases/'.$purchase['id'].'/cancel', ['reason' => 'Fornecedor não enviará o restante'])->assertOk();
        $receipt['request_key'] = (string) Str::uuid();
        $this->postJson('/api/supplier-purchases/'.$purchase['id'].'/receipts', $receipt)->assertConflict();
        $this->assertDatabaseHas('service_catalog', ['id' => $product, 'stock_quantity' => 1]);
        $this->assertDatabaseHas('supplier_purchases', ['id' => $purchase['id'], 'status' => 'cancelled']);
        $this->assertDatabaseCount('supplier_purchase_receipts', 1);
    }

    public function test_receipt_rejects_foreign_items_overdelivery_and_rolls_back_all_products_on_overflow(): void
    {
        $supplier = $this->supplier();
        $product = $this->product();
        $full = $this->product(4294967295);
        $data = $this->payload($product);
        $data['items'][] = ['product_id' => $full, 'quantity' => 1, 'unit_cost_cents' => 500];
        $purchase = $this->postJson('/api/suppliers/'.$supplier->id.'/purchases', $data)->assertCreated()->json();
        $items = DB::table('supplier_purchase_items')->where('purchase_id', $purchase['id'])->get();
        $body = ['request_key' => (string) Str::uuid(), 'received_on' => today()->toDateString(), 'items' => [['item_id' => 999999, 'quantity' => 1]]];
        $url = '/api/supplier-purchases/'.$purchase['id'].'/receipts';
        $this->postJson($url, $body)->assertUnprocessable();
        $body['items'] = [['item_id' => $items[0]->id, 'quantity' => 4]];
        $this->postJson($url, $body)->assertUnprocessable();
        $body['items'] = $items->map(fn ($item) => ['item_id' => $item->id, 'quantity' => 1])->all();
        $this->postJson($url, $body)->assertUnprocessable();
        $this->assertDatabaseHas('service_catalog', ['id' => $product, 'stock_quantity' => 0]);
        $this->assertDatabaseCount('supplier_purchase_receipts', 0);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_gifts_and_unknown_cost_remain_distinct_without_supplier_and_retry_does_not_duplicate(): void
    {
        $product = $this->product(4);
        $data = ['quantity' => 1, 'reason' => 'Brinde recebido', 'origin' => 'gift', 'request_key' => (string) Str::uuid()];
        $url = '/api/catalogs/products/'.$product.'/stock-entries';
        $this->postJson($url, $data)->assertOk();
        $this->postJson($url, $data)->assertOk();
        $this->postJson($url, $data + ['unit_cost_cents' => '0'])->assertOk();
        $this->postJson($url, array_replace($data, ['quantity' => 2]))->assertConflict();
        $this->assertDatabaseHas('service_catalog', ['id' => $product, 'stock_quantity' => 5]);
        $this->assertDatabaseHas('stock_entry_details', ['unit_cost_cents' => 0, 'supplier_id' => null, 'origin' => 'gift']);
        $this->postJson($url, ['quantity' => 1, 'reason' => 'Saldo sem custo conhecido'])->assertOk();
        $this->assertDatabaseHas('stock_entry_details', ['unit_cost_cents' => null, 'origin' => 'unspecified']);
        $this->postJson($url, ['quantity' => 1, 'reason' => 'Brinde inválido', 'origin' => 'gift', 'unit_cost_cents' => 100])->assertUnprocessable();
        $this->getJson('/api/catalogs/products/'.$product.'/stock-movements')->assertOk()->assertJsonPath('0.unit_cost_cents', null)->assertJsonPath('1.unit_cost_cents', 0);
    }

    public function test_inactive_suppliers_services_and_duplicate_products_are_rejected(): void
    {
        $supplier = $this->supplier();
        $product = $this->product();
        $data = $this->payload($product);
        $data['items'][] = $data['items'][0];
        $this->postJson('/api/suppliers/'.$supplier->id.'/purchases', $data)->assertUnprocessable();
        $data = $this->payload($product);
        DB::table('service_catalog')->where('id', $product)->update(['category' => 'service']);
        $this->postJson('/api/suppliers/'.$supplier->id.'/purchases', $data)->assertUnprocessable();
        $supplier->update(['active' => false]);
        $this->postJson('/api/suppliers/'.$supplier->id.'/purchases', $data)->assertUnprocessable();
        $this->assertDatabaseCount('supplier_purchases', 0);
    }

    public function test_employee_cannot_read_supplier_costs_or_write_purchases(): void
    {
        $supplier = $this->supplier();
        $employee = User::create(['role_id' => Role::where('name', 'Funcionário')->value('id'), 'name' => 'Funcionário', 'login' => 'supplier-employee', 'password' => 'Senha#Forte123', 'active' => true]);
        $this->actingAs($employee);
        foreach (['/api/suppliers', '/api/suppliers/'.$supplier->id, '/api/supplier-purchases/1'] as $url) {
            $this->getJson($url)->assertForbidden();
        }
        foreach (['/api/suppliers', '/api/suppliers/'.$supplier->id.'/purchases', '/api/supplier-purchases/1/receipts', '/api/supplier-purchases/1/cancel'] as $url) {
            $this->postJson($url, [])->assertForbidden();
        }
    }

    public function test_supplier_purchases_are_included_in_verified_backup_restore_and_reset(): void
    {
        $supplier = $this->supplier();
        $product = $this->product();
        $this->postJson('/api/suppliers/'.$supplier->id.'/purchases', $this->payload($product, true))->assertCreated();
        $service = app(BackupService::class);
        $backup = $service->create($this->master, 'pre_reset', true);
        $manifest = $service->validate(Storage::disk('local')->path($backup->path));
        $this->assertSame(1, $manifest['counts']['suppliers']);
        $this->assertSame(1, $manifest['counts']['stock_entry_details']);
        Supplier::whereKey($supplier->id)->update(['name' => 'Alterado']);
        $service->restore($backup, $this->master);
        $this->assertDatabaseHas('suppliers', ['id' => $supplier->id, 'name' => 'Parceiro de compras']);
        $resetBackup = $service->create($this->master, 'pre_reset', true);
        app(DatabaseResetService::class)->reset($this->master, $resetBackup, '127.0.0.1');
        foreach (['suppliers', 'supplier_purchases', 'supplier_purchase_items', 'supplier_purchase_receipts', 'stock_entry_details'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
    }
}
