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

class StageFourTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private ServiceOrder $order;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
        $this->user = User::create(['role_id' => DB::table('roles')->where('name', 'Master')->value('id'), 'name' => 'Técnico', 'login' => 'tecnico', 'password' => Hash::make('password-password')]);
        $client = DB::table('clients')->insertGetId(['name' => 'Cliente', 'document' => '52998224725', 'phone' => '35999999999', 'postal_code' => '37160000', 'street' => 'Rua A', 'number' => '1', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG', 'created_at' => now(), 'updated_at' => now()]);
        $this->order = ServiceOrder::create(['number' => '0000100', 'client_id' => $client, 'equipment_type_id' => DB::table('equipment_types')->value('id'), 'attendance_type' => 'bench', 'status' => 'analysis', 'reported_problem' => 'Não liga', 'received_at' => now(), 'created_by' => $this->user->id]);
        $this->order->snapshot()->create(['client' => ['name' => 'Cliente'], 'company' => ['company_name' => 'ARL'], 'equipment' => ['name' => 'Notebook'], 'term_text' => 'Termo']);
    }

    public function test_direct_completion_is_rejected_and_completed_order_can_be_soft_deleted_with_history_preserved(): void
    {
        $this->actingAs($this->user)->patchJson("/api/orders/{$this->order->id}/status", ['status' => 'completed'])->assertUnprocessable();
        $this->finalize(['result' => 'no_fault', 'technical_report' => 'Nenhum defeito foi constatado.', 'items' => [], 'discount_cents' => 0])->assertCreated()->assertJsonPath('order.status', 'completed');

        $this->actingAs($this->user)
            ->deleteJson("/api/orders/{$this->order->id}")
            ->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertSoftDeleted('service_orders', ['id' => $this->order->id]);
        $this->assertDatabaseHas('generated_documents', ['service_order_id' => $this->order->id, 'type' => 'final', 'revision' => 1]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'service_order.deleted', 'subject_id' => $this->order->id]);
    }

    public function test_repair_items_money_warranty_and_catalog_snapshot_are_preserved(): void
    {
        $catalog = DB::table('service_catalog')->insertGetId(['name' => 'Formatação', 'category' => 'service', 'price_cents' => 10000, 'warranty_enabled' => true, 'warranty_term' => 30, 'warranty_unit' => 'days', 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $response = $this->finalize(['result' => 'repair_completed', 'technical_report' => 'Sistema reparado e testado.', 'discount_cents' => 1000, 'items' => [['catalog_id' => $catalog, 'description' => 'Formatação', 'quantity' => 2, 'unit_price_cents' => 10000, 'warranty_enabled' => true, 'warranty_term' => 30, 'warranty_unit' => 'days', 'warranty_description' => 'Garantia do serviço']]])->assertCreated();
        $response->assertJsonPath('finalization.subtotal_cents', 20000)->assertJsonPath('finalization.total_cents', 19000);
        DB::table('service_catalog')->where('id', $catalog)->update(['name' => 'Novo nome', 'price_cents' => 99999, 'warranty_term' => 1]);
        $item = DB::table('service_order_items')->where('service_order_id', $this->order->id)->first();
        $this->assertSame('Formatação', $item->description);
        $this->assertSame(10000, $item->unit_price_cents);
        $this->assertSame(30, json_decode($item->warranty_snapshot, true)['term']);
        $this->assertDatabaseHas('generated_documents', ['service_order_id' => $this->order->id, 'type' => 'final', 'revision' => 1]);
        DB::table('settings')->updateOrInsert(['key' => 'company_name'], ['value' => 'Empresa alterada', 'created_at' => now(), 'updated_at' => now()]);
        $documentSnapshot = json_decode(DB::table('generated_documents')->where(['service_order_id' => $this->order->id, 'type' => 'final'])->value('snapshot'), true);
        $this->assertSame('ARL Informática', $documentSnapshot['company']['company_name']);
    }

    public function test_discount_cannot_make_total_negative(): void
    {
        $this->finalize(['result' => 'repair_completed', 'technical_report' => 'Reparo', 'discount_cents' => 101, 'items' => [['description' => 'Serviço', 'quantity' => 1, 'unit_price_cents' => 100, 'warranty_enabled' => false]]])->assertUnprocessable()->assertJsonValidationErrors('discount_cents');
    }

    public function test_approved_budget_is_server_source_and_cannot_be_used_for_another_order(): void
    {
        $budget = DB::table('budgets')->insertGetId(['service_order_id' => $this->order->id, 'revision' => 1, 'status' => 'approved', 'diagnosis' => 'Falha', 'proposal' => 'Reparo', 'validity_days' => 7, 'total_cents' => 5000, 'created_by' => $this->user->id, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('budget_items')->insert(['budget_id' => $budget, 'description' => 'Reparo aprovado', 'quantity' => 1, 'unit_price_cents' => 5000, 'subtotal_cents' => 5000, 'warranty_snapshot' => json_encode(['enabled' => true, 'term' => 90, 'unit' => 'days']), 'created_at' => now(), 'updated_at' => now()]);
        $payload = ['result' => 'repair_completed', 'technical_report' => 'Reparo', 'discount_cents' => 0, 'approved_budget_id' => $budget, 'items' => [['description' => 'ITEM MANIPULADO NO NAVEGADOR', 'quantity' => 99, 'unit_price_cents' => 1, 'warranty_enabled' => false]]];

        $this->finalize($payload)->assertCreated()->assertJsonPath('finalization.subtotal_cents', 5000)->assertJsonPath('finalization.total_cents', 5000);
        $item = DB::table('service_order_items')->where('service_order_id', $this->order->id)->first();
        $this->assertSame('Reparo aprovado', $item->description);
        $this->assertSame(1, $item->quantity);
        $this->assertSame(5000, $item->unit_price_cents);
        $this->assertSame($budget, $item->source_budget_id);
        $this->assertSame(90, json_decode($item->warranty_snapshot, true)['term']);

        $otherOrder = $this->order->replicate(['number']);
        $otherOrder->number = '0000101';
        $otherOrder->status = 'analysis';
        $otherOrder->save();
        $this->actingAs($this->user)->postJson("/api/orders/{$otherOrder->id}/finalize", $payload)->assertUnprocessable();
        $this->assertDatabaseCount('service_order_items', 1);
    }

    public function test_report_requires_human_electrical_conclusion_and_emitted_revision_is_immutable(): void
    {
        $template = DB::table('technical_report_templates')->where('kind', 'electrical')->value('id');
        $content = ['technical_analysis' => 'Análise visual', 'diagnosis' => 'Componente danificado', 'conclusion' => 'Avaliação técnica', 'equipment_situation' => 'repairable', 'responsible_technician' => 'Técnico', 'confirmed' => true];
        $draft = $this->actingAs($this->user)->postJson("/api/orders/{$this->order->id}/reports", ['template_id' => $template, 'content' => $content])->assertCreated()->json();
        $this->postJson("/api/orders/{$this->order->id}/reports/{$draft['revision']}/issue", [])->assertUnprocessable()->assertJsonValidationErrors('electrical_conclusion');
        $content['electrical_conclusion'] = 'inconclusive';
        $this->putJson("/api/orders/{$this->order->id}/reports/1", ['template_id' => $template, 'content' => $content])->assertOk();
        $this->postJson("/api/orders/{$this->order->id}/reports/1/issue", [])->assertOk();
        $this->putJson("/api/orders/{$this->order->id}/reports/1", ['template_id' => $template, 'content' => $content])->assertConflict();
        $this->postJson("/api/orders/{$this->order->id}/reports", ['template_id' => $template, 'content' => $content])->assertCreated()->assertJsonPath('revision', 2);
        $this->assertDatabaseHas('generated_documents', ['service_order_id' => $this->order->id, 'type' => 'technical-report', 'revision' => 1]);
    }

    private function finalize(array $payload)
    {
        return $this->actingAs($this->user)->postJson("/api/orders/{$this->order->id}/finalize", $payload);
    }
}
