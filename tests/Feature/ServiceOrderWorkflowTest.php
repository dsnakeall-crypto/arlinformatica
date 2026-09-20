<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

    public function test_interruption_requires_reason_and_work_done(): void
    {
        $user = $this->master();
        $order = $this->order($user);

        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'interrupted'])
            ->assertStatus(422);

        $this->patchJson("/api/orders/{$order->id}/status", [
            'status' => 'interrupted',
            'interruption_reason' => 'Cliente pediu pausa enquanto aguarda decisão do orçamento.',
        ])->assertStatus(422);

        $this->patchJson("/api/orders/{$order->id}/status", [
            'status' => 'interrupted',
            'interruption_reason' => 'Cliente pediu pausa enquanto aguarda decisão do orçamento.',
            'interruption_work_done' => 'Somente diagnóstico visual, sem reparo.',
        ])->assertOk()
            ->assertJsonPath('status', 'interrupted')
            ->assertJsonPath('interruption_reason', 'Cliente pediu pausa enquanto aguarda decisão do orçamento.')
            ->assertJsonPath('interruption_work_done', 'Somente diagnóstico visual, sem reparo.');
    }

    public function test_in_service_is_accepted_and_interruption_closes_without_finance_and_cannot_be_reopened(): void
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

        DB::table('service_order_items')->insert([
            'service_order_id' => $order->id,
            'description' => 'Diagnóstico de bancada',
            'quantity' => 1,
            'unit_price_cents' => 8500,
            'subtotal_cents' => 8500,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $order->forceFill(['subtotal_cents' => 8500, 'discount_cents' => 500, 'total_cents' => 8000])->save();

        $this->patchJson("/api/orders/{$order->id}/status", [
            'status' => 'interrupted',
            'interruption_reason' => 'Cliente pediu a interrupção do atendimento.',
            'interruption_work_done' => 'Diagnóstico inicial realizado; nenhuma peça foi substituída.',
        ])->assertOk()
            ->assertJsonPath('status', 'interrupted')
            ->assertJsonPath('total_cents', 0);

        $closed = ServiceOrder::findOrFail($order->id);
        $this->assertNotNull($closed->completed_at);
        $this->assertSame(0, (int) $closed->subtotal_cents);
        $this->assertSame(0, (int) $closed->discount_cents);
        $this->assertSame(0, (int) $closed->total_cents);
        $this->assertSame('Diagnóstico inicial realizado; nenhuma peça foi substituída.', $closed->interruption_work_done);
        $this->assertDatabaseMissing('service_order_items', ['service_order_id' => $order->id]);
        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('financial_transactions', 0);
        $date = now('America/Sao_Paulo')->format('Y-m-d');
        $period = now('America/Sao_Paulo')->format('Y-m');
        $this->getJson('/api/finance/receivables')
            ->assertOk()
            ->assertJsonPath('count', 0)
            ->assertJsonPath('total_balance_cents', 0);
        $this->getJson("/api/finance/daily?date={$date}")
            ->assertOk()
            ->assertJsonPath('total_cents', 0)
            ->assertJsonPath('transactions', []);
        $this->getJson("/api/finance/month?period={$period}")
            ->assertOk()
            ->assertJsonPath('total_cents', 0)
            ->assertJsonPath('service_orders_cents', 0)
            ->assertJsonPath('paid_orders', 0);

        $this->getJson('/api/orders/desk')->assertOk()->assertJsonMissing(['id' => $order->id]);
        $this->getJson('/api/orders?tab=interrupted')
            ->assertOk()
            ->assertJsonFragment(['id' => $order->id, 'status' => 'interrupted'])
            ->assertJsonPath('total', 1)
            ->assertJsonPath('summary.completed_week', 1);

        $this->postJson("/api/orders/{$order->id}/finalize", [])->assertStatus(409);
        $this->postJson("/api/orders/{$order->id}/reopen", ['note' => 'Tentativa proibida.'])
            ->assertStatus(422);
        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'analysis'])
            ->assertStatus(422);
        $this->postJson("/api/orders/{$order->id}/payment", [
            'amount_cents' => 100,
            'method' => 'pix',
            'idempotency_key' => 'interrupted-payment-prohibited',
        ])->assertStatus(422);
    }

    public function test_order_with_payment_cannot_be_interrupted_and_is_left_unchanged(): void
    {
        $user = $this->master();
        $order = $this->order($user);
        DB::table('service_order_items')->insert([
            'service_order_id' => $order->id,
            'description' => 'Serviço já pago',
            'quantity' => 1,
            'unit_price_cents' => 10000,
            'subtotal_cents' => 10000,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $order->forceFill(['subtotal_cents' => 10000, 'total_cents' => 10000])->save();
        $this->postJson("/api/orders/{$order->id}/payment", [
            'amount_cents' => 5000,
            'method' => 'pix',
            'idempotency_key' => 'paid-before-interruption',
        ])->assertCreated();

        $this->patchJson("/api/orders/{$order->id}/status", [
            'status' => 'interrupted',
            'interruption_reason' => 'Cliente pediu para encerrar.',
            'interruption_work_done' => 'Diagnóstico realizado.',
        ])->assertStatus(409)
            ->assertJsonFragment(['message' => 'Esta OS possui pagamento registrado e não pode ser interrompida. Preserve este atendimento e use o fluxo normal de finalização.']);

        $this->assertDatabaseHas('service_orders', [
            'id' => $order->id,
            'status' => 'analysis',
            'total_cents' => 10000,
        ]);
        $this->assertDatabaseHas('service_order_items', ['service_order_id' => $order->id, 'description' => 'Serviço já pago']);
        $this->assertDatabaseHas('payments', ['service_order_id' => $order->id, 'amount_cents' => 5000]);
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

        // Sem filtro, a rota representa a aba Todas: o histórico inclui OS pagas/arquivadas.
        $this->getJson('/api/orders')
            ->assertOk()
            ->assertJsonFragment(['id' => $order->id, 'archived' => 1]);

        // As abas operacionais continuam excluindo a OS arquivada.
        $this->getJson('/api/orders?tab=progress')->assertOk()->assertJsonMissing(['id' => $order->id]);
        $this->getJson('/api/orders?tab=interrupted')->assertOk()->assertJsonMissing(['id' => $order->id]);
        $this->getJson('/api/orders?tab=finalized')->assertOk()->assertJsonFragment(['id' => $order->id, 'archived' => 1]);

        $this->getJson('/api/orders?finalized=1')
            ->assertOk()
            ->assertJsonFragment(['id' => $order->id, 'archived' => 1]);

        $this->assertDatabaseHas('status_history', [
            'service_order_id' => $order->id,
            'to_status' => 'paid',
        ]);
    }

    public function test_existing_unpaid_completion_is_presented_as_awaiting_payment_and_can_be_paid_from_status(): void
    {
        $user = $this->master();
        $order = $this->order($user);
        $order->forceFill([
            'status' => 'completed',
            'completed_at' => now(),
            'result' => 'repair_completed',
            'subtotal_cents' => 12500,
            'total_cents' => 12500,
        ])->save();

        $this->getJson("/api/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('status', 'completed')
            ->assertJsonPath('display_status', 'awaiting_payment');
        $this->getJson('/api/orders?tab=finalized')
            ->assertOk()
            ->assertJsonMissing(['id' => $order->id]);
        $this->getJson('/api/orders?tab=awaiting_payment')
            ->assertOk()
            ->assertJsonFragment(['id' => $order->id, 'status' => 'completed', 'display_status' => 'awaiting_payment']);

        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'paid'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payment_method');
        $this->assertDatabaseCount('payments', 0);

        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'paid', 'payment_method' => 'debit'])
            ->assertOk()
            ->assertJsonPath('archived', 1)
            ->assertJsonPath('display_status', 'paid');

        $this->assertDatabaseHas('payments', ['service_order_id' => $order->id, 'amount_cents' => 12500, 'method' => 'debit']);
        $paymentId = (int) DB::table('payments')->where('service_order_id', $order->id)->value('id');
        $this->assertDatabaseHas('financial_transactions', ['payment_id' => $paymentId, 'origin' => 'service_order', 'amount_cents' => 12500]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'payment.created', 'subject_type' => 'payment', 'subject_id' => $paymentId]);
        $this->getJson('/api/finance/receivables')->assertOk()->assertJsonPath('count', 0);
        $this->getJson('/api/orders?tab=awaiting_payment')->assertOk()->assertJsonMissing(['id' => $order->id]);
        $this->getJson('/api/orders?tab=finalized')->assertOk()->assertJsonFragment(['id' => $order->id, 'display_status' => 'paid']);
    }

    public function test_fully_paid_completed_order_uses_paid_badge_without_being_archived(): void
    {
        $user = $this->master();
        $order = $this->order($user);
        $order->forceFill([
            'status' => 'completed',
            'completed_at' => now(),
            'result' => 'repair_completed',
            'subtotal_cents' => 84000,
            'total_cents' => 84000,
        ])->save();

        $this->postJson("/api/orders/{$order->id}/payment", [
            'amount_cents' => 84000,
            'method' => 'pix',
            'idempotency_key' => 'workflow-paid-badge-unarchived',
        ])->assertCreated();

        $this->assertFalse((bool) $order->fresh()->archived);
        $this->getJson('/api/orders?tab=finalized')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $order->id,
                'paid_cents' => 84000,
                'display_status' => 'paid',
            ]);
    }
}
