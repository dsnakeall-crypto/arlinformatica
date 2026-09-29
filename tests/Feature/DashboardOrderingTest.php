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

class DashboardOrderingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_panel_can_order_by_date_and_client_without_changing_pagination(): void
    {
        $user = User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => 'Master Painel',
            'login' => 'dashboard-ordering',
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
        $alice = $this->client('Alice Cliente', '52998224725');
        $zeta = $this->client('Zeta Cliente', '11144477735');
        $equipment = DB::table('equipment_types')->value('id');
        ServiceOrder::create([
            'number' => '8100001', 'client_id' => $zeta->id, 'equipment_type_id' => $equipment, 'attendance_type' => 'bench',
            'status' => 'analysis', 'reported_problem' => 'Mais antiga', 'received_at' => now()->subDay(), 'created_by' => $user->id,
        ]);
        ServiceOrder::create([
            'number' => '8100002', 'client_id' => $alice->id, 'equipment_type_id' => $equipment, 'attendance_type' => 'bench',
            'status' => 'analysis', 'reported_problem' => 'Mais recente', 'received_at' => now(), 'created_by' => $user->id,
        ]);

        $this->actingAs($user)->getJson('/api/orders?sort=recent')->assertOk()->assertJsonPath('data.0.number', '8100002')->assertJsonPath('per_page', 12);
        $this->getJson('/api/orders?sort=oldest')->assertOk()->assertJsonPath('data.0.number', '8100001');
        $this->getJson('/api/orders?sort=client')->assertOk()->assertJsonPath('data.0.client.name', 'Alice Cliente');
    }

    public function test_operational_tabs_use_latest_movement_while_all_uses_opening_date(): void
    {
        $user = User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => 'Master Movimentação',
            'login' => 'movement-ordering',
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
        $client = $this->client('Cliente Movimentação', '12345678909');
        $equipment = DB::table('equipment_types')->value('id');
        $olderOpening = ServiceOrder::create([
            'number' => '8200001', 'client_id' => $client->id, 'equipment_type_id' => $equipment, 'attendance_type' => 'bench',
            'status' => 'analysis', 'reported_problem' => 'Abertura antiga, movimento recente', 'received_at' => now()->subDays(2), 'created_by' => $user->id,
        ]);
        $newerOpening = ServiceOrder::create([
            'number' => '8200002', 'client_id' => $client->id, 'equipment_type_id' => $equipment, 'attendance_type' => 'bench',
            'status' => 'analysis', 'reported_problem' => 'Abertura recente, movimento antigo', 'received_at' => now()->subDay(), 'created_by' => $user->id,
        ]);
        DB::table('service_orders')->where('id', $olderOpening->id)->update(['updated_at' => now()]);
        DB::table('service_orders')->where('id', $newerOpening->id)->update(['updated_at' => now()->subDay()]);

        $this->actingAs($user)->getJson('/api/orders?tab=progress')->assertOk()->assertJsonPath('data.0.number', '8200001');
        $this->getJson('/api/orders?tab=all')->assertOk()->assertJsonPath('data.0.number', '8200002');
    }

    public function test_order_tab_counts_use_the_same_server_filters_as_each_list(): void
    {
        $user = User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => 'Master Contadores',
            'login' => 'tab-counters',
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
        $client = $this->client('Cliente Contadores', '39053344705');
        $equipment = DB::table('equipment_types')->value('id');
        $base = [
            'client_id' => $client->id,
            'equipment_type_id' => $equipment,
            'attendance_type' => 'bench',
            'reported_problem' => 'Contagem das abas',
            'received_at' => now(),
            'created_by' => $user->id,
        ];

        $analysis = ServiceOrder::create([...$base, 'number' => '8300001', 'status' => 'analysis']);
        ServiceOrder::create([...$base, 'number' => '8300002', 'status' => 'waiting_part']);
        ServiceOrder::create([...$base, 'number' => '8300003', 'status' => 'completed', 'completed_at' => now(), 'total_cents' => 10000]);
        ServiceOrder::create([...$base, 'number' => '8300004', 'status' => 'completed', 'completed_at' => now(), 'total_cents' => 0]);
        ServiceOrder::create([...$base, 'number' => '8300005', 'status' => 'interrupted', 'completed_at' => now()]);

        $this->actingAs($user)->getJson('/api/orders?tab=progress&per_page=1')
            ->assertOk()
            ->assertJsonPath('tab_counts.progress', 2)
            ->assertJsonPath('tab_counts.awaiting_payment', 1)
            ->assertJsonPath('tab_counts.finalized', 1)
            ->assertJsonPath('tab_counts.interrupted', 1)
            ->assertJsonPath('tab_counts.all', 5);

        $analysis->update(['status' => 'interrupted', 'completed_at' => now()]);
        $this->getJson('/api/orders?tab=interrupted&per_page=1')
            ->assertOk()
            ->assertJsonPath('tab_counts.progress', 1)
            ->assertJsonPath('tab_counts.interrupted', 2)
            ->assertJsonPath('tab_counts.all', 5);
    }

    private function client(string $name, string $document): Client
    {
        return Client::create([
            'name' => $name,
            'document' => $document,
            'phone' => '35999990000',
            'postal_code' => '37160000',
            'street' => 'Rua Painel',
            'number' => '1',
            'district' => 'Centro',
            'city' => 'Campos Gerais',
            'state' => 'MG',
        ]);
    }
}
