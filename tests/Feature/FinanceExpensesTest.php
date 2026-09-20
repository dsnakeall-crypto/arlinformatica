<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FinanceExpensesTest extends TestCase
{
    use RefreshDatabase;

    private User $master;

    private User $employee;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->master = $this->user('Master', 'master');
        $this->employee = $this->user('Funcionário', 'employee');
    }

    public function test_expense_updates_month_totals_and_daily_chart_without_contaminating_another_month(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-09-09 15:00:00', 'America/Sao_Paulo'));
        $this->actingAs($this->master)->postJson('/api/finance/quick-entry', [
            'amount_cents' => 20000,
            'description' => 'Formatação em atendimento avulso',
        ])->assertCreated()->assertJsonPath('description', 'Formatação em atendimento avulso');

        $expense = $this->postJson('/api/finance/expenses', [
            'spent_on' => '2026-09-09',
            'description' => 'Álcool isopropílico',
            'category' => 'usage_material',
            'amount_cents' => 3500,
        ])->assertCreated()->assertJsonPath('category', 'usage_material')->json();
        $this->postJson('/api/finance/expenses', [
            'spent_on' => '2026-08-31',
            'description' => 'Pasta térmica',
            'category' => 'usage_material',
            'amount_cents' => 1200,
        ])->assertCreated();

        $this->getJson('/api/finance/month?period=2026-09')->assertOk()
            ->assertJsonPath('total_cents', 20000)
            ->assertJsonPath('quick_entries_cents', 20000)
            ->assertJsonPath('expense_cents', 3500)
            ->assertJsonPath('net_cents', 16500)
            ->assertJsonPath('daily_expenses.2026-09-09', 3500)
            ->assertJsonCount(1, 'expenses');
        $this->getJson('/api/finance/month?period=2026-08')->assertOk()
            ->assertJsonPath('expense_cents', 1200)
            ->assertJsonMissing(['description' => 'Álcool isopropílico']);
        $daily = $this->getJson('/api/finance/daily?date=2026-09-09')->assertOk()
            ->assertJsonPath('total_cents', 16500)->json('transactions');
        $dailyExpense = collect($daily)->firstWhere('kind', 'expense');
        $this->assertSame('usage_material', $dailyExpense['category']);
        $this->assertSame('Master', $dailyExpense['user_name']);
        $this->assertSame(-3500, $dailyExpense['effective_cents']);
        Storage::fake('local');
        $report = $this->postJson('/api/finance/reports', ['period' => '2026-09'])
            ->assertCreated()->json();
        Storage::disk('local')->assertExists("documents/finance/2026-09-r{$report['revision']}.pdf");
        $this->assertDatabaseHas('audit_logs', ['action' => 'finance.expense_created', 'subject_id' => $expense['id']]);
    }

    public function test_only_financial_corrector_roles_can_create_or_delete_expenses_and_deletion_is_audited(): void
    {
        $payload = ['spent_on' => '2026-09-09', 'description' => 'Pincéis', 'category' => 'usage_material', 'amount_cents' => 1800];
        $this->actingAs($this->employee)->postJson('/api/finance/expenses', $payload)->assertForbidden();
        $id = $this->actingAs($this->master)->postJson('/api/finance/expenses', $payload)->assertCreated()->json('id');
        $this->actingAs($this->employee)->deleteJson("/api/finance/expenses/$id")->assertForbidden();
        $this->actingAs($this->master)->deleteJson("/api/finance/expenses/$id")->assertOk();

        $this->assertDatabaseHas('financial_expenses', ['id' => $id, 'deleted_by' => $this->master->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'finance.expense_deleted', 'subject_id' => $id]);
        $this->getJson('/api/finance/month?period=2026-09')->assertJsonPath('expense_cents', 0);
    }

    public function test_admin_can_edit_expense_with_audit_and_move_it_between_periods_but_employee_cannot(): void
    {
        $id = $this->actingAs($this->master)->postJson('/api/finance/expenses', [
            'spent_on' => '2026-08-31', 'description' => 'Valor incorreto', 'amount_cents' => 9000,
            'category' => 'merchandise_purchase',
        ])->assertCreated()->json('id');

        $corrected = ['spent_on' => '2026-09-10', 'description' => 'Fonte de bancada', 'category' => 'merchandise_purchase', 'amount_cents' => 6500];
        $this->actingAs($this->employee)->putJson("/api/finance/expenses/$id", $corrected)->assertForbidden();
        $this->actingAs($this->master)->putJson("/api/finance/expenses/$id", $corrected)->assertOk()
            ->assertJsonPath('amount_cents', 6500)->assertJsonPath('spent_on', '2026-09-10');

        $this->getJson('/api/finance/month?period=2026-08')->assertJsonPath('expense_cents', 0);
        $this->getJson('/api/finance/month?period=2026-09')->assertJsonPath('expense_cents', 6500);
        $audit = DB::table('audit_logs')->where(['action' => 'finance.expense_updated', 'subject_id' => $id])->first();
        $this->assertSame(9000, json_decode($audit->before, true)['amount_cents']);
        $this->assertSame(6500, json_decode($audit->after, true)['amount_cents']);
    }

    public function test_new_expense_requires_known_category_and_legacy_expense_remains_readable(): void
    {
        $payload = ['spent_on' => '2026-09-09', 'description' => 'Sem categoria nova', 'amount_cents' => 1800];
        $this->actingAs($this->master)->postJson('/api/finance/expenses', $payload)
            ->assertUnprocessable()->assertJsonValidationErrors('category');
        $this->postJson('/api/finance/expenses', [...$payload, 'category' => 'categoria-inventada'])
            ->assertUnprocessable()->assertJsonValidationErrors('category');

        DB::table('financial_expenses')->insert([
            ...$payload, 'category' => null, 'created_by' => $this->master->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->getJson('/api/finance/month?period=2026-09')->assertOk()
            ->assertJsonPath('expenses.0.category', null)
            ->assertJsonPath('expenses.0.description', 'Sem categoria nova');
    }

    public function test_refund_is_a_current_outflow_preserves_order_total_and_is_limited_to_effective_payment(): void
    {
        $client = DB::table('clients')->insertGetId([
            'name' => 'Cliente Estorno', 'document' => '12345678909', 'phone' => '35999999999', 'postal_code' => '37130000',
            'street' => 'Rua A', 'number' => '1', 'district' => 'Centro', 'city' => 'Alfenas', 'state' => 'MG', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $order = DB::table('service_orders')->insertGetId([
            'number' => '0007777', 'client_id' => $client, 'equipment_type_id' => DB::table('equipment_types')->value('id'), 'attendance_type' => 'bench', 'reported_problem' => 'Garantia',
            'status' => 'completed', 'total_cents' => 15000, 'received_at' => now(), 'completed_at' => now(), 'created_by' => $this->master->id, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $payment = DB::table('payments')->insertGetId(['service_order_id' => $order, 'amount_cents' => 15000, 'method' => 'pix', 'paid_at' => now(), 'user_id' => $this->master->id, 'idempotency_key' => 'refund-test', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('financial_transactions')->insert(['payment_id' => $payment, 'origin' => 'service_order', 'description' => 'OS 0007777', 'amount_cents' => 15000, 'occurred_at' => now(), 'user_id' => $this->master->id, 'created_at' => now(), 'updated_at' => now()]);

        $payload = ['amount_cents' => 10000, 'reason' => 'Falha do serviço durante a garantia', 'method' => 'pix'];
        $this->actingAs($this->employee)->postJson("/api/orders/$order/refunds", $payload)->assertForbidden();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-09-11 10:00:00', 'America/Sao_Paulo'));
        $this->actingAs($this->master)->postJson("/api/orders/$order/refunds", $payload)->assertCreated();
        $this->postJson("/api/orders/$order/refunds", ['amount_cents' => 5001, 'reason' => 'Excedente', 'method' => 'cash'])->assertUnprocessable();

        $this->assertDatabaseHas('service_orders', ['id' => $order, 'total_cents' => 15000]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'service_order.refund_created', 'subject_type' => 'service_order', 'subject_id' => $order]);
        $this->getJson('/api/finance/month?period=2026-09')
            ->assertJsonPath('total_cents', 15000)
            ->assertJsonPath('refund_cents', 10000)
            ->assertJsonPath('net_cents', 5000)
            ->assertJsonPath('methods.pix.entry_cents', 15000)
            ->assertJsonPath('methods.pix.outflow_cents', 10000)
            ->assertJsonMissingPath('outflow_cents');
        $this->getJson("/api/orders/$order/audit-history")->assertJsonFragment(['action' => 'Estorno da OS']);
    }

    private function user(string $role, string $login): User
    {
        return User::create([
            'role_id' => DB::table('roles')->where('name', $role)->value('id'),
            'name' => $role,
            'login' => $login,
            'password' => Hash::make('password-password'),
            'active' => true,
        ]);
    }
}
