<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
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
