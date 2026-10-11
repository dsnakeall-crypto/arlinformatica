<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Fase 6 do plano 09/10/2026: cinco indicadores e cards por responsável.
 * Banco SQLite em memória (phpunit.xml) — nunca o banco DDEV importado.
 */
class ExpenseSummaryIndicatorsTest extends TestCase
{
    use RefreshDatabase;

    private int $bank;

    private int $type;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->travelTo(now()->setDate(2026, 10, 2)->startOfDay());
        $master = User::create(['name' => 'Master', 'login' => Str::uuid(), 'password' => 'Teste#Seguro123', 'role_id' => Role::where('name', 'Master')->value('id'), 'active' => true]);
        $this->actingAs($master);
        $this->bank = $this->postJson('/api/expense-control/catalogs/institutions', ['name' => 'Cartão A', 'due_day' => 20, 'active' => true, 'color' => '#c9002c'])->assertOk()->json('id');
        $this->type = $this->postJson('/api/expense-control/catalogs/types', ['name' => 'Cartão', 'active' => true])->assertOk()->json('id');
    }

    private function debt(array $extra): array
    {
        $payload = ['request_key' => (string) Str::uuid(), 'institution_id' => $this->bank, 'type_id' => $this->type, 'name' => 'Compra', 'recurrence' => 'installments', 'responsibility' => 'one', 'percent_one' => 100, 'amount_cents' => 10000, 'installment_count' => 1, 'first_number' => 1, 'start_month' => '2026-10', 'due_day' => 20, 'notes' => null];

        return $this->postJson('/api/expense-control/debts', [...$payload, ...$extra])->assertCreated()->json();
    }

    private function operate(int $installment, array $extra): int
    {
        $payload = ['request_key' => (string) Str::uuid(), 'installment_ids' => [$installment], 'kind' => 'payment', 'target' => 'one', 'paid_by' => 1, 'occurred_on' => '2026-10-02', 'amount_cents' => null, 'notes' => null];
        $this->postJson('/api/expense-control/operations', [...$payload, ...$extra])->assertCreated();

        return (int) DB::table('cg_entries')->max('id');
    }

    private function summary(string $month = '2026-10'): array
    {
        return $this->getJson('/api/expense-control/summary?month='.$month)->assertOk()->json('totals');
    }

    /** Invariantes obrigatórias do plano, válidas em qualquer cenário. */
    private function assertInvariants(array $t): void
    {
        $this->assertSame($t['original_cents'], $t['one_original_cents'] + $t['two_original_cents'], 'Allan + Carol = global original');
        $this->assertSame($t['shared_original_cents'], $t['one_shared_original_cents'] + $t['two_shared_original_cents'], 'Casal = soma das cotas compartilhadas');
        $this->assertSame($t['one_original_cents'], $t['one_personal_original_cents'] + $t['one_shared_original_cents']);
        $this->assertSame($t['two_original_cents'], $t['two_personal_original_cents'] + $t['two_shared_original_cents']);
        $this->assertSame($t['remaining_cents'], $t['one_remaining_cents'] + $t['two_remaining_cents'], 'falta Allan + falta Carol = falta global');
        $this->assertSame($t['one_remaining_cents'], $t['one_original_cents'] - $t['one_credited_cents']);
        $this->assertSame($t['two_remaining_cents'], $t['two_original_cents'] - $t['two_credited_cents']);
        $this->assertSame($t['credited_cents'], $t['one_credited_cents'] + $t['two_credited_cents']);
    }

    public function test_owner_example_keeps_original_totals_and_reduces_only_the_remaining_balance(): void
    {
        $allan = $this->debt(['name' => 'Allan pessoal', 'amount_cents' => 100000]);
        $carol = $this->debt(['name' => 'Carol pessoal', 'responsibility' => 'two', 'percent_one' => 0, 'amount_cents' => 50000]);
        $this->debt(['name' => 'Casal 300/100', 'responsibility' => 'shared', 'percent_one' => 50, 'amount_cents' => 40000, 'split_mode' => 'amount', 'share_one_cents' => 30000, 'share_two_cents' => 10000]);

        $before = $this->summary();
        $this->assertInvariants($before);
        $this->assertSame(190000, $before['original_cents']);
        $this->assertSame(130000, $before['one_original_cents']);
        $this->assertSame(60000, $before['two_original_cents']);
        $this->assertSame(40000, $before['shared_original_cents']);
        $this->assertSame([100000, 30000, 50000, 10000], [$before['one_personal_original_cents'], $before['one_shared_original_cents'], $before['two_personal_original_cents'], $before['two_shared_original_cents']]);

        $this->operate($allan['installments'][0]['id'], ['kind' => 'advance', 'amount_cents' => 20000]);
        $this->operate($carol['installments'][0]['id'], ['target' => 'two', 'paid_by' => 2, 'amount_cents' => 10000]);

        $after = $this->summary();
        $this->assertInvariants($after);
        $this->assertSame(190000, $after['original_cents'], 'Total a pagar no mês não diminui com pagamentos');
        $this->assertSame(130000, $after['one_original_cents'], 'Valor total do Allan permanece');
        $this->assertSame(60000, $after['two_original_cents']);
        $this->assertSame(20000, $after['one_credited_cents']);
        $this->assertSame(110000, $after['one_remaining_cents']);
        $this->assertSame(10000, $after['two_credited_cents']);
        $this->assertSame(50000, $after['two_remaining_cents']);
        $this->assertSame(160000, $after['remaining_cents']);
        $this->assertSame('2026-10-20', $after['next_due_on']);
        $this->assertNull($after['oldest_overdue_on']);
    }

    public function test_payment_made_by_carol_reduces_allans_share_without_touching_her_balance(): void
    {
        $allan = $this->debt(['amount_cents' => 100000]);
        $this->debt(['responsibility' => 'two', 'percent_one' => 0, 'amount_cents' => 50000]);
        $this->operate($allan['installments'][0]['id'], ['target' => 'one', 'paid_by' => 2, 'amount_cents' => 30000]);

        $t = $this->summary();
        $this->assertInvariants($t);
        $this->assertSame(30000, $t['one_credited_cents'], 'Crédito pertence ao titular da cota, não a quem pagou');
        $this->assertSame(0, $t['two_credited_cents']);
        $this->assertSame(70000, $t['one_remaining_cents']);
        $this->assertSame(50000, $t['two_remaining_cents']);
        $this->assertSame(150000, $t['original_cents']);
    }

    public function test_reversal_legacy_discount_and_fifty_fifty_split_stay_reconciled_to_the_cent(): void
    {
        $shared = $this->debt(['responsibility' => 'shared', 'percent_one' => 50, 'amount_cents' => 10001]);
        $id = $shared['installments'][0]['id'];
        $entry = $this->operate($id, ['target' => 'both', 'paid_by' => 1]);
        $this->assertSame(0, $this->summary()['remaining_cents']);
        $this->postJson('/api/expense-control/entries/'.$entry.'/reverse', ['reason' => 'Estorno de teste'])->assertOk();

        $t = $this->summary();
        $this->assertInvariants($t);
        $this->assertSame([5001, 5000], [$t['one_shared_original_cents'], $t['two_shared_original_cents']], 'centavo determinístico para o responsável 1');
        $this->assertSame(0, $t['credited_cents'], 'Estorno devolve o saldo');
        $this->assertSame(10001, $t['remaining_cents']);

        $this->operate($id, ['kind' => 'discount', 'target' => 'two', 'paid_by' => null, 'amount_cents' => 1000]);
        $t = $this->summary();
        $this->assertInvariants($t);
        $this->assertSame(1000, $t['two_credited_cents'], 'Abatimento legado reduz somente a parte de quem o recebeu');
        $this->assertSame(0, $t['paid_cents'], 'Abatimento não é dinheiro pago');
        $this->assertSame(10001, $t['original_cents']);
        $this->assertSame(4000, $t['two_remaining_cents']);
    }

    public function test_multiple_invoices_months_settled_debt_and_empty_month(): void
    {
        $other = $this->postJson('/api/expense-control/catalogs/institutions', ['name' => 'Banco B', 'due_day' => 5, 'active' => true, 'color' => '#123456'])->assertOk()->json('id');
        $paid = $this->debt(['name' => 'Já quitada', 'amount_cents' => 20000, 'due_day' => 3]);
        $this->debt(['name' => 'Segunda fatura mesmo cartão', 'amount_cents' => 15000]);
        $this->debt(['name' => 'Parcelada', 'responsibility' => 'shared', 'percent_one' => 50, 'amount_cents' => 30000, 'installment_count' => 3, 'institution_id' => $other, 'due_day' => 5]);
        $this->debt(['name' => 'Vencida', 'amount_cents' => 5000, 'due_day' => 1]);
        $this->operate($paid['installments'][0]['id'], []);

        $october = $this->summary();
        $this->assertInvariants($october);
        $this->assertSame(70000, $october['original_cents'], 'Dívida quitada continua no total original do mês');
        $this->assertSame(50000, $october['remaining_cents']);
        $this->assertSame('2026-10-05', $october['next_due_on'], 'Próximo vencimento pendente, ignorando a quitada de 03/10');
        $this->assertSame('2026-10-01', $october['oldest_overdue_on']);

        $november = $this->summary('2026-11');
        $this->assertInvariants($november);
        $this->assertSame(30000, $november['original_cents'], 'Somente a parcela de novembro');
        $this->assertSame([15000, 15000], [$november['one_shared_original_cents'], $november['two_shared_original_cents']]);
    }

    public function test_empty_month_returns_zeros(): void
    {
        $t = $this->summary('2027-05');
        $this->assertInvariants($t);
        foreach (['original_cents', 'remaining_cents', 'one_original_cents', 'two_original_cents', 'shared_original_cents', 'credited_cents'] as $key) {
            $this->assertSame(0, $t[$key], $key);
        }
        $this->assertNull($t['next_due_on']);
    }

    public function test_api_keeps_previous_fields_for_older_clients(): void
    {
        $this->debt(['amount_cents' => 1000]);
        $response = $this->getJson('/api/expense-control/summary?month=2026-10')->assertOk();
        $this->assertLegacyShape($response);
    }

    public function test_detailed_statement_lists_every_bank_and_exact_owner_share_without_changing_data(): void
    {
        $secondBank = $this->postJson('/api/expense-control/catalogs/institutions', ['name' => 'Nubank', 'due_day' => 15, 'active' => true, 'color' => '#5433ab'])->assertOk()->json('id');
        $carol = $this->debt(['name' => 'Fatura pessoal Carol', 'responsibility' => 'two', 'percent_one' => 0, 'amount_cents' => 50000]);
        $shared = $this->debt(['name' => 'Compra compartilhada', 'responsibility' => 'shared', 'percent_one' => 50, 'amount_cents' => 40000,
            'split_mode' => 'amount', 'share_one_cents' => 30000, 'share_two_cents' => 10000]);
        $this->debt(['name' => 'Nubank parcelado', 'responsibility' => 'two', 'percent_one' => 0, 'amount_cents' => 20000, 'institution_id' => $secondBank, 'installment_count' => 2]);
        $this->operate($carol['installments'][0]['id'], ['target' => 'two', 'paid_by' => 1, 'amount_cents' => 50000]);
        $this->operate($shared['installments'][0]['id'], ['target' => 'two', 'paid_by' => 1, 'amount_cents' => 3000]);

        $beforeInstallments = DB::table('cg_installments')->count();
        $beforeEntries = DB::table('cg_entries')->count();
        $response = $this->getJson('/api/expense-control/statement-details?month=2026-10')
            ->assertOk()->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('month', '2026-10')
            ->assertJsonCount(3, 'data');
        $rows = collect($response->json('data'));
        $this->assertEqualsCanonicalizing([$this->bank, $secondBank], $rows->pluck('institution_id')->unique()->all());
        $this->assertSame(110000, $rows->sum('original_cents'));
        $this->assertSame(53000, $rows->sum('credit_cents'));
        $this->assertSame(30000, $rows->sum('share_one_cents'));
        $this->assertSame(80000, $rows->sum('share_two_cents'));
        $this->assertSame(30000, $rows->sum('remaining_one_cents'));
        $this->assertSame(27000, $rows->sum('remaining_two_cents'));
        $this->assertSame(57000, $rows->sum('remaining_cents'));
        $item = $rows->firstWhere('debt_name', 'Compra compartilhada');
        $this->assertSame('shared', $item['responsibility']);
        $this->assertSame([30000, 10000], [$item['share_one_cents'], $item['share_two_cents']]);
        $this->assertSame([30000, 7000], [$item['remaining_one_cents'], $item['remaining_two_cents']]);
        $this->assertTrue($rows->contains(fn ($i) => $i['debt_name'] === 'Fatura pessoal Carol' && $i['remaining_cents'] === 0), 'Faturas pagas seguem no relatório original.');
        $this->assertSame($beforeInstallments, DB::table('cg_installments')->count());
        $this->assertSame($beforeEntries, DB::table('cg_entries')->count());
        $summary = $this->summary();
        $this->assertSame($summary['one_original_cents'], $rows->sum('share_one_cents'));
        $this->assertSame($summary['two_original_cents'], $rows->sum('share_two_cents'));
        $this->assertSame($summary['remaining_cents'], $rows->sum('remaining_cents'));
        $novemberBefore = DB::table('cg_installments')->count();
        $november = $this->getJson('/api/expense-control/statement-details?month=2026-11')->assertOk()->json('data');
        $this->assertCount(1, $november, 'A segunda parcela já existente precisa aparecer no seu próprio mês.');
        $this->assertSame($novemberBefore, DB::table('cg_installments')->count(), 'Consultar PDF nunca cria parcelas novas.');
    }

    private function assertLegacyShape(TestResponse $response): void
    {
        $response->assertJsonStructure(['month', 'monthly_invoices', 'views' => ['one', 'two', 'shared'], 'institutions', 'count', 'next_due', 'overdue', 'partial_installments', 'personal_next_due', 'personal_overdue',
            'totals' => ['original_cents', 'paid_cents', 'discount_cents', 'remaining_cents', 'one_original_cents', 'two_original_cents', 'one_remaining_cents', 'two_remaining_cents', 'shared_original_cents', 'shared_remaining_cents', 'one_paid_cents', 'two_paid_cents']]);
    }
}
