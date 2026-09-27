<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FinalizationApiParityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
        $this->actingAs(User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => 'Paridade API', 'login' => 'finalization-api-parity',
            'password' => 'Senha#Forte123', 'active' => true,
        ]));
    }

    public function test_json_api_finalizes_bench_and_external_orders_with_catalog_items(): void
    {
        foreach ([['bench', false], ['external', true]] as $index => [$attendanceType, $includeNullBudget]) {
            $client = $this->postJson('/api/clients', [
                'name' => "Cliente Paridade {$attendanceType}",
                'document' => $index === 0 ? '52998224725' : '16899535009',
                'phone' => '35999999999', 'postal_code' => '37160000', 'street' => 'Rua Teste',
                'number' => '12', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG',
            ])->assertCreated()->json();
            $order = $this->postJson('/api/orders', [
                'client_id' => $client['id'],
                'equipment_type_id' => DB::table('equipment_types')->value('id'),
                'attendance_type' => $attendanceType, 'reported_problem' => 'Teste de paridade',
                'items' => [], 'checklist' => [],
            ])->assertCreated()->json();
            $service = $this->validService();
            $payload = [
                'technical_report' => 'Finalização pela API JSON.', 'discount_cents' => 0, 'photo_ids' => [],
                'items' => [[
                    'catalog_id' => $service['id'], 'description' => $service['name'], 'quantity' => 1,
                    'unit_price_cents' => (int) $service['price_cents'], 'warranty_enabled' => false,
                ]],
            ];
            if ($includeNullBudget) {
                $payload['approved_budget_id'] = null;
            }

            $this->postJson("/api/orders/{$order['id']}/finalize", $payload)
                ->assertCreated()
                ->assertJsonPath('finalization.result', 'repair_completed');
        }
    }

    private function validService(): array
    {
        $services = $this->getJson('/api/catalogs/services')->assertOk()->json();
        $service = collect($services)->first(fn (array $row) => (int) $row['price_cents'] > 0);
        if ($service) {
            return $service;
        }

        return $this->postJson('/api/catalogs/services', [
            'name' => 'Serviço válido da paridade', 'price_cents' => 10000, 'warranty_enabled' => false,
        ])->assertCreated()->json();
    }
}
