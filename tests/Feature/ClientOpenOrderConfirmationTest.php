<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use App\Services\OpeningMessage;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ClientOpenOrderConfirmationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $user = User::create(['role_id' => Role::where('name', 'Master')->value('id'), 'name' => 'Teste', 'login' => 'confirmation-test', 'password' => bcrypt('Teste!123'), 'active' => true]);
        $this->actingAs($user);
    }

    private function payload(): array
    {
        $client = Client::create(['name' => 'Cliente Confirmação', 'document' => '52998224725', 'phone' => '35999999999', 'street' => 'Rua Teste', 'number' => '1', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG', 'postal_code' => '37160000']);

        return ['client_id' => $client->id, 'equipment_type_id' => DB::table('equipment_types')->value('id'), 'attendance_type' => 'bench', 'reported_problem' => "Não liga\nApós queda", 'system_password_absent' => true];
    }

    public function test_opening_message_selects_attendance_and_preserves_paragraphs_and_settings_permissions(): void
    {
        $settings = $this->getJson('/api/settings')->assertOk()->json();
        $this->assertSame('0', $settings['order_opened_auto_whatsapp']);
        $settings['order_opened_auto_whatsapp'] = true;
        $settings['order_opened_internal_message'] = "Interno {{nome_cliente}}\n\nOS {{numero_os}}";
        $this->putJson('/api/settings', $settings)->assertOk();
        $this->getJson('/api/operational-settings')->assertJsonPath('order_opened_auto_whatsapp', true);
        $payload = $this->payload();
        $created = $this->postJson('/api/orders', [...$payload, 'attendance_type' => 'external'])->assertCreated()->json();
        $this->assertTrue($created['opening_whatsapp']['auto_open']);
        parse_str(parse_url($created['opening_whatsapp']['url'], PHP_URL_QUERY), $query);
        $this->assertSame(strtr(OpeningMessage::EXTERNAL, ['{{nome_cliente}}' => 'Cliente Confirmação', '{{numero_os}}' => $created['number']]), $query['text']);
        $this->getJson('/api/orders/'.$created['id'])->assertJsonPath('opening_whatsapp.url', $created['opening_whatsapp']['url']);
        $settings['order_opened_auto_whatsapp'] = false;
        $this->putJson('/api/settings', $settings)->assertOk();
        $internal = $this->postJson('/api/orders', [...$payload, 'confirmed_open_order_ids' => [$created['id']]])->assertCreated()->json();
        $this->assertFalse($internal['opening_whatsapp']['auto_open']);
        parse_str(parse_url($internal['opening_whatsapp']['url'], PHP_URL_QUERY), $query);
        $this->assertSame("Interno Cliente Confirmação\n\nOS ".$internal['number'], $query['text']);
        $employee = User::create(['role_id' => Role::where('name', 'Funcionário')->value('id'), 'name' => 'Operador', 'login' => 'opening-employee', 'password' => bcrypt('Teste!123'), 'active' => true]);
        $this->actingAs($employee)->putJson('/api/settings', $settings)->assertForbidden();
    }

    public function test_second_opening_requires_confirmation_and_does_not_create_anything_on_cancel(): void
    {
        $payload = $this->payload();
        $first = $this->postJson('/api/orders', $payload)->assertCreated()->json();
        $this->getJson('/api/clients/'.$payload['client_id'].'/open-orders')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.reported_problem', $payload['reported_problem'])
            ->assertJsonMissingPath('data.0.system_password');
        $this->postJson('/api/orders', $payload)->assertConflict()
            ->assertJsonPath('code', 'CLIENT_HAS_OPEN_ORDERS')->assertJsonPath('open_orders.0.number', $first['number']);
        $this->assertDatabaseCount('service_orders', 1);
        $this->assertDatabaseCount('service_order_snapshots', 1);
        $this->postJson('/api/orders', [...$payload, 'confirmed_open_order_ids' => [$first['id']]])->assertCreated();
        $this->assertDatabaseCount('service_orders', 2);
    }

    public function test_old_confirmation_cannot_silently_accept_another_concurrent_opening(): void
    {
        $payload = $this->payload();
        $first = $this->postJson('/api/orders', $payload)->assertCreated()->json();
        $second = $this->postJson('/api/orders', [...$payload, 'confirmed_open_order_ids' => [$first['id']]])->assertCreated()->json();
        $this->postJson('/api/orders', [...$payload, 'confirmed_open_order_ids' => [$first['id']]])
            ->assertConflict()->assertJsonCount(2, 'open_orders');
        $this->assertDatabaseCount('service_orders', 2);
        $this->postJson('/api/orders', [...$payload, 'confirmed_open_order_ids' => [$first['id'], $second['id']]])->assertCreated();
    }

    public function test_completed_and_interrupted_orders_do_not_require_confirmation_but_reopened_orders_do(): void
    {
        $payload = $this->payload();
        $first = $this->postJson('/api/orders', $payload)->assertCreated()->json();
        ServiceOrder::findOrFail($first['id'])->update(['status' => 'completed']);
        $second = $this->postJson('/api/orders', $payload)->assertCreated()->json();
        ServiceOrder::findOrFail($second['id'])->update(['status' => 'interrupted']);
        $this->getJson('/api/clients/'.$payload['client_id'].'/open-orders')->assertJsonCount(0, 'data');
        ServiceOrder::findOrFail($first['id'])->update(['status' => 'analysis']);
        $this->postJson('/api/orders', $payload)->assertConflict();
    }

    public function test_private_session_response_supplies_identity_and_token_together(): void
    {
        $response = $this->getJson('/api/me')->assertOk()->assertJsonPath('role', 'Master');
        $this->assertNotEmpty($response->json('csrf_token'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertNotSame('true', $response->headers->get('Access-Control-Allow-Credentials'));
        $payload = $this->payload();
        $user = User::create(['role_id' => Role::where('name', 'Controle de Gasto')->value('id'), 'name' => 'Restrito', 'login' => 'restricted-confirmation', 'password' => bcrypt('Teste!123'), 'active' => true]);
        $this->actingAs($user)->getJson('/api/clients/'.$payload['client_id'].'/open-orders')->assertForbidden();
    }
}
