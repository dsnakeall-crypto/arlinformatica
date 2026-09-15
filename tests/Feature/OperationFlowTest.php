<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OperationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_create_client_and_order_with_ok_checklist(): void
    {
        $this->seed(DatabaseSeeder::class);
        $role = Role::where('name', 'Master')->firstOrFail();
        $user = User::create(['role_id' => $role->id, 'name' => 'Operador', 'login' => 'operador', 'password' => bcrypt('safe-password'), 'active' => true]);

        $client = $this->actingAs($user)->postJson('/api/clients', [
            'name' => 'Cliente Real', 'document' => '529.982.247-25', 'phone' => '(35) 99999-9999',
            'postal_code' => '37160000', 'street' => 'Rua Principal', 'number' => '10',
            'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG',
        ])->assertCreated()->json();

        $equipment = \DB::table('equipment_types')->where('name', 'Notebook')->value('id');
        $order = $this->postJson('/api/orders', [
            'client_id' => $client['id'], 'equipment_type_id' => $equipment,
            'attendance_type' => 'bench', 'reported_problem' => 'Não inicializa.', 'checklist' => [],
        ])->assertCreated()->json();

        $this->assertDatabaseHas('service_orders', ['id' => $order['id'], 'status' => 'analysis']);
        $this->assertDatabaseHas('service_order_snapshots', ['service_order_id' => $order['id']]);
        $this->assertDatabaseCount('service_order_checklists', 0);
        $this->getJson('/api/orders/'.$order['id'])->assertOk()->assertJsonPath('checklists', []);
    }

    public function test_intake_condition_is_optional_and_term_never_leaves_the_section_blank(): void
    {
        $empty = ['order' => ['number' => '0000001', 'received_at' => now()->toIso8601String(), 'reported_problem' => 'Não liga', 'attendance_type' => 'bench', 'intake_condition' => null], 'snapshot' => ['company' => [], 'client' => ['name' => 'Cliente', 'document' => '52998224725'], 'term_text' => 'Termo']];
        $this->assertStringContainsString('Equipamento aparentemente 100% sem avarias', view('documents.term', $empty)->render());

        $filled = $empty;
        $filled['order']['intake_condition'] = 'Tela trincada no canto direito';
        $rendered = view('documents.term', $filled)->render();
        $this->assertStringContainsString('Tela trincada no canto direito', $rendered);
        $this->assertStringNotContainsString('Equipamento aparentemente 100% sem avarias', $rendered);
    }

    public function test_duplicate_document_is_rejected(): void
    {
        $this->seed(DatabaseSeeder::class);
        $role = Role::where('name', 'Master')->firstOrFail();
        $user = User::create(['role_id' => $role->id, 'name' => 'Operador', 'login' => 'operador', 'password' => bcrypt('safe-password'), 'active' => true]);
        $payload = ['name' => 'Cliente', 'document' => '52998224725', 'phone' => '35999999999', 'postal_code' => '37160000', 'street' => 'Rua', 'number' => '1', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG'];

        $this->actingAs($user)->postJson('/api/clients', $payload)->assertCreated();
        $this->postJson('/api/clients', $payload)->assertUnprocessable()->assertJsonValidationErrors('document');
    }
}
