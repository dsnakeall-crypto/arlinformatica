<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ServiceOrderListDashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private int $equipment;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->user = User::create(['role_id' => Role::where('name', 'Master')->value('id'), 'name' => 'Master', 'login' => 'list-master', 'password' => bcrypt('safe-password'), 'active' => true]);
        $this->equipment = DB::table('equipment_types')->value('id');
        $this->actingAs($this->user);
    }

    private function order(string $number, string $clientName, string $status): ServiceOrder
    {
        $client = DB::table('clients')->insertGetId(['name' => $clientName, 'document' => str_pad((string) (10000000000 + (int) $number), 11, '0'), 'phone' => '35999999999', 'postal_code' => '37160000', 'street' => 'Rua A', 'number' => '1', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG', 'created_at' => now(), 'updated_at' => now()]);

        return ServiceOrder::create(['number' => $number, 'client_id' => $client, 'equipment_type_id' => $this->equipment, 'equipment_description' => 'Notebook', 'attendance_type' => 'bench', 'status' => $status, 'reported_problem' => 'Teste', 'received_at' => now(), 'completed_at' => $status === 'completed' ? now() : null, 'total_cents' => $status === 'completed' ? 12500 : 0, 'created_by' => $this->user->id]);
    }

    public function test_tabs_search_pagination_and_dashboard_contract(): void
    {
        $this->order('0000001', 'Cliente Encontrável', 'analysis');
        $this->order('0000002', 'Cliente Encontrável', 'completed');
        $this->order('0000003', 'Cliente Interrompido', 'interrupted');
        for ($i = 4; $i <= 55; $i++) {
            $this->order(str_pad((string) $i, 7, '0', STR_PAD_LEFT), "Cliente $i", 'in_service');
        }

        $this->getJson('/api/orders?tab=all&per_page=50')->assertOk()->assertJsonPath('per_page', 50)->assertJsonPath('total', 55)->assertJsonCount(50, 'data');
        $this->getJson('/api/orders?tab=progress')->assertJsonPath('total', 53);
        $this->getJson('/api/orders?tab=finalized')->assertJsonPath('total', 1)->assertJsonPath('data.0.total_cents', 12500);
        $this->getJson('/api/orders?tab=interrupted')->assertJsonPath('total', 1);
        $this->getJson('/api/orders?q=Cliente%20Encontrável')->assertJsonPath('total', 2);
        $this->getJson('/api/orders?dashboard=1')->assertOk()->assertJsonCount(54, 'data')->assertJsonMissingPath('next_page_url');
    }

    public function test_interrupted_order_is_audited_and_excluded_from_finance_until_resumed(): void
    {
        $order = $this->order('0000900', 'Cliente Financeiro', 'completed');
        DB::table('payments')->insert(['id' => 1, 'service_order_id' => $order->id, 'amount_cents' => 12500, 'method' => 'pix', 'idempotency_key' => 'before-interruption', 'paid_at' => now(), 'user_id' => $this->user->id, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('financial_transactions')->insert(['payment_id' => 1, 'origin' => 'service_order', 'description' => 'OS 0000900', 'amount_cents' => 12500, 'occurred_at' => now(), 'user_id' => $this->user->id, 'created_at' => now(), 'updated_at' => now()]);
        $order->update(['status' => 'analysis', 'completed_at' => null]);

        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'interrupted', 'interruption_reason' => 'Cliente solicitou uma pausa.'])->assertOk();
        $this->assertDatabaseHas('status_history', ['service_order_id' => $order->id, 'to_status' => 'interrupted', 'reason' => 'Cliente solicitou uma pausa.']);
        $this->assertDatabaseHas('audit_logs', ['subject_id' => $order->id, 'action' => 'service_order.status_changed']);
        $this->getJson('/api/finance/month')->assertJsonPath('service_orders_cents', 0);
        $this->postJson("/api/orders/{$order->id}/payment", ['amount_cents' => 1, 'method' => 'pix', 'idempotency_key' => 'blocked'])->assertUnprocessable();
        $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'in_service'])->assertOk();
        $this->getJson('/api/finance/month')->assertJsonPath('service_orders_cents', 12500);
    }
}
