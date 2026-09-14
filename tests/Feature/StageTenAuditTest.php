<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use App\Services\CompanySettings;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StageTenAuditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
    }

    public function test_desk_returns_every_open_order_beyond_the_twenty_item_listing_page(): void
    {
        $user = $this->user('Master', 'desk-master');
        $client = $this->client();
        $equipment = DB::table('equipment_types')->value('id');
        for ($i = 1; $i <= 25; $i++) {
            ServiceOrder::create([
                'number' => str_pad((string) (7000000 + $i), 7, '0', STR_PAD_LEFT),
                'client_id' => $client->id,
                'equipment_type_id' => $equipment,
                'attendance_type' => 'bench',
                'status' => ['analysis', 'waiting_part', 'in_service'][($i - 1) % 3],
                'reported_problem' => "Chamado aberto {$i}",
                'received_at' => now()->subMinutes($i),
                'created_by' => $user->id,
            ]);
        }
        ServiceOrder::create([
            'number' => '7999999', 'client_id' => $client->id, 'equipment_type_id' => $equipment, 'attendance_type' => 'bench',
            'status' => 'completed', 'reported_problem' => 'Chamado encerrado', 'received_at' => now(), 'completed_at' => now(), 'created_by' => $user->id,
        ]);

        $this->actingAs($user)->getJson('/api/orders?page=1')->assertOk()->assertJsonPath('per_page', 50)->assertJsonCount(26, 'data');
        $desk = $this->getJson('/api/orders/desk')->assertOk()->assertJsonCount(25)->json();
        $this->assertTrue(collect($desk)->contains(fn ($order) => $order['status'] === 'analysis'));
        $this->assertTrue(collect($desk)->contains(fn ($order) => $order['status'] === 'waiting_part'));
        $this->assertTrue(collect($desk)->contains(fn ($order) => $order['status'] === 'in_service'));
        $this->assertFalse(collect($desk)->contains(fn ($order) => $order['status'] === 'completed'));
    }

    public function test_me_exposes_only_safe_role_context_and_external_order_has_mobile_contact_actions(): void
    {
        $user = $this->user('Funcionário', 'field-tech');
        $client = $this->client();
        $order = ServiceOrder::create([
            'number' => '7555555', 'client_id' => $client->id, 'equipment_type_id' => DB::table('equipment_types')->value('id'),
            'attendance_type' => 'external', 'status' => 'analysis', 'reported_problem' => 'Atendimento em campo', 'received_at' => now(), 'created_by' => $user->id,
        ]);
        $order->checklists()->create(['label' => 'Tela riscada', 'note' => 'lado esquerdo']);

        $this->actingAs($user)->getJson('/api/me')->assertOk()->assertExactJson([
            'id' => $user->id, 'name' => $user->name, 'login' => $user->login, 'role' => 'Funcionário',
            'sidebar_pinned' => false,
        ]);
        $detail = $this->getJson("/api/orders/{$order->id}")->assertOk()->json();
        $this->assertStringContainsString('wa.me', $detail['mobile_actions']['whatsapp_url']);
        $message = urldecode(parse_url($detail['mobile_actions']['whatsapp_url'], PHP_URL_QUERY) ?? '');
        $this->assertStringContainsString('OS #7555555', $message);
        $this->assertStringContainsString('Tela riscada: lado esquerdo', $message);
        $this->assertStringContainsString('google.com/maps', $detail['mobile_actions']['maps_url']);
    }

    public function test_item_warranty_visibility_is_snapshotted_per_finalization_and_preserves_historical_value(): void
    {
        $user = $this->user('Master', 'warranty-master');
        $this->actingAs($user);
        $settings = app(CompanySettings::class);
        $catalog = DB::table('service_catalog')->insertGetId([
            'name' => 'Reparo com garantia', 'category' => 'service', 'price_cents' => 10000,
            'warranty_enabled' => true, 'warranty_term' => 30, 'warranty_unit' => 'days',
            'active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $client = $this->client();
        $order = ServiceOrder::create([
            'number' => '7666666', 'client_id' => $client->id, 'equipment_type_id' => DB::table('equipment_types')->value('id'),
            'attendance_type' => 'bench', 'status' => 'analysis', 'reported_problem' => 'Teste garantia', 'received_at' => now(), 'created_by' => $user->id,
        ]);
        $order->snapshot()->create(['client' => $client->toArray(), 'company' => $settings->snapshot(), 'equipment' => ['name' => 'Notebook'], 'term_text' => $settings->all()['term_text']]);
        $this->postJson("/api/orders/{$order->id}/finalize", [
            'result' => 'repair_completed', 'technical_report' => 'Reparo concluído', 'discount_cents' => 0,
            'show_item_warranties' => true,
            'items' => [
                ['catalog_id' => $catalog, 'description' => 'Reparo com garantia', 'quantity' => 1, 'unit_price_cents' => 10000, 'warranty_enabled' => true, 'warranty_term' => 30, 'warranty_unit' => 'days'],
                ['description' => 'Serviço sem garantia', 'quantity' => 1, 'unit_price_cents' => 5000, 'warranty_enabled' => false],
            ],
        ])->assertCreated();

        DB::table('service_catalog')->where('id', $catalog)->update(['warranty_term' => 90, 'updated_at' => now()]);
        $snapshot = json_decode(DB::table('generated_documents')->where(['service_order_id' => $order->id, 'type' => 'final'])->value('snapshot'), true);
        $this->assertTrue($snapshot['show_item_warranties']);
        $this->assertSame(30, json_decode($snapshot['items'][0]['warranty_snapshot'], true)['term']);
        $html = view('documents.final', $snapshot)->render();
        $this->assertStringContainsString('Garantia adicional: 30 dias', $html);
        $this->assertSame(1, substr_count($html, 'Garantia adicional:'));
        $this->assertStringNotContainsString('90 dias', $html);

        $hiddenOrder = ServiceOrder::create([
            'number' => '7666667', 'client_id' => $client->id, 'equipment_type_id' => DB::table('equipment_types')->value('id'),
            'attendance_type' => 'bench', 'status' => 'analysis', 'reported_problem' => 'Teste garantia oculta', 'received_at' => now(), 'created_by' => $user->id,
        ]);
        $hiddenOrder->snapshot()->create(['client' => $client->toArray(), 'company' => $settings->snapshot(), 'equipment' => ['name' => 'Notebook'], 'term_text' => $settings->all()['term_text']]);
        $this->postJson("/api/orders/{$hiddenOrder->id}/finalize", [
            'result' => 'repair_completed', 'technical_report' => 'Reparo concluído', 'discount_cents' => 0,
            'show_item_warranties' => false,
            'items' => [['catalog_id' => $catalog, 'description' => 'Reparo com garantia', 'quantity' => 1, 'unit_price_cents' => 10000, 'warranty_enabled' => true, 'warranty_term' => 90, 'warranty_unit' => 'days']],
        ])->assertCreated();
        $hiddenSnapshot = json_decode(DB::table('generated_documents')->where(['service_order_id' => $hiddenOrder->id, 'type' => 'final'])->value('snapshot'), true);
        $this->assertFalse($hiddenSnapshot['show_item_warranties']);
        $this->assertStringNotContainsString('Garantia adicional:', view('documents.final', $hiddenSnapshot)->render());
    }

    private function user(string $role, string $login): User
    {
        return User::create([
            'role_id' => Role::where('name', $role)->value('id'), 'name' => $role, 'login' => $login, 'password' => 'Senha#Forte123', 'active' => true,
        ]);
    }

    private function client(): Client
    {
        return Client::create([
            'name' => 'Cliente Auditoria', 'document' => '52998224725', 'phone' => '34999998888', 'postal_code' => '38400000',
            'street' => 'Rua Central', 'number' => '10', 'district' => 'Centro', 'city' => 'Uberlândia', 'state' => 'MG',
        ]);
    }
}
