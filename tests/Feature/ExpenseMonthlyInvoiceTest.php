<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ExpenseMonthlyInvoiceTest extends TestCase
{
    use RefreshDatabase;

    private int $bank;

    private int $type;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->travelTo(now()->setDate(2026, 10, 15)->startOfDay());
        $this->actingAs(User::create(['name' => 'Fixture', 'login' => Str::uuid(), 'password' => 'Teste#Seguro123', 'role_id' => Role::where('name', 'Master')->value('id'), 'active' => true]));
        $this->bank = $this->postJson('/api/expense-control/catalogs/institutions', ['name' => 'Fatura fixture', 'due_day' => 10, 'active' => true, 'color' => '#123456'])->assertOk()->json('id');
        $this->type = $this->postJson('/api/expense-control/catalogs/types', ['name' => 'Cartão fixture', 'active' => true])->assertOk()->json('id');
    }

    private function debt(string $owner, int $amount, array $extra = []): array
    {
        return $this->postJson('/api/expense-control/debts', [...['request_key' => (string) Str::uuid(), 'institution_id' => $this->bank, 'type_id' => $this->type, 'name' => 'Compra '.$owner, 'recurrence' => 'once', 'responsibility' => $owner, 'percent_one' => 70, 'amount_cents' => $amount, 'installment_count' => 1, 'first_number' => 1, 'start_month' => '2026-10', 'due_day' => 10], ...$extra])->assertCreated()->json();
    }

    private function pay(array $debt, string $target, ?int $amount = null): void
    {
        $this->postJson('/api/expense-control/operations', ['request_key' => (string) Str::uuid(), 'installment_ids' => [$debt['installments'][0]['id']], 'target' => $target, 'kind' => 'payment', 'paid_by' => 2, 'occurred_on' => '2026-10-15', 'amount_cents' => $amount])->assertCreated();
    }

    private function plan(array $debt, string $scope, string $target, array $extra = []): array
    {
        return $this->getJson('/api/expense-control/debts/'.$debt['debt']['id'].'/invoice-payment?'.http_build_query([...['scope' => $scope, 'target' => $target, 'action' => 'month', 'month' => '2026-10'], ...$extra]))->assertOk()->json();
    }

    private function confirm(array $plan, string $scope, array $extra = []): array
    {
        return [...['scope' => $scope, 'target' => $plan['target'], 'action' => $plan['action'], 'month' => '2026-10', 'amount_cents' => $plan['total_cents'], 'preview_hash' => $plan['preview_hash'], 'request_key' => (string) Str::uuid(), 'paid_by' => 2, 'occurred_on' => '2026-10-15'], ...$extra];
    }

    public function test_exclusive_pending_categories_and_statement_reconcile_unequal_cents_and_prior_payments(): void
    {
        $one = $this->debt('one', 12345);
        $two = $this->debt('two', 23456);
        $shared = $this->debt('shared', 10001, ['split_mode' => 'amount', 'share_one_cents' => 7001, 'share_two_cents' => 3000]);
        $this->pay($one, 'one', 1005);
        $this->pay($two, 'two');
        $this->pay($shared, 'one', 1001);
        $summary = $this->getJson('/api/expense-control/summary?month=2026-10')->assertOk();
        $summary->assertJsonPath('invoice_totals.one_cents', 11340)->assertJsonPath('invoice_totals.two_cents', 0)->assertJsonPath('invoice_totals.shared_cents', 9000)->assertJsonPath('invoice_totals.total_cents', 20340)
            ->assertJsonPath('invoice_totals.shared_one_cents', 6000)->assertJsonPath('invoice_totals.shared_two_cents', 3000)
            ->assertJsonPath('totals.remaining_cents', 20340)->assertJsonPath('totals.original_cents', 45802)->assertJsonPath('totals.one_remaining_cents', 17340);
        $statement = $this->getJson('/api/expense-control/monthly-statement?month=2026-10')->assertOk()->assertJsonCount(2, 'data');
        $this->assertSame($summary->json('invoice_totals'), $statement->json('totals'));
        $this->assertSame(20340, collect($statement->json('data'))->sum('remaining_cents'));
        $this->getJson('/api/expense-control/monthly-statement?month=2026-11')->assertJsonPath('totals.total_cents', 0)->assertJsonCount(0, 'data');
    }

    public function test_fully_paid_month_preserves_original_history_and_paid_invoices_with_zero_pending(): void
    {
        foreach (['one', 'two', 'shared'] as $owner) {
            $debt = $this->debt($owner, 10001);
            $this->pay($debt, $owner === 'shared' ? 'both' : $owner);
        }
        $summary = $this->getJson('/api/expense-control/summary?month=2026-10')->assertOk()->assertJsonPath('totals.remaining_cents', 0)->assertJsonPath('totals.original_cents', 30003)->assertJsonPath('totals.paid_cents', 30003)
            ->assertJsonPath('monthly_invoices.0.status', 'paid')->assertJsonPath('monthly_invoices.0.remaining_cents', 0)->assertJsonCount(1, 'monthly_invoices');
        foreach (['one_cents', 'two_cents', 'shared_cents', 'total_cents'] as $key) {
            $summary->assertJsonPath('invoice_totals.'.$key, 0);
        }
        $this->getJson('/api/expense-control/monthly-statement?month=2026-10')->assertJsonCount(0, 'data')->assertJsonPath('totals.total_cents', 0);
        $this->assertDatabaseCount('cg_entries', 3);
    }

    public function test_invoice_modalities_are_not_mixed_and_partial_state_is_explicit(): void
    {
        $one = $this->debt('one', 10000);
        $type = $this->postJson('/api/expense-control/catalogs/types', ['name' => 'Crédito adicional', 'active' => true])->assertOk()->json('id');
        $this->debt('two', 20000, ['type_id' => $type]);
        $this->pay($one, 'one', 5000);
        $rows = collect($this->getJson('/api/expense-control/summary?month=2026-10')->assertOk()->json('monthly_invoices'));
        $this->assertCount(2, $rows);
        $this->assertSame('partial', $rows->firstWhere('type_name', 'Cartão fixture')['status']);
        $this->assertSame('open', $rows->firstWhere('type_name', 'Crédito adicional')['status']);
    }

    public function test_scope_lists_and_manipulated_preview_and_post_cannot_cross_categories(): void
    {
        $debts = [];
        foreach (['one', 'two', 'shared'] as $owner) {
            $debts[$owner] = $this->debt($owner, 10001);
        }
        foreach (['one', 'two', 'shared'] as $scope) {
            $target = $scope === 'two' ? 'two' : 'one';
            $this->getJson('/api/expense-control/invoice-balances?scope='.$scope.'&target='.$target.'&month=2026-10')->assertOk()->assertJsonCount(1, 'debts')->assertJsonPath('debts.0.id', $debts[$scope]['debt']['id']);
            $plan = $this->plan($debts[$scope], $scope, $target);
            foreach (['one', 'two', 'shared'] as $other) {
                if ($scope === $other) {
                    continue;
                }
                $url = '/api/expense-control/debts/'.$debts[$other]['debt']['id'].'/invoice-payment';
                $this->getJson($url.'?scope='.$scope.'&target='.$target.'&action=month&month=2026-10')->assertUnprocessable();
                $this->postJson($url, $this->confirm($plan, $scope))->assertUnprocessable();
            }
        }
        $this->getJson('/api/expense-control/invoice-balances?scope=one&target=two&month=2026-10')->assertUnprocessable();
        $this->getJson('/api/expense-control/invoice-balances?target=one&month=2026-10')->assertUnprocessable();
        $this->assertDatabaseCount('cg_entries', 0);
        $this->assertDatabaseCount('cg_operations', 0);
    }

    public function test_shared_partial_and_total_reuse_ledger_and_preserve_other_share_and_replay(): void
    {
        $debt = $this->debt('shared', 10001);
        $plan = $this->plan($debt, 'shared', 'one', ['action' => 'partial', 'amount_cents' => 1001]);
        $payload = $this->confirm($plan, 'shared');
        $url = '/api/expense-control/debts/'.$debt['debt']['id'].'/invoice-payment';
        $this->postJson($url, $payload)->assertCreated();
        $this->postJson($url, $payload)->assertCreated()->assertJsonPath('replayed', true);
        $this->assertDatabaseCount('cg_entries', 1);
        $plan = $this->plan($debt, 'shared', 'one', ['action' => 'month']);
        $this->postJson($url, $this->confirm($plan, 'shared'))->assertCreated();
        $this->getJson('/api/expense-control/summary?month=2026-10')->assertJsonPath('invoice_totals.shared_one_cents', 0)->assertJsonPath('invoice_totals.shared_two_cents', 3000)->assertJsonPath('invoice_totals.shared_cents', 3000);
    }

    public function test_recurring_month_projection_pdf_and_preview_are_read_only_until_confirmed_payment(): void
    {
        $debt = $this->debt('shared', 10001, ['recurrence' => 'monthly']);
        $this->getJson('/api/expense-control/summary?month=2026-12')->assertOk()->assertJsonPath('totals.remaining_cents', 10001);
        $this->getJson('/api/expense-control/monthly-statement?month=2026-12')->assertOk()->assertJsonPath('totals.shared_cents', 10001);
        $this->getJson('/api/expense-control/statement-details?month=2026-12')->assertOk()->assertJsonPath('data.0.remaining_cents', 10001);
        $this->getJson('/api/expense-control/invoice-balances?scope=shared&target=one&month=2026-12')->assertOk();
        $plan = $this->plan($debt, 'shared', 'one', ['month' => '2026-12']);
        $this->assertDatabaseCount('cg_installments', 1);
        $this->assertDatabaseCount('cg_entries', 0);
        $this->postJson('/api/expense-control/debts/'.$debt['debt']['id'].'/invoice-payment', $this->confirm($plan, 'shared', ['month' => '2026-12']))->assertCreated();
        $this->assertDatabaseCount('cg_installments', 2);
        $this->getJson('/api/expense-control/monthly-statement?month=2026-12')->assertJsonPath('totals.shared_cents', 3000)->assertJsonPath('totals.shared_one_cents', 0);
        $this->getJson('/api/expense-control/monthly-statement?month=2026-11')->assertJsonPath('totals.shared_cents', 10001);
        $this->assertDatabaseCount('cg_installments', 2);
    }

    public function test_unauthorized_accounts_cannot_view_statements_or_submit_scoped_payments(): void
    {
        $debt = $this->debt('one', 10001);
        $plan = $this->plan($debt, 'one', 'one');
        $this->actingAs(User::create(['name' => 'Restricted', 'login' => Str::uuid(), 'password' => 'Teste#Seguro123', 'role_id' => Role::where('name', 'Administrador Simples')->value('id'), 'active' => true]));
        $this->getJson('/api/expense-control/monthly-statement?month=2026-10')->assertForbidden();
        $this->getJson('/api/expense-control/invoice-balances?scope=one&target=one&month=2026-10')->assertForbidden();
        $this->postJson('/api/expense-control/debts/'.$debt['debt']['id'].'/invoice-payment', $this->confirm($plan, 'one'))->assertForbidden();
        $this->assertDatabaseCount('cg_entries', 0);
    }

    public function test_scope_is_bound_to_preview_and_cannot_be_removed_on_confirmation(): void
    {
        $debt = $this->debt('one', 10001);
        $plan = $this->plan($debt, 'one', 'one');
        $payload = $this->confirm($plan, 'one');
        unset($payload['scope']);
        $this->postJson('/api/expense-control/debts/'.$debt['debt']['id'].'/invoice-payment', $payload)->assertUnprocessable();
        $this->postJson('/api/expense-control/debts/'.$debt['debt']['id'].'/person-payment', $payload)->assertStatus(409);
        $this->assertDatabaseCount('cg_entries', 0);
    }

    public function test_lower_person_card_keeps_recurring_month_payable_without_writes_on_view(): void
    {
        $debt = $this->debt('one', 10001, ['recurrence' => 'monthly']);
        $id = $debt['debt']['id'];
        $this->getJson('/api/expense-control/person-balances?target=one&month=2026-12')->assertOk()->assertJsonPath('debts.0.month_remaining_cents', 10001);
        $plan = $this->getJson('/api/expense-control/debts/'.$id.'/person-payment?target=one&month=2026-12&action=month')->assertOk()->json();
        $this->assertDatabaseCount('cg_installments', 1);
        $payload = $this->confirm($plan, 'one', ['month' => '2026-12']);
        unset($payload['scope']);
        $this->postJson('/api/expense-control/debts/'.$id.'/person-payment', $payload)->assertCreated();
        $this->assertDatabaseCount('cg_installments', 2);
        $this->getJson('/api/expense-control/summary?month=2026-12')->assertJsonPath('totals.remaining_cents', 0);
    }
}
