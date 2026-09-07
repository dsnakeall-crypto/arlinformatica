<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceOrderWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function master(): User
    {
        $this->seed(DatabaseSeeder::class);
        $role = Role::where('name', 'Master')->firstOrFail();

        return User::create([
            'role_id' => $role->id,
            'name' => 'Master Fluxo',
            'login' => 'master-workflow',
            'password' => bcrypt('safe-password'),
            'active' => true,
        ]);
    }

    private function order(User $user): ServiceOrder
    {
        $client = $this->actingAs($user)->postJson('/api/clients', [
            'name' => 'Cliente Fluxo',
            'document' => '52998224725',
            'phone' => '35999999999',
            'postal_code' => '37160000',
            'street' => 'Rua Principal',
            'number' => '10',
            'district' => 'Centro',
            'city' => 'Campos Gerais',
            'state' => 'MG',
        ])->assertCreated()->json();
        $equipment = \DB::table('equipment_types')->where('name', 'Notebook')->value('id');
        $created = $this->postJson('/api/orders', [
            'client_id' => $client['id'],
            'equipment_type_id' => $equipment,
            'attendance_type' => 'bench',
            'reported_problem' => 'Equipamento em teste de fluxo.',
            'checklist' => [],
        ])->assertCreated()->json();

        return ServiceOrder::findOrFail($created['id']);
    }

    public function test_interruption_reason_is_required_and_cleared_when_status_changes(): void
    {
        $user = $this->master();
        $order = $this->order($user);

        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'interrupted'])
            ->assertStatus(422);

        $this->patchJson("/api/orders/{$order->id}/status", [
            'status' => 'interrupted',
            'interruption_reason' => 'Cliente pediu pausa enquanto aguarda decisão do orçamento.',
        ])->assertOk()
            ->assertJsonPath('status', 'interrupted')
            ->assertJsonPath('interruption_reason', 'Cliente pediu pausa enquanto aguarda decisão do orçamento.');
        $this->assertDatabaseHas('service_orders', ['id' => $order->id, 'technical_report' => 'Cliente pediu pausa enquanto aguarda decisão do orçamento.']);

        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'analysis'])
            ->assertOk()
            ->assertJsonPath('status', 'analysis')
            ->assertJsonPath('interruption_reason', null);
        $this->assertDatabaseHas('service_orders', ['id' => $order->id, 'technical_report' => null]);
    }

    public function test_in_service_is_accepted_and_interrupted_order_cannot_be_finalized(): void
    {
        $user = $this->master();
        $order = $this->order($user);

        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'in_service'])
            ->assertOk()
            ->assertJsonPath('status', 'in_service');
        $this->assertDatabaseHas('service_orders', ['id' => $order->id, 'status' => 'in_service']);
        $this->assertDatabaseHas('status_history', [
            'service_order_id' => $order->id,
            'to_status' => 'in_service',
        ]);
        $this->getJson('/api/orders/desk')
            ->assertOk()
            ->assertJsonFragment(['id' => $order->id, 'status' => 'in_service']);

        $this->patchJson("/api/orders/{$order->id}/status", [
            'status' => 'interrupted',
            'interruption_reason' => 'Cliente pediu a interrupção do atendimento.',
        ])->assertOk();

        $this->postJson("/api/orders/{$order->id}/finalize", [])->assertStatus(409);
    }

    public function test_paid_archives_only_completed_order_with_no_balance_and_finalized_list_returns_it(): void
    {
        $user = $this->master();
        $order = $this->order($user);
        $order->forceFill([
            'status' => 'completed',
            'completed_at' => now(),
            'result' => 'repair_completed',
            'subtotal_cents' => 10000,
            'total_cents' => 10000,
        ])->save();

        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'paid'])
            ->assertStatus(422);

        $this->postJson("/api/orders/{$order->id}/payment", [
            'amount_cents' => 10000,
            'method' => 'pix',
            'idempotency_key' => 'workflow-paid-order-1',
        ])->assertCreated();

        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'paid'])
            ->assertOk()
            ->assertJsonPath('archived', 1)
            ->assertJsonPath('display_status', 'paid');

        $this->getJson('/api/orders')
            ->assertOk()
            ->assertJsonMissing(['id' => $order->id]);

        $this->getJson('/api/orders?finalized=1')
            ->assertOk()
            ->assertJsonFragment(['id' => $order->id, 'archived' => 1]);

        $this->assertDatabaseHas('status_history', [
            'service_order_id' => $order->id,
            'to_status' => 'paid',
        ]);
    }
}
