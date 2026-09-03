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

        $this->actingAs($user)->getJson('/api/orders?sort=recent')->assertOk()->assertJsonPath('data.0.number', '8100002')->assertJsonPath('per_page', 20);
        $this->getJson('/api/orders?sort=oldest')->assertOk()->assertJsonPath('data.0.number', '8100001');
        $this->getJson('/api/orders?sort=client')->assertOk()->assertJsonPath('data.0.client.name', 'Alice Cliente');
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
