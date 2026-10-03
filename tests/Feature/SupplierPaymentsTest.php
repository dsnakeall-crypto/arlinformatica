<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use App\Services\BackupService;
use App\Services\DatabaseResetService;
use App\Services\SupplierDocument;
use App\Services\SupplierPayables;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class SupplierPaymentsTest extends TestCase
{
    use RefreshDatabase;

    private User $master;

    private Supplier $supplier;

    private int $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        Storage::fake('local');
        $this->master = User::create(['name' => 'Compras', 'login' => 'compras-test', 'password' => 'Senha#Forte123', 'role_id' => Role::where('name', 'Master')->value('id'), 'active' => true]);
        $this->actingAs($this->master);
        $this->supplier = Supplier::create(['name' => 'Fornecedor histórico']);
        $this->product = DB::table('service_catalog')->insertGetId(['name' => 'SSD', 'category' => 'product', 'price_cents' => 48000, 'stock_quantity' => 0, 'active' => true, 'warranty_enabled' => false, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function payload(): array
    {
        return ['request_key' => (string) Str::uuid(), 'purchased_on' => today()->toDateString(), 'received_now' => true, 'items' => [['product_id' => $this->product, 'quantity' => 1, 'unit_cost_cents' => 10001]], 'payment_terms' => 'installments', 'payment_method' => 'boleto', 'installments' => [['amount_cents' => 5000, 'due_on' => today()->toDateString()], ['amount_cents' => 5001, 'due_on' => today()->addMonth()->toDateString()]]];
    }

    public function test_purchase_history_returns_snapshots_installments_and_actual_partial_receipt_dates(): void
    {
        $data = $this->payload();
        $data['purchased_on'] = today()->subDays(2)->toDateString();
        $data['received_now'] = false;
        $data['items'][0]['quantity'] = 2;
        $data['installments'][0]['amount_cents'] = 10000;
        $data['installments'][1]['amount_cents'] = 10002;
        $purchase = $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $data)->assertCreated()->json();
        DB::table('service_catalog')->where('id', $this->product)->update(['name' => 'Produto renomeado']);
        $url = '/api/suppliers/'.$this->supplier->id;
        $this->getJson($url)->assertOk()->assertJsonPath('purchases.data.0.items.0.description', 'SSD')->assertJsonPath('purchases.data.0.items.0.quantity', 2)->assertJsonPath('purchases.data.0.receipt_count', 0)->assertJsonPath('purchases.data.0.last_received_on', null)->assertJsonCount(2, 'purchases.data.0.installments')->assertJsonPath('purchases.data.0.installments.1.amount_cents', 10002);
        $receipt = ['request_key' => (string) Str::uuid(), 'received_on' => today()->subDay()->toDateString(), 'items' => [['item_id' => DB::table('supplier_purchase_items')->where('purchase_id', $purchase['id'])->value('id'), 'quantity' => 1]]];
        $this->postJson('/api/supplier-purchases/'.$purchase['id'].'/receipts', $receipt)->assertCreated();
        $this->getJson($url)->assertOk()->assertJsonPath('purchases.data.0.status', 'partially_received')->assertJsonPath('purchases.data.0.first_received_on', $receipt['received_on'])->assertJsonPath('purchases.data.0.receipt_count', 1);
        $receipt['request_key'] = (string) Str::uuid();
        $receipt['received_on'] = today()->toDateString();
        $this->postJson('/api/supplier-purchases/'.$purchase['id'].'/receipts', $receipt)->assertCreated();
        $first = DB::table('supplier_payables')->where('purchase_id', $purchase['id'])->orderBy('installment')->value('id');
        $this->postJson('/api/supplier-payables/'.$first.'/pay', ['paid_on' => today()->toDateString(), 'paid_method' => 'pix'])->assertOk();
        $this->getJson($url)->assertOk()->assertJsonPath('purchases.data.0.status', 'received')->assertJsonPath('purchases.data.0.receipt_count', 2)->assertJsonPath('purchases.data.0.first_received_on', today()->subDay()->toDateString())->assertJsonPath('purchases.data.0.last_received_on', today()->toDateString())->assertJsonPath('purchases.data.0.paid_amount_cents', 10000)->assertJsonPath('purchases.data.0.open_amount_cents', 10002)->assertJsonPath('purchases.data.0.installments.0.paid_on', today()->toDateString());
    }

    public function test_finance_groups_all_installments_before_paginating_purchases(): void
    {
        $data = $this->payload();
        $data['items'][0]['unit_cost_cents'] = 32000;
        $data['installments'] = array_map(fn ($n) => ['amount_cents' => 1000, 'due_on' => today()->addMonths($n)->toDateString()], range(0, 31));
        $purchase = $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $data)->assertCreated()->json('id');
        $titles = DB::table('supplier_payables')->where('purchase_id', $purchase)->orderBy('installment')->get();
        $this->postJson('/api/supplier-payables/'.$titles[0]->id.'/pay', ['paid_on' => today()->toDateString(), 'paid_method' => 'pix', 'interest_cents' => 100, 'discount_cents' => 50])->assertOk();
        DB::table('supplier_payables')->where('id', $titles[1]->id)->update(['due_on' => today()->subDay()->toDateString()]);
        $second = $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $this->payload())->assertCreated()->json('id');
        $result = $this->getJson('/api/suppliers/'.$this->supplier->id.'/workspace')->assertOk()->assertJsonCount(2, 'finance_purchases.data')->assertJsonPath('summary.overdue_cents', 1000);
        $rows = collect($result->json('finance_purchases.data'))->keyBy('id');
        $this->assertSame(32, $rows[$purchase]['installment_count']);
        $this->assertSame(31000, $rows[$purchase]['open_cents']);
        $this->assertSame(1050, $rows[$purchase]['paid_cents']);
        $this->assertSame(1, $rows[$purchase]['paid_count']);
        $this->assertSame(1, $rows[$purchase]['overdue_count']);
        $this->assertSame(2, $rows[$second]['installment_count']);
        for ($i = 0; $i < 15; $i++) {
            $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $this->payload())->assertCreated();
        }
        $this->getJson('/api/suppliers/'.$this->supplier->id.'/workspace')->assertOk()->assertJsonCount(15, 'finance_purchases.data')->assertJsonPath('finance_purchases.total', 17);
        $this->getJson('/api/suppliers/'.$this->supplier->id.'/workspace?payments_page=2')->assertOk()->assertJsonCount(2, 'finance_purchases.data')->assertJsonPath('finance_purchases.data.1.installment_count', 32);
        $this->getJson('/api/suppliers/'.$this->supplier->id.'/workspace?from='.today()->addDay()->toDateString())->assertOk()->assertJsonCount(0, 'finance_purchases.data');
    }

    public function test_product_detail_is_scoped_to_supplier_and_backend_role(): void
    {
        $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $this->payload())->assertCreated();
        $other = Supplier::create(['name' => 'Outro parceiro']);
        $this->getJson('/api/suppliers/'.$this->supplier->id.'/products/'.$this->product)->assertOk()->assertJsonPath('product.price_cents', 48000)->assertJsonPath('summary.received_quantity', 1)->assertJsonPath('summary.received_cents', 10001)->assertJsonCount(1, 'purchases.data');
        $this->getJson('/api/suppliers/'.$other->id.'/products/'.$this->product)->assertNotFound();
        $local = User::create(['name' => 'Funcionário', 'login' => 'produto-local', 'password' => 'Senha#Forte123', 'role_id' => Role::where('name', 'Funcionário')->value('id'), 'active' => true]);
        $this->actingAs($local)->getJson('/api/suppliers/'.$this->supplier->id.'/products/'.$this->product)->assertForbidden();
    }

    public function test_installment_totals_and_dates_are_checked_atomically_before_stock_changes(): void
    {
        $data = $this->payload();
        $data['installments'][1]['amount_cents'] = 5000;
        $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $data)->assertUnprocessable();
        $this->assertDatabaseCount('supplier_purchases', 0);
        $this->assertDatabaseHas('service_catalog', ['id' => $this->product, 'stock_quantity' => 0]);
        $data = $this->payload();
        $data['installments'][0]['due_on'] = today()->subDay()->toDateString();
        $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $data)->assertUnprocessable();
        $data = $this->payload();
        $data['payment_terms'] = 'cash';
        $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $data)->assertUnprocessable();
    }

    public function test_cash_purchase_already_paid_is_audited_and_does_not_generate_due_reminders(): void
    {
        $data = $this->payload();
        $data['payment_terms'] = 'cash';
        $data['payment_method'] = 'pix';
        $data['installments'] = [['amount_cents' => 10001, 'due_on' => today()->toDateString(), 'paid_on' => today()->toDateString()]];
        $purchase = $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $data)->assertCreated()->json('id');
        $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $data)->assertCreated();
        $this->assertDatabaseCount('supplier_payables', 1);
        $this->assertSame(1, DB::table('audit_logs')->where('action', 'supplier.payment_confirmed')->count());
        $this->assertDatabaseHas('supplier_payables', ['purchase_id' => $purchase, 'paid_by' => $this->master->id, 'paid_method' => 'pix']);
        app(SupplierPayables::class)->remind();
        $this->assertDatabaseCount('notifications', 0);
        $this->getJson('/api/suppliers/'.$this->supplier->id)->assertOk()->assertJsonPath('purchases.data.0.paid_amount_cents', 10001)->assertJsonPath('purchases.data.0.open_amount_cents', 0);
    }

    public function test_payment_retry_does_not_duplicate_records_and_resolves_private_reminders(): void
    {
        $employee = User::create(['name' => 'Funcionário', 'login' => 'compras-employee', 'password' => 'Senha#Forte123', 'role_id' => Role::where('name', 'Funcionário')->value('id'), 'active' => true]);
        $data = $this->payload();
        $purchase = $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $data)->assertCreated()->json('id');
        $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $data)->assertCreated();
        $this->assertDatabaseCount('supplier_payables', 2);
        $service = app(SupplierPayables::class);
        $service->remind();
        $service->remind();
        $this->assertDatabaseCount('notifications', 1);
        $this->assertDatabaseMissing('notifications', ['user_id' => $employee->id, 'type' => 'supplier_due']);
        $id = DB::table('supplier_payables')->where('purchase_id', $purchase)->value('id');
        $payment = ['paid_on' => today()->toDateString(), 'paid_method' => 'pix', 'payment_reference' => 'Comprovante123'];
        $this->postJson('/api/supplier-payables/'.$id.'/pay', $payment)->assertOk();
        $this->postJson('/api/supplier-payables/'.$id.'/pay', $payment)->assertOk();
        $this->postJson('/api/supplier-payables/'.$id.'/pay', array_replace($payment, ['paid_method' => 'cash']))->assertConflict();
        $this->assertSame(1, DB::table('audit_logs')->where('action', 'supplier.payment_confirmed')->count());
        $this->assertSame(0, DB::table('notifications')->where('active', true)->count());
        $this->assertDatabaseCount('financial_expenses', 0);
        $this->assertDatabaseHas('service_catalog', ['id' => $this->product, 'stock_quantity' => 1]);
    }

    public function test_voiding_a_debt_is_separate_from_cancelling_delivery(): void
    {
        $purchase = $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $this->payload())->assertCreated()->json('id');
        $id = DB::table('supplier_payables')->where('purchase_id', $purchase)->value('id');
        $this->postJson('/api/supplier-payables/'.$id.'/cancel', ['reason' => 'Desconto negociado'])->assertOk();
        $this->postJson('/api/supplier-payables/'.$id.'/pay', ['paid_on' => today()->toDateString(), 'paid_method' => 'pix'])->assertConflict();
        $this->assertDatabaseHas('supplier_purchases', ['id' => $purchase, 'status' => 'received']);
        $this->assertDatabaseHas('service_catalog', ['id' => $this->product, 'stock_quantity' => 1]);
    }

    public function test_private_invoice_is_validated_deduplicated_and_inaccessible_to_employee(): void
    {
        $purchase = $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $this->payload())->assertCreated()->json('id');
        $key = (string) Str::uuid();
        $file = UploadedFile::fake()->createWithContent('nota.pdf', "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF");
        $url = '/api/supplier-purchases/'.$purchase.'/invoices';
        $id = $this->post($url, ['request_key' => $key, 'invoice' => $file], ['Accept' => 'application/json'])->assertCreated()->json('id');
        $this->post($url, ['request_key' => $key, 'invoice' => $file], ['Accept' => 'application/json'])->assertCreated();
        $this->assertDatabaseCount('supplier_invoices', 1);
        $this->getJson('/api/supplier-purchases/'.$purchase)->assertJsonMissingPath('invoices.0.path');
        $this->get('/api/supplier-invoices/'.$id.'/download')->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->post($url, ['request_key' => (string) Str::uuid(), 'invoice' => UploadedFile::fake()->createWithContent('hack.pdf', '<script>bad</script>')], ['Accept' => 'application/json'])->assertUnprocessable();
        $employee = User::create(['name' => 'Employee', 'login' => 'invoice-employee', 'password' => 'Senha#Forte123', 'role_id' => Role::where('name', 'Funcionário')->value('id'), 'active' => true]);
        $this->actingAs($employee)->getJson('/api/supplier-invoices/'.$id.'/download')->assertForbidden();
        $this->postJson('/api/supplier-payables/1/pay', ['paid_on' => today()->toDateString(), 'paid_method' => 'pix'])->assertForbidden();
    }

    public function test_document_lookup_does_not_claim_cpf_existence_and_handles_cnpj_provider_failure(): void
    {
        Http::preventStrayRequests();
        $this->postJson('/api/supplier-document/lookup', ['document' => '52998224725'])->assertOk()->assertJsonPath('status', 'manual');
        Http::assertNothingSent();
        Http::fake(['brasilapi.com.br/*' => Http::response(['cnpj' => '11222333000181', 'razao_social' => 'Empresa real', 'descricao_situacao_cadastral' => 'ATIVA'])]);
        $this->postJson('/api/supplier-document/lookup', ['document' => '11222333000181'])->assertOk()->assertJsonPath('status', 'found')->assertJsonPath('registration_status', 'ATIVA');
        $this->postJson('/api/supplier-document/lookup', ['document' => '123'])->assertUnprocessable();
        Http::fake(['brasilapi.com.br/*' => Http::response([], 503)]);
        $this->postJson('/api/supplier-document/lookup', ['document' => '04252011000110'])->assertOk()->assertJsonPath('status', 'unavailable');
        $this->assertTrue(SupplierDocument::valid('00000000E08G12'));
        $this->assertFalse(SupplierDocument::valid('00000000E08G13'));
    }

    public function test_backup_restores_purchase_installments_and_private_invoice_and_reset_cleans_them(): void
    {
        config(['backup.disk' => 'local']);
        $purchase = $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $this->payload())->assertCreated()->json('id');
        $file = UploadedFile::fake()->createWithContent('nota.pdf', "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF");
        $this->post('/api/supplier-purchases/'.$purchase.'/invoices', ['request_key' => (string) Str::uuid(), 'invoice' => $file], ['Accept' => 'application/json'])->assertCreated();
        $path = DB::table('supplier_invoices')->value('path');
        $original = Storage::disk('local')->get($path);
        $service = app(BackupService::class);
        $backup = $service->create($this->master, 'pre_reset', true);
        DB::table('supplier_payables')->update(['amount_cents' => 999]);
        Storage::disk('local')->put($path, 'alterado');
        $service->restore($backup, $this->master);
        $this->assertSame($original, Storage::disk('local')->get($path));
        $this->assertDatabaseHas('supplier_payables', ['purchase_id' => $purchase, 'amount_cents' => 5001]);
        $resetBackup = $service->create($this->master, 'pre_reset', true);
        app(DatabaseResetService::class)->reset($this->master, $resetBackup, '127.0.0.1');
        $this->assertDatabaseCount('supplier_payables', 0);
        $this->assertDatabaseCount('supplier_invoices', 0);
        Storage::disk('local')->assertMissing($path);
    }

    public function test_overdue_reminder_replaces_previous_stage_without_duplicates(): void
    {
        $data = $this->payload();
        $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $data)->assertCreated();
        app(SupplierPayables::class)->remind();
        $this->travel(1)->days();
        app(SupplierPayables::class)->remind();
        app(SupplierPayables::class)->remind();
        $this->assertSame(1, DB::table('notifications')->where('active', true)->count());
        $this->assertSame('Pagamento a fornecedor vencido', DB::table('notifications')->where('active', true)->value('title'));
        $this->travelBack();
    }

    public function test_interest_discount_preserve_principal_and_payment_retry_and_report_real_cash(): void
    {
        $purchase = $this->postJson('/api/suppliers/'.$this->supplier->id.'/purchases', $this->payload())->assertCreated()->json('id');
        $id = DB::table('supplier_payables')->where('purchase_id', $purchase)->orderBy('id')->value('id');
        $data = ['paid_on' => today()->toDateString(), 'paid_method' => 'pix', 'interest_cents' => 100, 'discount_cents' => 200];
        $this->postJson('/api/supplier-payables/'.$id.'/pay', $data)->assertOk();
        $this->postJson('/api/supplier-payables/'.$id.'/pay', $data)->assertOk();
        $this->postJson('/api/supplier-payables/'.$id.'/pay', array_replace($data, ['discount_cents' => 201]))->assertConflict();
        $this->assertDatabaseHas('supplier_payables', ['id' => $id, 'amount_cents' => 5000, 'interest_cents' => 100, 'discount_cents' => 200]);
        $this->getJson('/api/suppliers/'.$this->supplier->id.'/workspace')->assertOk()->assertJsonPath('summary.paid_cents', 4900)->assertJsonPath('summary.open_cents', 5001);
        $this->getJson('/api/suppliers/'.$this->supplier->id)->assertOk()->assertJsonPath('purchases.data.0.paid_amount_cents', 4900);
    }
}
