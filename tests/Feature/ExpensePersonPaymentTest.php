<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\Audit;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ExpensePersonPaymentTest extends TestCase
{
    use RefreshDatabase;

    private User $master;

    private int $bank;

    private int $type;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->travelTo(now()->setDate(2026, 10, 15)->startOfDay());
        $this->master = User::create(['name' => 'Fixture Master', 'login' => Str::uuid(), 'password' => 'Teste#Seguro123', 'role_id' => Role::where('name', 'Master')->value('id'), 'active' => true]);
        $this->actingAs($this->master);
        $this->bank = $this->postJson('/api/expense-control/catalogs/institutions', ['name' => 'Banco fixture', 'due_day' => 10, 'active' => true, 'color' => '#123456'])->assertOk()->json('id');
        $this->type = $this->postJson('/api/expense-control/catalogs/types', ['name' => 'Cartão', 'active' => true])->assertOk()->json('id');
    }

    private function debt(array $extra = []): array
    {
        return $this->postJson('/api/expense-control/debts', [...['request_key' => (string) Str::uuid(), 'institution_id' => $this->bank, 'type_id' => $this->type,
            'name' => 'Compra fixture', 'recurrence' => 'installments', 'responsibility' => 'shared', 'percent_one' => 70,
            'amount_cents' => 10001, 'installment_count' => 3, 'first_number' => 1, 'start_month' => '2026-10', 'due_day' => 10, 'notes' => null], ...$extra])->assertCreated()->json();
    }

    private function preview(int $id, array $extra = []): array
    {
        return $this->getJson('/api/expense-control/debts/'.$id.'/person-payment?'.http_build_query([...['target' => 'one', 'action' => 'month', 'month' => '2026-10'], ...$extra]))->assertOk()->json();
    }

    private function confirmation(array $plan, array $extra = []): array
    {
        return [...['request_key' => (string) Str::uuid(), 'target' => $plan['target'], 'action' => $plan['action'], 'month' => '2026-10',
            'amount_cents' => $plan['total_cents'], 'preview_hash' => $plan['preview_hash'], 'paid_by' => $plan['target'] === 'one' ? 1 : 2, 'occurred_on' => '2026-10-15', 'notes' => null], ...$extra];
    }

    public function test_month_payment_credits_only_selected_share_and_keeps_future_installments(): void
    {
        $debt = $this->debt();
        $id = $debt['debt']['id'];
        $plan = $this->preview($id);
        $this->assertSame(7001, $plan['total_cents']);
        $this->assertSame(0, $plan['remaining_cents']);
        $this->assertSame(14002, $plan['debt_remaining_cents']);
        $this->postJson('/api/expense-control/debts/'.$id.'/person-payment', $this->confirmation($plan))->assertCreated();
        $detail = $this->getJson('/api/expense-control/debts/'.$id)->assertOk();
        $detail->assertJsonPath('installments.0.remaining_one_cents', 0)->assertJsonPath('installments.0.remaining_two_cents', 3000)
            ->assertJsonPath('installments.1.remaining_one_cents', 7001)->assertJsonCount(3, 'installments')->assertJsonCount(1, 'entries');
        $this->assertDatabaseHas('cg_entries', ['amount_cents' => 7001, 'credit_one_cents' => 7001, 'credit_two_cents' => 0, 'kind' => 'payment']);
    }

    public function test_personal_debts_are_visible_only_for_their_owner_and_carol_payment_preserves_allan(): void
    {
        $one = $this->debt(['responsibility' => 'one']);
        $two = $this->debt(['responsibility' => 'two']);
        $this->getJson('/api/expense-control/person-balances?target=one&month=2026-10')->assertOk()->assertJsonCount(1, 'debts')->assertJsonPath('debts.0.id', $one['debt']['id']);
        $this->getJson('/api/expense-control/person-balances?target=two&month=2026-10')->assertOk()->assertJsonCount(1, 'debts')->assertJsonPath('debts.0.id', $two['debt']['id']);
        $plan = $this->preview($two['debt']['id'], ['target' => 'two', 'action' => 'total']);
        $this->postJson('/api/expense-control/debts/'.$two['debt']['id'].'/person-payment', $this->confirmation($plan))->assertCreated();
        $this->assertSame(30003, (int) DB::table('cg_entries')->sum('credit_two_cents'));
        $this->assertSame(0, (int) DB::table('cg_entries')->sum('credit_one_cents'));
        $this->getJson('/api/expense-control/debts/'.$one['debt']['id'])->assertJsonPath('installments.0.remaining_one_cents', 10001);
    }

    public function test_partial_value_is_month_bound_and_cannot_touch_future_or_other_person(): void
    {
        $debt = $this->debt();
        $id = $debt['debt']['id'];
        $this->getJson('/api/expense-control/debts/'.$id.'/person-payment?target=one&action=partial&month=2026-10&amount_cents=8000')->assertUnprocessable();
        $plan = $this->preview($id, ['action' => 'partial', 'amount_cents' => 2000]);
        $data = $this->confirmation($plan);
        $this->postJson('/api/expense-control/debts/'.$id.'/person-payment', $data)->assertCreated();
        $this->postJson('/api/expense-control/debts/'.$id.'/person-payment', $data)->assertCreated()->assertJsonPath('replayed', true);
        $this->getJson('/api/expense-control/debts/'.$id)->assertJsonPath('installments.0.remaining_one_cents', 5001)->assertJsonPath('installments.0.remaining_two_cents', 3000)->assertJsonPath('installments.1.remaining_one_cents', 7001);
        $this->assertDatabaseCount('cg_entries', 1);
        foreach (['person-payment', 'invoice-payment'] as $route) {
            $query = ['target' => 'one', 'action' => 'total', 'month' => '2026-10', ...($route === 'invoice-payment' ? ['scope' => 'shared'] : [])];
            $this->getJson('/api/expense-control/debts/'.$id.'/'.$route.'?'.http_build_query($query))->assertUnprocessable();
            $this->postJson('/api/expense-control/debts/'.$id.'/'.$route, [...$data, ...$query, 'request_key' => (string) Str::uuid()])->assertUnprocessable();
        }
        $this->assertDatabaseCount('cg_entries', 1);
    }

    public function test_individual_total_settlement_includes_future_preserving_prior_payment(): void
    {
        $debt = $this->debt(['responsibility' => 'one']);
        $id = $debt['debt']['id'];
        $prior = $this->preview($id, ['action' => 'partial', 'amount_cents' => 1001]);
        $this->postJson('/api/expense-control/debts/'.$id.'/person-payment', $this->confirmation($prior))->assertCreated();
        $plan = $this->preview($id, ['action' => 'total']);
        $this->assertSame(29002, $plan['total_cents']);
        $this->postJson('/api/expense-control/debts/'.$id.'/person-payment', $this->confirmation($plan))->assertCreated();
        $this->getJson('/api/expense-control/debts/'.$id)->assertJsonPath('installments.0.remaining_one_cents', 0)->assertJsonPath('installments.1.remaining_one_cents', 0)->assertJsonPath('installments.2.remaining_one_cents', 0);
        $this->assertSame(30003, (int) DB::table('cg_entries')->sum('amount_cents'));
        $this->assertSame(0, (int) DB::table('cg_entries')->sum('credit_two_cents'));
        $this->assertDatabaseCount('cg_entries', 4);
    }

    public function test_repeated_request_replays_and_a_stale_preview_cannot_charge_again(): void
    {
        $id = $this->debt()['debt']['id'];
        $plan = $this->preview($id);
        $data = $this->confirmation($plan);
        $first = $this->postJson('/api/expense-control/debts/'.$id.'/person-payment', $data)->assertCreated()->json('id');
        $this->postJson('/api/expense-control/debts/'.$id.'/person-payment', $data)->assertCreated()->assertJsonPath('replayed', true)->assertJsonPath('id', $first);
        $this->postJson('/api/expense-control/debts/'.$id.'/person-payment', [...$data, 'request_key' => (string) Str::uuid()])->assertStatus(422);
        $this->assertSame(1, DB::table('cg_operations')->count());
        $this->assertSame(1, DB::table('cg_entries')->count());
    }

    public function test_overpayment_wrong_person_and_cancelled_debt_never_create_entries(): void
    {
        $debt = $this->debt(['responsibility' => 'one']);
        $id = $debt['debt']['id'];
        foreach ([['target' => 'one', 'action' => 'partial', 'amount_cents' => 99999999], ['target' => 'two', 'action' => 'total']] as $data) {
            $this->getJson('/api/expense-control/debts/'.$id.'/person-payment?'.http_build_query(['month' => '2026-10', ...$data]))->assertStatus(422);
        }
        $plan = $this->preview($id);
        DB::table('cg_debts')->where('id', $id)->update(['cancelled_at' => now()]);
        $this->postJson('/api/expense-control/debts/'.$id.'/person-payment', $this->confirmation($plan))->assertStatus(422);
        $this->assertSame(0, DB::table('cg_operations')->count());
        $this->assertSame(0, DB::table('cg_entries')->count());
    }

    public function test_month_scope_uses_due_year_and_month_and_read_queries_never_generate_recurring_rows(): void
    {
        $debt = $this->debt(['recurrence' => 'monthly', 'responsibility' => 'one']);
        $id = $debt['debt']['id'];
        DB::table('cg_installments')->where('debt_id', $id)->update(['due_on' => '2027-10-10']);
        $count = DB::table('cg_installments')->count();
        $this->getJson('/api/expense-control/person-balances?target=one&month=2027-10')->assertOk()->assertJsonPath('debts.0.month_remaining_cents', 10001);
        $this->preview($id, ['action' => 'month', 'month' => '2027-10']);
        $this->getJson('/api/expense-control/debts/'.$id.'/person-payment?target=one&action=month&month=2026-10')->assertStatus(422);
        $this->assertSame($count, DB::table('cg_installments')->count());
    }

    public function test_institution_totals_include_future_installments_and_respect_credits_and_person_filter(): void
    {
        $debt = $this->debt();
        $this->postJson('/api/expense-control/operations', ['request_key' => (string) Str::uuid(), 'installment_ids' => [$debt['installments'][0]['id']], 'target' => 'one', 'kind' => 'discount', 'amount_cents' => 1001, 'occurred_on' => '2026-10-15'])->assertCreated();
        $this->getJson('/api/expense-control/debts?month=2026-10&person=one')->assertOk()->assertJsonPath('catalog_counts.0.remaining_cents', 20002);
        $this->getJson('/api/expense-control/debts?month=2026-10&person=two')->assertOk()->assertJsonPath('catalog_counts.0.remaining_cents', 9000);
        $this->getJson('/api/expense-control/debts?month=2026-10')->assertOk()->assertJsonPath('catalog_counts.0.remaining_cents', 29002);
        $this->debt(['responsibility' => 'one', 'start_month' => '2027-01', 'name' => 'Somente futura']);
        $this->getJson('/api/expense-control/debts?month=2026-10&month_only=1&person=one')->assertOk()
            ->assertJsonPath('total', 1)->assertJsonPath('institution_balances.0.remaining_cents', 50005);
    }

    public function test_failure_in_existing_audit_rolls_back_all_entries_and_operation(): void
    {
        $id = $this->debt(['responsibility' => 'one'])['debt']['id'];
        $plan = $this->preview($id, ['action' => 'total']);
        $this->mock(Audit::class)->shouldReceive('record')->once()->andThrow(new \RuntimeException('Fixture failure'));
        $this->postJson('/api/expense-control/debts/'.$id.'/person-payment', $this->confirmation($plan))->assertStatus(500);
        $this->assertSame(0, DB::table('cg_entries')->count());
        $this->assertSame(0, DB::table('cg_operations')->count());
        $this->assertSame(30003, $this->preview($id, ['action' => 'total'])['total_cents']);
    }

    public function test_aggregate_settlement_supports_valid_installments_above_the_single_installment_ceiling(): void
    {
        $id = $this->debt(['responsibility' => 'one', 'amount_cents' => 100000000, 'installment_count' => 2])['debt']['id'];
        $plan = $this->preview($id, ['action' => 'total']);
        $this->assertSame(200000000, $plan['total_cents']);
        $this->postJson('/api/expense-control/debts/'.$id.'/person-payment', $this->confirmation($plan))->assertCreated();
        $this->assertSame(200000000, (int) DB::table('cg_entries')->sum('amount_cents'));
        $this->assertSame(100000000, (int) DB::table('cg_entries')->max('amount_cents'));
        $this->assertSame(0, (int) DB::table('cg_entries')->sum('credit_two_cents'));
    }

    public function test_unpermitted_user_cannot_read_plans_or_record_payment(): void
    {
        $id = $this->debt()['debt']['id'];
        $plan = $this->preview($id);
        $user = User::create(['name' => 'Fixture restricted', 'login' => Str::uuid(), 'password' => 'Teste#Seguro123', 'role_id' => Role::where('name', 'Administrador Simples')->value('id'), 'active' => true]);
        $this->actingAs($user);
        $this->getJson('/api/expense-control/person-balances?target=one&month=2026-10')->assertForbidden();
        $this->getJson('/api/expense-control/debts/'.$id.'/person-payment?target=one&action=month&month=2026-10')->assertForbidden();
        $this->postJson('/api/expense-control/debts/'.$id.'/person-payment', $this->confirmation($plan))->assertForbidden();
        $this->assertSame(0, DB::table('cg_entries')->count());
    }
}
