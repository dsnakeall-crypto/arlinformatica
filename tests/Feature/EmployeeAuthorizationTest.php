<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EmployeeAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private User $employee;

    private ServiceOrder $order;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->employee = User::create([
            'role_id' => Role::where('name', 'Funcionário')->value('id'),
            'name' => 'Funcionário Teste', 'login' => 'funcionario-bloco-6',
            'password' => bcrypt('Senha-segura-2026!'), 'active' => true,
        ]);
        $client = $this->actingAs($this->employee)->postJson('/api/clients', [
            'name' => 'Cliente Operacional', 'document' => '52998224725', 'phone' => '35999999999',
            'postal_code' => '37160000', 'street' => 'Rua A', 'number' => '1', 'district' => 'Centro',
            'city' => 'Cidade', 'state' => 'MG',
        ])->assertCreated()->json();
        $created = $this->postJson('/api/orders', [
            'client_id' => $client['id'],
            'equipment_type_id' => DB::table('equipment_types')->where('name', 'Notebook')->value('id'),
            'attendance_type' => 'bench', 'reported_problem' => 'Não liga.', 'checklist' => [],
        ])->assertCreated()->json();
        $this->order = ServiceOrder::findOrFail($created['id']);
    }

    public function test_employee_creates_clients_and_orders_and_edits_active_order(): void
    {
        $this->patchJson("/api/orders/{$this->order->id}", [
            'equipment_description' => 'Notebook Dell com carregador',
            'reported_problem' => 'Não liga após queda de energia.',
            'final_report' => 'Testes de alimentação realizados.',
            'checklist' => [],
        ])->assertOk()->assertJsonPath('equipment_description', 'Notebook Dell com carregador');
    }

    public function test_employee_is_forbidden_from_sensitive_routes(): void
    {
        $id = $this->order->id;
        $this->deleteJson("/api/orders/{$id}")->assertForbidden();
        $this->postJson("/api/orders/{$id}/finalize", [])->assertForbidden();
        $this->postJson("/api/orders/{$id}/reopen", ['note' => 'retorno'])->assertForbidden();
        $this->patchJson("/api/orders/{$id}/status", ['status' => 'interrupted', 'interruption_reason' => 'pausa'])->assertForbidden()
            ->assertJsonPath('message', 'Funcionário não pode concluir, interromper ou registrar a retirada/pagamento de uma OS.');
        $this->postJson("/api/orders/{$id}/payment", ['amount_cents' => 100, 'method' => 'pix'])->assertForbidden();
        $this->getJson('/api/finance/overview')->assertForbidden();
        $this->getJson('/api/settings')->assertForbidden();
        $this->getJson('/api/users')->assertForbidden();
    }

    public function test_logout_invalidates_employee_session(): void
    {
        $this->postJson('/logout')->assertNoContent();
        $this->getJson('/api/me')->assertUnauthorized();
    }
}
