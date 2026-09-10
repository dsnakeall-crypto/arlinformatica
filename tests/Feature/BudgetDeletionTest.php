<?php

namespace Tests\Feature;

use App\Models\ServiceOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BudgetDeletionTest extends TestCase
{
    use RefreshDatabase;

    private User $master;

    private ServiceOrder $order;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
        $this->master = $this->user('Master', 'master');
        $client = DB::table('clients')->insertGetId(['name' => 'Cliente', 'document' => '52998224725', 'phone' => '35999999999', 'postal_code' => '37160000', 'street' => 'Rua A', 'number' => '1', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG', 'created_at' => now(), 'updated_at' => now()]);
        $this->order = ServiceOrder::create(['number' => '0000900', 'client_id' => $client, 'equipment_type_id' => DB::table('equipment_types')->value('id'), 'attendance_type' => 'bench', 'status' => 'analysis', 'reported_problem' => 'Teste', 'received_at' => now(), 'created_by' => $this->master->id]);
    }

    public function test_master_soft_deletes_budget_audits_action_and_preserves_issued_pdf(): void
    {
        $budget = $this->budget('draft');
        $path = "documents/orders/{$this->order->id}/budget-r1.pdf";
        $bytes = '%PDF-1.4 orçamento histórico imutável';
        Storage::disk('local')->put($path, $bytes);
        DB::table('generated_documents')->insert(['service_order_id' => $this->order->id, 'type' => 'budget', 'revision' => 1, 'path' => $path, 'sha256' => hash('sha256', $bytes), 'snapshot' => '{}', 'issued_at' => now(), 'issued_by' => $this->master->id, 'created_at' => now(), 'updated_at' => now()]);

        $this->actingAs($this->master)->deleteJson("/api/orders/{$this->order->id}/budgets/1")
            ->assertOk()->assertJsonPath('deleted', true);

        $this->assertNotNull(DB::table('budgets')->where('id', $budget)->value('deleted_at'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'budget.deleted', 'subject_type' => 'budget', 'subject_id' => $budget, 'user_id' => $this->master->id]);
        $this->assertSame($bytes, Storage::disk('local')->get($path));
        $this->actingAs($this->master)->get("/api/orders/{$this->order->id}/budgets/1/pdf")->assertOk();
        $this->actingAs($this->master)->getJson("/api/orders/{$this->order->id}/budgets")->assertOk()->assertExactJson([]);
    }

    public function test_index_keeps_non_deleted_budgets_and_filters_only_deleted_ones(): void
    {
        $deleted = $this->budget('draft');
        DB::table('budgets')->where('id', $deleted)->update(['deleted_at' => now()]);
        $active = $this->budget('sent', 2);

        $this->actingAs($this->master)->getJson("/api/orders/{$this->order->id}/budgets")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $active)
            ->assertJsonPath('0.revision', 2);
    }

    public function test_employee_cannot_delete_budget(): void
    {
        $budget = $this->budget('draft');
        $employee = $this->user('Funcionário', 'employee');

        $this->actingAs($employee)->deleteJson("/api/orders/{$this->order->id}/budgets/1")->assertForbidden();
        $this->assertNull(DB::table('budgets')->where('id', $budget)->value('deleted_at'));
    }

    public function test_budget_used_in_finalization_cannot_be_deleted(): void
    {
        $budget = $this->budget('approved');
        $finalization = DB::table('service_order_finalizations')->insertGetId(['service_order_id' => $this->order->id, 'revision' => 1, 'result' => 'repair_completed', 'technical_report' => 'Reparo', 'subtotal_cents' => 10000, 'discount_cents' => 0, 'total_cents' => 10000, 'snapshot' => '{}', 'completed_by' => $this->master->id, 'completed_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('service_order_items')->insert(['service_order_id' => $this->order->id, 'finalization_id' => $finalization, 'source_budget_id' => $budget, 'description' => 'Serviço aprovado', 'quantity' => 1, 'unit_price_cents' => 10000, 'subtotal_cents' => 10000, 'created_at' => now(), 'updated_at' => now()]);

        $this->actingAs($this->master)->deleteJson("/api/orders/{$this->order->id}/budgets/1")
            ->assertConflict()->assertJsonPath('message', 'Este orçamento foi usado na finalização da OS e não pode ser excluído.');

        $this->assertNull(DB::table('budgets')->where('id', $budget)->value('deleted_at'));
        $this->assertDatabaseMissing('audit_logs', ['action' => 'budget.deleted', 'subject_id' => $budget]);
    }

    public function test_completed_order_rejects_new_budget(): void
    {
        $this->order->update(['status' => 'completed', 'completed_at' => now()]);

        $this->actingAs($this->master)->postJson("/api/orders/{$this->order->id}/budgets", [])
            ->assertConflict()
            ->assertJsonPath('message', 'Não é possível criar orçamento para uma OS finalizada.');

        $this->assertDatabaseCount('budgets', 0);
    }

    private function budget(string $status, int $revision = 1): int
    {
        return DB::table('budgets')->insertGetId(['service_order_id' => $this->order->id, 'revision' => $revision, 'status' => $status, 'diagnosis' => 'Falha', 'proposal' => 'Reparo', 'validity_days' => 7, 'total_cents' => 10000, 'created_by' => $this->master->id, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function user(string $role, string $login): User
    {
        return User::create(['role_id' => DB::table('roles')->where('name', $role)->value('id'), 'name' => $role, 'login' => $login, 'password' => Hash::make('password-password'), 'active' => true]);
    }
}
