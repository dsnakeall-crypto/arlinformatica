<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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
            'amount_cents' => 3500,
        ])->assertCreated()->json();
        $this->postJson('/api/finance/expenses', [
            'spent_on' => '2026-08-31',
            'description' => 'Pasta térmica',
            'amount_cents' => 1200,
        ])->assertCreated();

        $this->getJson('/api/finance/month?period=2026-09')->assertOk()
            ->assertJsonPath('total_cents', 20000)
            ->assertJsonPath('quick_entries_cents', 20000)
            ->assertJsonPath('expense_cents', 3500)
            ->assertJsonPath('daily_expenses.2026-09-09', 3500)
            ->assertJsonCount(1, 'expenses');
        $this->getJson('/api/finance/month?period=2026-08')->assertOk()
            ->assertJsonPath('expense_cents', 1200)
            ->assertJsonMissing(['description' => 'Álcool isopropílico']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'finance.expense_created', 'subject_id' => $expense['id']]);
    }

    public function test_only_financial_corrector_roles_can_create_or_delete_expenses_and_deletion_is_audited(): void
    {
        $payload = ['spent_on' => '2026-09-09', 'description' => 'Pincéis', 'amount_cents' => 1800];
        $this->actingAs($this->employee)->postJson('/api/finance/expenses', $payload)->assertForbidden();
        $id = $this->actingAs($this->master)->postJson('/api/finance/expenses', $payload)->assertCreated()->json('id');
        $this->actingAs($this->employee)->deleteJson("/api/finance/expenses/$id")->assertForbidden();
        $this->actingAs($this->master)->deleteJson("/api/finance/expenses/$id")->assertOk();

        $this->assertDatabaseHas('financial_expenses', ['id' => $id, 'deleted_by' => $this->master->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'finance.expense_deleted', 'subject_id' => $id]);
        $this->getJson('/api/finance/month?period=2026-09')->assertJsonPath('expense_cents', 0);
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
