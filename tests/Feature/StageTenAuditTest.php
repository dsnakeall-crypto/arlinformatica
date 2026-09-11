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
        ]);
        $detail = $this->getJson("/api/orders/{$order->id}")->assertOk()->json();
        $this->assertStringContainsString('wa.me', $detail['mobile_actions']['whatsapp_url']);
        $message = urldecode(parse_url($detail['mobile_actions']['whatsapp_url'], PHP_URL_QUERY) ?? '');
        $this->assertStringContainsString('OS #7555555', $message);
        $this->assertStringContainsString('Tela riscada: lado esquerdo', $message);
        $this->assertStringContainsString('google.com/maps', $detail['mobile_actions']['maps_url']);
    }

    public function test_general_warranty_is_persisted_snapshotted_and_omitted_when_disabled(): void
    {
        $user = $this->user('Master', 'warranty-master');
        $settings = app(CompanySettings::class);
        $payload = $settings->all();
        $payload['warranty_general_enabled'] = true;
        $payload['warranty_general_text'] = 'Garantia geral original preservada no documento.';
        $saved = $this->actingAs($user)->putJson('/api/settings', $payload)->assertOk();
        $saved->assertJsonPath('warranty_general_enabled', '1')->assertJsonPath('warranty_general_text', 'Garantia geral original preservada no documento.');
        $this->assertArrayNotHasKey('layout_mode', $saved->json());

        $client = $this->client();
        $order = ServiceOrder::create([
            'number' => '7666666', 'client_id' => $client->id, 'equipment_type_id' => DB::table('equipment_types')->value('id'),
            'attendance_type' => 'bench', 'status' => 'analysis', 'reported_problem' => 'Teste garantia', 'received_at' => now(), 'created_by' => $user->id,
        ]);
        $order->snapshot()->create(['client' => $client->toArray(), 'company' => $settings->snapshot(), 'equipment' => ['name' => 'Notebook'], 'term_text' => $payload['term_text']]);
        $this->postJson("/api/orders/{$order->id}/finalize", [
            'result' => 'repair_completed', 'technical_report' => 'Reparo concluído', 'discount_cents' => 0,
            'items' => [['description' => 'Serviço sem garantia adicional', 'quantity' => 1, 'unit_price_cents' => 10000, 'warranty_enabled' => false]],
        ])->assertCreated();

        DB::table('settings')->where('key', 'warranty_general_text')->update(['value' => 'Texto alterado depois da emissão']);
        $snapshot = json_decode(DB::table('generated_documents')->where(['service_order_id' => $order->id, 'type' => 'final'])->value('snapshot'), true);
        $this->assertSame('Garantia geral original preservada no documento.', $snapshot['company']['warranty_general_text']);
        $html = view('documents.final', $snapshot)->render();
        $this->assertStringContainsString('GARANTIA GERAL', $html);
        $this->assertStringContainsString('Garantia geral original preservada no documento.', $html);
        $this->assertStringNotContainsString('Garantia:', $html);

        $snapshot['company']['warranty_general_enabled'] = '0';
        $hidden = view('documents.final', $snapshot)->render();
        $this->assertStringNotContainsString('GARANTIA GERAL', $hidden);
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
