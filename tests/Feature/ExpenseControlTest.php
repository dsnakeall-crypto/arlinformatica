<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\BackupService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ExpenseControlTest extends TestCase
{
    use RefreshDatabase;

    private User $master;

    private int $bank;

    private int $type;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->travelTo(now()->setDate(2026, 10, 2)->startOfDay());
        $this->master = $this->account('Master');
        $this->actingAs($this->master);
        $this->bank = $this->postJson('/api/expense-control/catalogs/institutions', ['name' => 'Cartão de teste', 'due_day' => 31, 'active' => true, 'color' => '#c9002c'])->assertOk()->json('id');
        $this->type = $this->postJson('/api/expense-control/catalogs/types', ['name' => 'Cartão', 'active' => true])->assertOk()->json('id');
    }

    private function account(string $role): User
    {
        return User::create(['name' => $role, 'login' => Str::uuid(), 'password' => 'Teste#Seguro123', 'role_id' => Role::where('name', $role)->value('id'), 'active' => true]);
    }

    private function payload(array $extra = []): array
    {
        return [...['request_key' => (string) Str::uuid(), 'institution_id' => $this->bank, 'type_id' => $this->type, 'name' => 'Geladeira', 'recurrence' => 'installments', 'responsibility' => 'shared', 'percent_one' => 50, 'amount_cents' => 10001, 'installment_count' => 3, 'first_number' => 1, 'start_month' => '2026-10', 'due_day' => 31, 'notes' => 'Compra de teste'], ...$extra];
    }

    private function createDebt(array $extra = []): array
    {
        return $this->postJson('/api/expense-control/debts', $this->payload($extra))->assertCreated()->json();
    }

    private function payment(array $ids, array $extra = []): array
    {
        return [...['request_key' => (string) Str::uuid(), 'installment_ids' => $ids, 'kind' => 'payment', 'target' => 'one', 'paid_by' => 1, 'occurred_on' => '2026-10-02', 'amount_cents' => null, 'notes' => null], ...$extra];
    }

    public function test_migration_starts_without_financial_data_or_changes_to_business_records(): void
    {
        $this->assertDatabaseCount('cg_debts', 0);
        $this->assertDatabaseCount('cg_installments', 0);
        $this->assertDatabaseCount('cg_entries', 0);
        $this->assertDatabaseCount('financial_transactions', 0);
        $this->assertDatabaseCount('cg_people', 2);
    }

    public function test_expense_only_account_cannot_access_any_operational_or_company_financial_api(): void
    {
        $limited = $this->account('Controle de Gasto');
        $this->actingAs($limited);
        foreach (['clients', 'orders', 'catalogs/services', 'suppliers', 'finance/overview', 'settings', 'users', 'navigation-summary', 'notifications', 'operational-settings'] as $path) {
            $this->getJson('/api/'.$path)->assertForbidden();
        }
        $this->postJson('/api/clients', [])->assertForbidden();
        $this->getJson('/api/me')->assertOk()->assertJsonPath('role', 'Controle de Gasto');
        $this->getJson('/api/expense-control/configuration')->assertOk()->assertJsonPath('can_assign_users', false)->assertJsonPath('accounts', []);
        $this->createDebt();
        $this->getJson('/api/expense-control/summary?month=2026-10')->assertOk();
    }

    public function test_employee_cannot_access_expense_module_and_local_profile_cannot_change_orders(): void
    {
        $this->actingAs($this->account('Funcionário'));
        $this->getJson('/api/expense-control/configuration')->assertForbidden();
        $this->postJson('/api/expense-control/debts', $this->payload())->assertForbidden();
        $this->actingAs($this->account('Usuário local'));
        $this->getJson('/api/clients')->assertOk();
        $this->getJson('/api/orders')->assertOk();
        $this->patchJson('/api/orders/999/status', ['status' => 'completed'])->assertForbidden();
        $this->getJson('/api/expense-control/configuration')->assertForbidden();
    }

    public function test_three_installments_preserve_every_cent_and_month_end_due_dates(): void
    {
        $detail = $this->createDebt();
        $this->assertSame(3, count($detail['installments']));
        $this->assertSame(5001, $detail['installments'][0]['share_one_cents']);
        $this->assertSame(5000, $detail['installments'][0]['share_two_cents']);
        $this->assertSame('2026-11-30', $detail['installments'][1]['due_on']);
        $this->getJson('/api/expense-control/summary?month=2026-10')->assertOk()->assertJsonPath('totals.original_cents', 10001)->assertJsonPath('totals.one_remaining_cents', 5001)->assertJsonPath('totals.two_remaining_cents', 5000);
        $this->assertDatabaseCount('financial_transactions', 0);
    }

    public function test_retry_create_has_no_duplicate_debts_and_reused_key_with_changed_data_is_rejected(): void
    {
        $data = $this->payload();
        $id = $this->postJson('/api/expense-control/debts', $data)->assertCreated()->json('debt.id');
        $this->postJson('/api/expense-control/debts', $data)->assertCreated()->assertJsonPath('debt.id', $id);
        $data['amount_cents']++;
        $this->postJson('/api/expense-control/debts', $data)->assertConflict();
        $this->assertDatabaseCount('cg_debts', 1);
        $this->assertDatabaseCount('cg_installments', 3);
    }

    public function test_catalog_counts_cover_all_pages_and_respect_responsibility_and_institution(): void
    {
        for ($index = 0; $index < 25; $index++) {
            $this->createDebt(['responsibility' => 'one', 'percent_one' => 100, 'installment_count' => 2]);
        }
        $this->createDebt(['responsibility' => 'two', 'percent_one' => 0]);
        $this->createDebt();
        $other = $this->postJson('/api/expense-control/catalogs/institutions', ['name' => 'Outro banco', 'due_day' => 10, 'active' => true, 'color' => '#123456'])->assertOk()->json('id');
        $this->createDebt(['institution_id' => $other, 'responsibility' => 'one', 'percent_one' => 100]);
        $this->getJson('/api/expense-control/debts?month=2026-10&person=one')->assertOk()
            ->assertJsonPath('total', 27)->assertJsonCount(20, 'data')
            ->assertJsonFragment(['institution_id' => $this->bank, 'type_id' => $this->type, 'count' => 26])
            ->assertJsonFragment(['institution_id' => $other, 'type_id' => $this->type, 'count' => 1]);
        $this->getJson('/api/expense-control/debts?month=2026-10&person=two&institution='.$this->bank)->assertOk()
            ->assertJsonCount(1, 'catalog_counts')->assertJsonPath('catalog_counts.0.count', 2);
        $this->getJson('/api/expense-control/debts?month=2026-10&person=shared')->assertOk()
            ->assertJsonPath('total', 1)->assertJsonPath('catalog_counts.0.count', 1);
    }

    public function test_shared_payment_summary_keeps_other_person_pending_and_tracks_partial_amount(): void
    {
        $detail = $this->createDebt(['amount_cents' => 35000, 'installment_count' => 1]);
        $id = $detail['installments'][0]['id'];
        $this->postJson('/api/expense-control/operations', $this->payment([$id]))->assertCreated();
        $this->getJson('/api/expense-control/summary?month=2026-10')->assertOk()
            ->assertJsonPath('totals.one_remaining_cents', 0)->assertJsonPath('totals.two_remaining_cents', 17500)
            ->assertJsonPath('partial_installments.0.share_one_cents', 17500)
            ->assertJsonPath('partial_installments.0.remaining_one_cents', 0)
            ->assertJsonPath('partial_installments.0.remaining_two_cents', 17500);
        $this->postJson('/api/expense-control/operations', $this->payment([$id], ['target' => 'two', 'paid_by' => 2, 'amount_cents' => 5000]))->assertCreated();
        $this->getJson('/api/expense-control/summary?month=2026-10')->assertOk()
            ->assertJsonPath('totals.paid_cents', 22500)->assertJsonPath('totals.remaining_cents', 12500)
            ->assertJsonPath('partial_installments.0.remaining_two_cents', 12500);
        $this->postJson('/api/expense-control/operations', $this->payment([$id], ['target' => 'both', 'paid_by' => 2]))->assertCreated();
        $this->getJson('/api/expense-control/summary?month=2026-10')->assertOk()
            ->assertJsonPath('totals.remaining_cents', 0)->assertJsonCount(0, 'partial_installments');
    }

    public function test_discount_affects_the_selected_responsible_and_total_without_becoming_a_payment(): void
    {
        $detail = $this->createDebt(['amount_cents' => 100000]);
        $this->postJson('/api/expense-control/operations', $this->payment([$detail['installments'][0]['id']], ['kind' => 'discount', 'amount_cents' => 19050, 'paid_by' => null]))->assertCreated();
        $this->getJson('/api/expense-control/summary?month=2026-10')->assertOk()->assertJsonPath('totals.one_remaining_cents', 30950)->assertJsonPath('totals.two_remaining_cents', 50000)->assertJsonPath('totals.remaining_cents', 80950)->assertJsonPath('totals.paid_cents', 0)->assertJsonPath('totals.discount_cents', 19050);
    }

    public function test_payment_records_actual_payer_separately_from_financial_responsibility(): void
    {
        $detail = $this->createDebt();
        $payload = $this->payment([$detail['installments'][0]['id']], ['kind' => 'advance', 'paid_by' => 2]);
        $this->postJson('/api/expense-control/operations', $payload)->assertCreated();
        $this->assertDatabaseHas('cg_entries', ['paid_by' => 2, 'credit_one_cents' => 5001, 'credit_two_cents' => 0, 'amount_cents' => 5001]);
        $after = $this->getJson('/api/expense-control/debts/'.$detail['debt']['id'])->assertOk();
        $after->assertJsonPath('installments.0.amount_cents', 10001)->assertJsonPath('installments.0.remaining_cents', 5000)->assertJsonPath('installments.0.status', 'partial');
    }

    public function test_operation_retry_is_idempotent_and_overpayment_or_duplicate_ids_are_rejected(): void
    {
        $detail = $this->createDebt();
        $payload = $this->payment([$detail['installments'][0]['id']], ['amount_cents' => 2000]);
        $this->postJson('/api/expense-control/operations', $payload)->assertCreated()->assertJsonPath('replayed', false);
        $this->postJson('/api/expense-control/operations', $payload)->assertCreated()->assertJsonPath('replayed', true);
        $this->assertDatabaseCount('cg_entries', 1);
        $payload['amount_cents'] = 1000;
        $this->postJson('/api/expense-control/operations', $payload)->assertConflict();
        $this->postJson('/api/expense-control/operations', $this->payment([$detail['installments'][0]['id']], ['amount_cents' => 9000]))->assertUnprocessable();
        $this->postJson('/api/expense-control/operations', $this->payment([$detail['installments'][0]['id'], $detail['installments'][0]['id']]))->assertUnprocessable();
        $this->assertDatabaseCount('cg_operations', 1);
    }

    public function test_invalid_last_item_rolls_back_entire_bulk_operation(): void
    {
        $detail = $this->createDebt();
        $last = $detail['installments'][2]['id'];
        $this->postJson('/api/expense-control/operations', $this->payment([$last]))->assertCreated();
        $this->postJson('/api/expense-control/operations', $this->payment([$detail['installments'][0]['id'], $last]))->assertUnprocessable();
        $this->assertDatabaseCount('cg_entries', 1);
        $this->assertDatabaseCount('cg_operations', 1);
        $this->getJson('/api/expense-control/debts/'.$detail['debt']['id'])->assertOk()->assertJsonPath('installments.0.remaining_cents', 10001);
    }

    public function test_full_settlement_moves_debt_to_quitadas_and_reversal_reopens_without_losing_history(): void
    {
        $detail = $this->createDebt();
        $this->postJson('/api/expense-control/operations', $this->payment(array_column($detail['installments'], 'id'), ['target' => 'both']))->assertCreated();
        $this->getJson('/api/expense-control/debts?month=2026-10&status=active')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/expense-control/debts?month=2026-10&status=settled')->assertOk()->assertJsonPath('total', 1);
        $entry = DB::table('cg_entries')->first()->id;
        $this->postJson('/api/expense-control/entries/'.$entry.'/reverse', ['reason' => 'Correção de lançamento'])->assertOk();
        $this->postJson('/api/expense-control/entries/'.$entry.'/reverse', ['reason' => 'Correção de lançamento'])->assertOk();
        $this->assertDatabaseCount('cg_entries', 3);
        $this->getJson('/api/expense-control/debts?month=2026-10&status=active')->assertOk()->assertJsonPath('total', 1);
        $this->getJson('/api/expense-control/debts?month=2026-10&status=settled')->assertOk()->assertJsonPath('total', 0);
    }

    public function test_installment_override_does_not_change_default_or_other_installments(): void
    {
        $detail = $this->createDebt(['amount_cents' => 10000]);
        $id = $detail['installments'][0]['id'];
        $this->putJson('/api/expense-control/installments/'.$id, ['amount_cents' => 10000, 'percent_one' => 70, 'due_on' => '2026-10-15'])->assertOk();
        $this->getJson('/api/expense-control/debts/'.$detail['debt']['id'])->assertOk()->assertJsonPath('installments.0.share_one_cents', 7000)->assertJsonPath('installments.1.share_one_cents', 5000)->assertJsonPath('debt.percent_one', 50);
        $this->postJson('/api/expense-control/operations', $this->payment([$id], ['amount_cents' => 1000]))->assertCreated();
        $this->putJson('/api/expense-control/installments/'.$id, ['amount_cents' => 12000, 'percent_one' => 50, 'due_on' => '2026-10-15'])->assertUnprocessable();
    }

    public function test_monthly_expenses_are_generated_once_and_end_month_is_respected(): void
    {
        $detail = $this->createDebt(['recurrence' => 'monthly', 'amount_cents' => 1000]);
        $this->getJson('/api/expense-control/projection?month=2026-10')->assertOk()->assertJsonPath('11.remaining_cents', 1000);
        $this->getJson('/api/expense-control/projection?month=2026-10')->assertOk();
        $this->assertDatabaseCount('cg_installments', 12);
        $this->postJson('/api/expense-control/debts/'.$detail['debt']['id'].'/end-recurring', ['end_month' => '2026-11'])->assertOk();
        $this->getJson('/api/expense-control/projection?month=2026-10')->assertOk()->assertJsonPath('1.remaining_cents', 1000)->assertJsonPath('2.remaining_cents', 0);
        $this->assertDatabaseCount('cg_installments', 2);
    }

    public function test_monthly_expenses_fill_intervening_months_without_gaps_or_duplicates(): void
    {
        $detail = $this->createDebt(['recurrence' => 'monthly', 'start_month' => '2026-07', 'amount_cents' => 1000]);
        $this->getJson('/api/expense-control/summary?month=2026-10')->assertOk();
        $this->assertDatabaseCount('cg_installments', 4);
        $this->postJson('/api/expense-control/debts/'.$detail['debt']['id'].'/end-recurring', ['end_month' => '2026-11'])->assertOk();
        $this->getJson('/api/expense-control/summary?month=2027-02')->assertOk()->assertJsonPath('count', 0);
        $this->assertDatabaseCount('cg_installments', 5);
        $this->getJson('/api/expense-control/summary?month=2027-02')->assertOk();
        $this->assertDatabaseCount('cg_installments', 5);
    }

    public function test_cancel_preserves_payments_and_removes_active_and_projected_balances(): void
    {
        $detail = $this->createDebt();
        $this->postJson('/api/expense-control/operations', $this->payment([$detail['installments'][0]['id']], ['amount_cents' => 1000]))->assertCreated();
        $this->postJson('/api/expense-control/debts/'.$detail['debt']['id'].'/cancel', ['reason' => 'Compra cancelada pelo vendedor'])->assertOk();
        $this->getJson('/api/expense-control/summary?month=2026-10')->assertOk()->assertJsonPath('totals.remaining_cents', 0);
        $this->getJson('/api/expense-control/debts?month=2026-10&status=cancelled')->assertOk()->assertJsonPath('total', 1);
        $this->assertDatabaseCount('cg_entries', 1);
        $this->assertDatabaseCount('cg_installments', 3);
    }

    public function test_default_percentage_changes_do_not_rewrite_existing_debts_and_only_admin_can_assign_accounts(): void
    {
        $this->createDebt();
        $limited = $this->account('Controle de Gasto');
        $people = [['id' => 1, 'name' => 'Allan', 'default_percent' => 70, 'user_id' => $this->master->id], ['id' => 2, 'name' => 'Carol', 'default_percent' => 30, 'user_id' => $limited->id]];
        $this->putJson('/api/expense-control/people', ['people' => $people])->assertOk();
        $this->actingAs($limited);
        $this->getJson('/api/expense-control/configuration')->assertOk()->assertJsonPath('my_person_id', 2);
        $people[0]['user_id'] = null;
        $this->putJson('/api/expense-control/people', ['people' => $people])->assertForbidden();
        $this->assertDatabaseHas('cg_installments', ['share_one_cents' => 5001]);
        $this->assertDatabaseHas('cg_people', ['id' => 1, 'user_id' => $this->master->id]);
    }

    public function test_personal_due_alerts_are_not_hidden_by_other_persons_first_five_expenses(): void
    {
        DB::table('cg_people')->where('id', 2)->update(['user_id' => $this->master->id]);
        for ($n = 0; $n < 6; $n++) {
            $this->createDebt(['name' => 'Individual '.$n, 'responsibility' => 'one', 'due_day' => 3]);
        }
        $this->createDebt(['name' => 'Obrigação da Carol', 'responsibility' => 'two', 'due_day' => 20]);
        $this->getJson('/api/expense-control/summary?month=2026-10')->assertOk()->assertJsonCount(5, 'next_due')->assertJsonCount(1, 'personal_next_due')->assertJsonPath('personal_next_due.0.name', 'Obrigação da Carol');
    }

    public function test_financial_backups_include_module_data_and_restore_exact_balances(): void
    {
        Storage::fake('local');
        $detail = $this->createDebt();
        $this->postJson('/api/expense-control/operations', $this->payment([$detail['installments'][0]['id']], ['amount_cents' => 2000]))->assertCreated();
        $service = app(BackupService::class);
        $backup = $service->create($this->master);
        $manifest = $service->validate(Storage::disk('local')->path($backup->path));
        $this->assertSame(1, $manifest['counts']['cg_debts']);
        $this->assertSame(1, $manifest['counts']['cg_entries']);
        $service->restore($backup, $this->master);
        $this->getJson('/api/expense-control/summary?month=2026-10')->assertOk()->assertJsonPath('totals.remaining_cents', 8001);
    }
}
