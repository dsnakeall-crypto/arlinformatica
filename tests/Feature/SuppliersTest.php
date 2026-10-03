<?php

namespace Tests\Feature;

use App\Models\Backup;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use App\Services\BackupService;
use App\Services\DatabaseResetService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
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

    public function test_supplier_directory_requires_complete_registration_and_preserves_history_when_inactivated(): void
    {
        $valid = ['name' => 'Empresa parceira', 'trade_name' => 'Parceira', 'document' => '11.222.333/0001-81', 'phone' => '(35) 99999-1234', 'whatsapp' => '35999991234', 'landline' => '(35) 3234-5678', 'postal_code' => '37160-000', 'street' => 'Rua Um', 'number' => '10', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG'];
        $id = $this->postJson('/api/suppliers', $valid)->assertCreated()->assertJsonPath('phone', '35999991234')->json('id');
        $this->postJson('/api/suppliers', $valid)->assertUnprocessable()->assertJsonValidationErrors('document');
        $this->postJson('/api/suppliers', ['name' => 'Incompleto'])->assertUnprocessable();
        foreach (['trade_name', 'document', 'postal_code', 'street', 'number', 'district', 'city', 'state', 'phone', 'whatsapp'] as $required) {
            $incomplete = $valid;
            unset($incomplete[$required]);
            $this->putJson('/api/suppliers/'.$id, $incomplete)->assertUnprocessable()->assertJsonValidationErrors($required);
        }
        foreach ([['document' => '123'], ['document' => ['123']], ['phone' => '123'], ['whatsapp' => 'abc'], ['landline' => '35999991234'], ['postal_code' => 'letras'], ['state' => ['MG']]] as $invalid) {
            $this->putJson('/api/suppliers/'.$id, array_replace($valid, $invalid))->assertUnprocessable();
        }
        $this->putJson('/api/suppliers/'.$id, $valid + ['active' => false])->assertOk();
        $this->getJson('/api/suppliers/'.$id)->assertOk()->assertJsonPath('supplier.active', false);
        $this->assertDatabaseCount('suppliers', 1);
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

    public function test_workspace_profile_offerings_reports_and_roles_are_real_and_isolated(): void
    {
        $supplier = $this->supplier();
        $product = $this->product(5);
        $this->putJson('/api/suppliers/'.$supplier->id.'/profile', ['profile' => ['payment_days' => 30, 'pix_key' => 'chave', 'discount_percent' => 5]])->assertOk();
        $this->putJson('/api/suppliers/'.$supplier->id.'/profile', ['profile' => ['untrusted' => true]])->assertUnprocessable();
        $offering = ['product_id' => $product, 'cost_cents' => 0, 'minimum_quantity' => 1, 'active' => true];
        $this->postJson('/api/suppliers/'.$supplier->id.'/offerings', $offering)->assertOk();
        $this->postJson('/api/suppliers/'.$supplier->id.'/offerings', array_replace($offering, ['cost_cents' => null]))->assertOk();
        $this->assertDatabaseCount('supplier_offerings', 1);
        $this->assertDatabaseHas('service_catalog', ['id' => $product, 'stock_quantity' => 5, 'price_cents' => 48000]);
        $data = $this->payload($product, true);
        $data['items'][0]['lot'] = 'LOTE-01';
        $this->postJson('/api/suppliers/'.$supplier->id.'/purchases', $data)->assertCreated();
        $this->postJson('/api/suppliers/'.$supplier->id.'/occurrences', ['occurred_on' => today()->toDateString(), 'category' => 'quality', 'description' => 'Entrega conferida', 'quality_rating' => 5])->assertCreated();
        $this->getJson('/api/suppliers/'.$supplier->id.'/workspace')->assertOk()->assertJsonPath('summary.purchased_cents', 60000)->assertJsonPath('profile.payment_days', 30)->assertJsonPath('offerings.0.last_cost_cents', 20000)->assertJsonPath('prices.data.0.lot', 'LOTE-01')->assertJsonPath('most_purchased.0.quantity', 3);
        $this->getJson('/api/suppliers?q='.urlencode(DB::table('service_catalog')->where('id', $product)->value('name')))->assertOk()->assertJsonPath('total', 1);
        $user = User::create(['name' => 'Restrito', 'login' => (string) Str::uuid(), 'password' => 'Seguro#12345', 'role_id' => Role::where('name', 'Controle de Gasto')->value('id'), 'active' => true]);
        $this->actingAs($user)->getJson('/api/suppliers/'.$supplier->id.'/workspace')->assertForbidden();
        $this->postJson('/api/suppliers/'.$supplier->id.'/offerings', $offering)->assertForbidden();
    }

    public function test_supplier_return_is_atomic_idempotent_and_cannot_exceed_received_or_available_stock(): void
    {
        $supplier = $this->supplier();
        $product = $this->product();
        $purchase = $this->postJson('/api/suppliers/'.$supplier->id.'/purchases', $this->payload($product, true))->assertCreated()->json('id');
        $item = DB::table('supplier_purchase_items')->where('purchase_id', $purchase)->value('id');
        $url = '/api/suppliers/'.$supplier->id.'/returns';
        $data = ['request_key' => (string) Str::uuid(), 'purchase_item_id' => $item, 'quantity' => 2, 'value_cents' => 40000, 'returned_on' => today()->toDateString(), 'reason' => 'Produto com defeito', 'resolution' => 'credit'];
        $this->postJson($url, $data)->assertCreated()->assertJsonPath('replayed', false);
        $this->postJson($url, $data)->assertCreated()->assertJsonPath('replayed', true);
        $this->postJson($url, array_replace($data, ['quantity' => 1]))->assertConflict();
        $this->postJson($url, array_replace($data, ['request_key' => (string) Str::uuid()]))->assertUnprocessable();
        $this->assertDatabaseHas('service_catalog', ['id' => $product, 'stock_quantity' => 1]);
        $this->assertDatabaseHas('supplier_purchase_items', ['id' => $item, 'received_quantity' => 3]);
        $this->assertDatabaseCount('supplier_returns', 1);
        $this->assertDatabaseHas('stock_movements', ['type' => 'supplier_return', 'quantity' => 2, 'balance_after' => 1]);
        $this->getJson('/api/suppliers/'.$supplier->id.'/workspace')->assertOk()->assertJsonPath('credit_cents', 40000)->assertJsonPath('return_items.0.returnable_quantity', 1);
        DB::table('service_catalog')->where('id', $product)->update(['stock_quantity' => 0]);
        $this->postJson($url, array_replace($data, ['request_key' => (string) Str::uuid(), 'quantity' => 1]))->assertUnprocessable();
        $other = $this->supplier();
        $this->postJson('/api/suppliers/'.$other->id.'/returns', array_replace($data, ['request_key' => (string) Str::uuid(), 'quantity' => 1]))->assertUnprocessable();
    }

    public function test_private_xml_documents_reject_external_entities_and_backup_restores_them(): void
    {
        $supplier = $this->supplier();
        $url = '/api/suppliers/'.$supplier->id.'/documents';
        $data = ['request_key' => (string) Str::uuid(), 'category' => 'invoice'];
        $file = fn ($text) => UploadedFile::fake()->createWithContent('nota.xml', $text);
        $this->post($url, $data + ['file' => $file('<!DOCTYPE x [<!ENTITY a SYSTEM "file:///etc/passwd">]><x>&a;</x>')], ['Accept' => 'application/json'])->assertUnprocessable();
        $xml = '<?xml version="1.0"?><nfe><numero>123</numero></nfe>';
        $id = $this->post($url, $data + ['file' => $file($xml)], ['Accept' => 'application/json'])->assertCreated()->json('id');
        $this->post($url, $data + ['file' => $file($xml)], ['Accept' => 'application/json'])->assertCreated();
        $this->assertDatabaseCount('supplier_documents', 1);
        $this->get('/api/supplier-documents/'.$id.'/download')->assertOk()->assertDownload('nota.xml');
        $path = DB::table('supplier_documents')->where('id', $id)->value('path');
        $backup = app(BackupService::class)->create($this->master);
        $manifest = app(BackupService::class)->validate(Storage::disk('local')->path($backup->path));
        $this->assertSame(1, $manifest['counts']['supplier_documents']);
        Storage::disk('local')->delete($path);
        app(BackupService::class)->restore($backup, $this->master);
        Storage::disk('local')->assertExists($path);
        $reset = app(DatabaseResetService::class);
        $prepared = $reset->prepare($this->master, app(BackupService::class));
        $reset->reset($this->master, Backup::findOrFail($prepared['backup_id']), null);
        $this->assertDatabaseCount('supplier_documents', 0);
        Storage::disk('local')->assertMissing($path);
    }

    public function test_workspace_totals_cover_all_pages_and_date_filters_accept_only_end_date(): void
    {
        $supplier = $this->supplier();
        $data = $this->payload($this->product());
        $data += ['payment_terms' => 'installments', 'payment_method' => 'boleto', 'installments' => array_fill(0, 32, ['amount_cents' => 1875, 'due_on' => today()->toDateString()])];
        $this->postJson('/api/suppliers/'.$supplier->id.'/purchases', $data)->assertCreated();
        $this->getJson('/api/suppliers/'.$supplier->id.'/workspace?to='.today()->toDateString())->assertOk()->assertJsonPath('summary.open_cents', 60000)->assertJsonCount(25, 'payables.data');
        $this->getJson('/api/suppliers/'.$supplier->id.'/workspace?payments_page=2')->assertOk()->assertJsonPath('summary.open_cents', 60000)->assertJsonCount(7, 'payables.data');
        $this->getJson('/api/suppliers/'.$supplier->id.'/workspace?from='.today()->toDateString().'&to='.today()->subDay()->toDateString())->assertUnprocessable();
    }
}
