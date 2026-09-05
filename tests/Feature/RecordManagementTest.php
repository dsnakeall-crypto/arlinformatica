<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RecordManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
    }

    public function test_client_can_be_removed_from_lists_without_breaking_historical_orders(): void
    {
        $user = $this->master('record-client-master');
        $client = $this->client('Cliente Removível', '52998224725');
        $order = $this->actingAs($user)->postJson('/api/orders', [
            'client_id' => $client->id,
            'equipment_type_id' => DB::table('equipment_types')->value('id'),
            'manufacturer_id' => null,
            'attendance_type' => 'bench',
            'reported_problem' => 'Equipamento recebido antes da exclusão do cadastro.',
            'checklist' => [],
            'items' => [],
        ])->assertCreated()->json();

        $this->deleteJson("/api/clients/{$client->id}")
            ->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertSoftDeleted('clients', ['id' => $client->id]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'client.deleted',
            'subject_id' => $client->id,
        ]);

        $this->getJson('/api/clients')->assertOk()->assertJsonMissing(['id' => $client->id]);
        $this->getJson("/api/orders/{$order['id']}")
            ->assertOk()
            ->assertJsonPath('client.name', 'Cliente Removível');
    }

    public function test_active_and_paid_orders_are_soft_deleted_but_financial_and_document_history_is_preserved(): void
    {
        $user = $this->master('record-order-master');
        $client = $this->client('Cliente OS', '11144477735');

        $active = $this->actingAs($user)->postJson('/api/orders', [
            'client_id' => $client->id,
            'equipment_type_id' => DB::table('equipment_types')->value('id'),
            'attendance_type' => 'bench',
            'reported_problem' => 'OS ativa para exclusão lógica.',
            'checklist' => [],
            'items' => [],
        ])->assertCreated()->json();

        $this->deleteJson("/api/orders/{$active['id']}")->assertOk();
        $this->assertSoftDeleted('service_orders', ['id' => $active['id']]);
        $this->getJson("/api/orders/{$active['id']}")->assertNotFound();

        $paid = $this->actingAs($user)->postJson('/api/orders', [
            'client_id' => $client->id,
            'equipment_type_id' => DB::table('equipment_types')->value('id'),
            'attendance_type' => 'external',
            'reported_problem' => 'OS finalizada para exclusão lógica.',
            'checklist' => [],
            'items' => [],
        ])->assertCreated()->json();
        ServiceOrder::findOrFail($paid['id'])->forceFill([
            'status' => 'completed',
            'archived' => true,
            'completed_at' => now(),
        ])->save();

        DB::table('generated_documents')->insert([
            'service_order_id' => $paid['id'],
            'type' => 'final',
            'revision' => 1,
            'path' => 'documents/test-final.pdf',
            'sha256' => str_repeat('a', 64),
            'snapshot' => json_encode(['test' => true]),
            'issued_at' => now(),
            'issued_by' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->deleteJson("/api/orders/{$paid['id']}")
            ->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertSoftDeleted('service_orders', ['id' => $paid['id']]);
        $this->assertDatabaseHas('generated_documents', [
            'service_order_id' => $paid['id'],
            'type' => 'final',
            'revision' => 1,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'service_order.deleted',
            'subject_id' => $paid['id'],
        ]);

        $finalized = $this->getJson('/api/orders?finalized=1')->assertOk()->json('data');
        $this->assertNotContains($paid['id'], array_column($finalized, 'id'));
    }

    private function master(string $login): User
    {
        return User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => 'Master Registros',
            'login' => $login,
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
    }

    private function client(string $name, string $document): Client
    {
        return Client::create([
            'name' => $name,
            'document' => $document,
            'phone' => '35999998888',
            'postal_code' => '37160000',
            'street' => 'Rua dos Registros',
            'number' => '10',
            'district' => 'Centro',
            'city' => 'Campos Gerais',
            'state' => 'MG',
        ]);
    }
}
