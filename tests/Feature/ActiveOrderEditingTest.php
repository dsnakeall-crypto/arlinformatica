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

class ActiveOrderEditingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
    }

    public function test_active_order_can_edit_report_checklist_and_services_without_a_budget(): void
    {
        $user = User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => 'Master OS ativa',
            'login' => 'active-order-master',
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
        $client = Client::create([
            'name' => 'Cliente OS Ativa',
            'document' => '52998224725',
            'phone' => '35999998888',
            'postal_code' => '37160000',
            'street' => 'Rua dos Testes',
            'number' => '20',
            'district' => 'Centro',
            'city' => 'Campos Gerais',
            'state' => 'MG',
        ]);
        $equipmentId = (int) DB::table('equipment_types')->where('name', 'Notebook')->value('id');
        $checkId = (int) DB::table('checklist_templates')
            ->where('equipment_type_id', $equipmentId)
            ->where('label', 'Carcaça Trincada')
            ->where('active', true)
            ->value('id');
        $serviceId = DB::table('service_catalog')->insertGetId([
            'name' => 'Formatação completa',
            'category' => 'service',
            'price_cents' => 8000,
            'warranty_enabled' => false,
            'warranty_term' => null,
            'warranty_unit' => null,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $order = $this->actingAs($user)->postJson('/api/orders', [
            'client_id' => $client->id,
            'equipment_type_id' => $equipmentId,
            'attendance_type' => 'bench',
            'reported_problem' => 'Relato inicial',
            'checklist' => [],
            'items' => [],
        ])->assertCreated()->json();

        $this->patchJson("/api/orders/{$order['id']}", [
            'attendance_type' => 'bench',
            'reported_problem' => 'Relato corrigido pelo atendente',
            'final_report' => 'Formatação realizada. Cliente deve observar a saúde do SSD.',
            'checklist' => [['template_id' => $checkId]],
            'items' => [['catalog_id' => $serviceId, 'quantity' => 3]],
        ])->assertOk()
            ->assertJsonPath('reported_problem', 'Relato corrigido pelo atendente')
            ->assertJsonPath('final_report', 'Formatação realizada. Cliente deve observar a saúde do SSD.')
            ->assertJsonPath('items.0.quantity', 3);

        $this->assertDatabaseHas('service_order_checklists', [
            'service_order_id' => $order['id'],
            'label' => 'Carcaça Trincada',
        ]);
        $this->assertDatabaseHas('service_order_items', [
            'service_order_id' => $order['id'],
            'catalog_id' => $serviceId,
            'description' => 'Formatação completa',
            'quantity' => 3,
            'unit_price_cents' => 8000,
            'subtotal_cents' => 24000,
            'finalization_id' => null,
        ]);
        $this->assertDatabaseHas('service_orders', [
            'id' => $order['id'],
            'subtotal_cents' => 24000,
            'total_cents' => 24000,
            'final_report' => 'Formatação realizada. Cliente deve observar a saúde do SSD.',
        ]);

        $this->postJson("/api/orders/{$order['id']}/finalize", [
            'result' => 'repair_completed',
            'technical_report' => 'Formatação realizada. Cliente deve observar a saúde do SSD.',
            'discount_cents' => 0,
            'photo_ids' => [],
            'items' => [[
                'catalog_id' => $serviceId,
                'description' => 'Formatação completa',
                'quantity' => 3,
                'unit_price_cents' => 8000,
                'warranty_enabled' => false,
            ]],
        ])->assertCreated();

        $this->assertDatabaseHas('service_order_finalizations', [
            'service_order_id' => $order['id'],
            'technical_report' => 'Formatação realizada. Cliente deve observar a saúde do SSD.',
            'subtotal_cents' => 24000,
            'total_cents' => 24000,
        ]);
        $this->assertDatabaseHas('service_orders', [
            'id' => $order['id'],
            'status' => 'completed',
            'technical_report' => 'Formatação realizada. Cliente deve observar a saúde do SSD.',
            'final_report' => 'Formatação realizada. Cliente deve observar a saúde do SSD.',
        ]);
        $this->assertDatabaseHas('generated_documents', [
            'service_order_id' => $order['id'],
            'type' => 'final',
            'revision' => 1,
        ]);
    }

    public function test_active_order_can_change_client_and_equipment_with_audit_and_sync_unissued_term_snapshot(): void
    {
        $user = $this->master('identity-editor', 'Editor de identidade');
        $original = $this->client('Cliente Anterior', '11144477735', '35999990001');
        $replacement = $this->client('Cliente Novo', '12345678909', '35999990002');
        $equipmentId = (int) DB::table('equipment_types')->where('name', 'Notebook')->value('id');

        $order = $this->actingAs($user)->postJson('/api/orders', [
            'client_id' => $original->id,
            'equipment_type_id' => $equipmentId,
            'equipment_description' => 'Notebook Dell antigo + carregador',
            'attendance_type' => 'bench',
            'reported_problem' => 'Não liga',
            'checklist' => [],
            'items' => [],
        ])->assertCreated()->json();

        $this->patchJson("/api/orders/{$order['id']}", [
            'client_id' => $replacement->id,
            'equipment_description' => 'Notebook Dell Inspiron 15 + carregador e mochila',
        ])->assertOk()
            ->assertJsonPath('client.id', $replacement->id)
            ->assertJsonPath('client.name', 'Cliente Novo')
            ->assertJsonPath('equipment_description', 'Notebook Dell Inspiron 15 + carregador e mochila');

        $this->assertDatabaseHas('service_orders', [
            'id' => $order['id'],
            'client_id' => $replacement->id,
            'equipment_description' => 'Notebook Dell Inspiron 15 + carregador e mochila',
        ]);

        $snapshot = DB::table('service_order_snapshots')->where('service_order_id', $order['id'])->first();
        $snapshotClient = json_decode((string) $snapshot->client, true);
        $snapshotEquipment = json_decode((string) $snapshot->equipment, true);
        $this->assertSame($replacement->id, $snapshotClient['id']);
        $this->assertSame('Cliente Novo', $snapshotClient['name']);
        $this->assertSame('Notebook Dell Inspiron 15 + carregador e mochila', $snapshotEquipment['description']);

        $audit = DB::table('audit_logs')
            ->where('subject_type', 'service_order')
            ->where('subject_id', $order['id'])
            ->where('action', 'service_order.edited')
            ->latest('id')
            ->first();
        $before = json_decode((string) $audit->before, true);
        $after = json_decode((string) $audit->after, true);
        $this->assertSame($original->id, $before['client']['id']);
        $this->assertSame('Cliente Anterior', $before['client']['name']);
        $this->assertSame('Notebook Dell antigo + carregador', $before['equipment_description']);
        $this->assertSame($replacement->id, $after['client']['id']);
        $this->assertSame('Cliente Novo', $after['client']['name']);
        $this->assertSame('Notebook Dell Inspiron 15 + carregador e mochila', $after['equipment_description']);
    }

    public function test_client_change_after_term_issue_preserves_signed_snapshot(): void
    {
        $user = $this->master('signed-term-editor', 'Editor com termo');
        $original = $this->client('Cliente do Termo', '39053344705', '35999990003');
        $replacement = $this->client('Cliente Corrigido', '98765432100', '35999990004');
        $equipmentId = (int) DB::table('equipment_types')->where('name', 'Notebook')->value('id');

        $order = $this->actingAs($user)->postJson('/api/orders', [
            'client_id' => $original->id,
            'equipment_type_id' => $equipmentId,
            'equipment_description' => 'Notebook Lenovo + fonte',
            'attendance_type' => 'bench',
            'reported_problem' => 'Sem vídeo',
            'checklist' => [],
            'items' => [],
        ])->assertCreated()->json();

        DB::table('generated_documents')->insert([
            'service_order_id' => $order['id'],
            'type' => 'term',
            'revision' => 1,
            'path' => 'documents/term-issued-test.pdf',
            'sha256' => str_repeat('a', 64),
            'snapshot' => json_encode(['client' => $original->toArray()]),
            'issued_at' => now(),
            'issued_by' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->patchJson("/api/orders/{$order['id']}", [
            'client_id' => $replacement->id,
        ])->assertOk()
            ->assertJsonPath('client.id', $replacement->id)
            ->assertJsonPath('client.name', 'Cliente Corrigido');

        $snapshot = DB::table('service_order_snapshots')->where('service_order_id', $order['id'])->first();
        $snapshotClient = json_decode((string) $snapshot->client, true);
        $this->assertSame($original->id, $snapshotClient['id']);
        $this->assertSame('Cliente do Termo', $snapshotClient['name']);

        $audit = DB::table('audit_logs')
            ->where('subject_type', 'service_order')
            ->where('subject_id', $order['id'])
            ->where('action', 'service_order.edited')
            ->latest('id')
            ->first();
        $after = json_decode((string) $audit->after, true);
        $this->assertSame($replacement->id, $after['client']['id']);
        $this->assertSame('Cliente Corrigido', $after['client']['name']);
    }

    public function test_finalized_and_paid_orders_reject_identity_edits(): void
    {
        $user = $this->master('immutable-editor', 'Editor imutável');
        $client = $this->client('Cliente Imutável', '93541134780', '35999990005');
        $replacement = $this->client('Outro Cliente', '16899535009', '35999990006');
        $equipmentId = (int) DB::table('equipment_types')->where('name', 'Notebook')->value('id');

        $finalized = $this->actingAs($user)->postJson('/api/orders', [
            'client_id' => $client->id,
            'equipment_type_id' => $equipmentId,
            'equipment_description' => 'Notebook finalizado',
            'attendance_type' => 'bench',
            'reported_problem' => 'Teste',
            'checklist' => [],
            'items' => [],
        ])->assertCreated()->json();
        DB::table('service_orders')->where('id', $finalized['id'])->update(['status' => 'completed', 'completed_at' => now()]);

        $this->patchJson("/api/orders/{$finalized['id']}", [
            'client_id' => $replacement->id,
        ])->assertStatus(422);

        $paid = $this->postJson('/api/orders', [
            'client_id' => $client->id,
            'equipment_type_id' => $equipmentId,
            'equipment_description' => 'Notebook pago',
            'attendance_type' => 'bench',
            'reported_problem' => 'Teste pago',
            'checklist' => [],
            'items' => [],
        ])->assertCreated()->json();
        DB::table('service_orders')->where('id', $paid['id'])->update([
            'status' => 'completed',
            'completed_at' => now(),
            'archived' => true,
        ]);

        $this->patchJson("/api/orders/{$paid['id']}", [
            'equipment_description' => 'Tentativa de alteração',
        ])->assertStatus(422);
    }

    private function master(string $login, string $name): User
    {
        return User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => $name,
            'login' => $login,
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
    }

    private function client(string $name, string $document, string $phone): Client
    {
        return Client::create([
            'name' => $name,
            'document' => $document,
            'phone' => $phone,
            'postal_code' => '37160000',
            'street' => 'Rua dos Testes',
            'number' => '20',
            'district' => 'Centro',
            'city' => 'Campos Gerais',
            'state' => 'MG',
        ]);
    }
}
