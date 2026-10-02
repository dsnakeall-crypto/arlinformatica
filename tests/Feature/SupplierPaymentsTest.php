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
}
