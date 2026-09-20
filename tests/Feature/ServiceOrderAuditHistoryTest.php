<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ServiceOrderAuditHistoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_history_is_read_only_human_readable_and_includes_client_and_completed_order_corrections(): void
    {
        $user = User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => 'Responsável pelo histórico',
            'login' => 'audit-history-master',
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
        $original = $this->client('Cliente Anterior', '11111111111', '35999993001');
        $replacement = $this->client('Cliente Novo', '22222222222', '35999993002');
        $equipmentId = (int) DB::table('equipment_types')->where('name', 'Notebook')->value('id');

        $order = $this->actingAs($user)->postJson('/api/orders', [
            'client_id' => $original->id,
            'equipment_type_id' => $equipmentId,
            'attendance_type' => 'bench',
            'reported_problem' => 'Falha inicial',
            'checklist' => [],
            'items' => [],
        ])->assertCreated()->json();

        $this->patchJson("/api/orders/{$order['id']}", [
            'equipment_description' => 'Notebook inicial + carregador',
        ])->assertOk();

        $this->patchJson("/api/orders/{$order['id']}", [
            'client_id' => $replacement->id,
        ])->assertOk();

        DB::table('service_orders')->where('id', $order['id'])->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        $this->patchJson("/api/orders/{$order['id']}", [
            'attendance_type' => 'external',
            'reported_problem' => 'Problema corrigido após finalização',
            'equipment_description' => 'Notebook finalizado corrigido',
        ])->assertOk();

        $response = $this->getJson("/api/orders/{$order['id']}/audit-history")->assertOk();
        $history = $response->json();
        $changes = collect($history)->pluck('changes')->flatten()->all();

        $this->assertContains('Cliente alterado de Cliente Anterior para Cliente Novo', $changes);
        $this->assertContains('Equipamento alterado de Notebook inicial + carregador para Notebook finalizado corrigido', $changes);
        $this->assertContains('Atendimento alterado de Bancada para Externo', $changes);
        $this->assertContains('Problema relatado alterado de Falha inicial para Problema corrigido após finalização', $changes);
        $this->assertTrue(collect($history)->contains(fn ($entry) => $entry['user'] === 'Responsável pelo histórico'));
        $this->assertTrue(collect($history)->every(fn ($entry) => ! empty($entry['created_at']) && ! empty($entry['action'])));

        $serialized = json_encode($history, JSON_UNESCAPED_UNICODE);
        foreach (['service_order.edited', 'client_id', 'equipment_description', 'attendance_type', 'reported_problem', '"before"', '"after"'] as $technical) {
            $this->assertStringNotContainsString($technical, $serialized);
        }

        $this->postJson("/api/orders/{$order['id']}/audit-history", [])->assertStatus(405);
    }

    private function client(string $name, string $document, string $phone): Client
    {
        return Client::create([
            'name' => $name,
            'document' => $document,
            'phone' => $phone,
            'postal_code' => '37160000',
            'street' => 'Rua Histórico',
            'number' => '10',
            'district' => 'Centro',
            'city' => 'Campos Gerais',
            'state' => 'MG',
        ]);
    }
}
