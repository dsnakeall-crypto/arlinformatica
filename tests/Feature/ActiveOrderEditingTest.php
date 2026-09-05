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
}
