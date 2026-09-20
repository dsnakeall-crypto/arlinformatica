<?php

namespace Tests\Feature;

use App\Models\ServiceOrder;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FinanceRefundBalanceTest extends TestCase
{
    use RefreshDatabase;

    private ServiceOrder $order;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-09-12 08:00:00', 'UTC'));
        $master = User::create([
            'role_id' => DB::table('roles')->where('name', 'Master')->value('id'),
            'name' => 'Master', 'login' => 'refund-master', 'password' => 'Teste-Seguro-2026!', 'active' => true,
        ]);
        $client = DB::table('clients')->insertGetId([
            'name' => 'Cliente Estorno', 'document' => '52998224725', 'phone' => '35999999999',
            'postal_code' => '37130000', 'street' => 'Rua A', 'number' => '1', 'district' => 'Centro',
            'city' => 'Alfenas', 'state' => 'MG', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->order = ServiceOrder::create([
            'number' => '0000001', 'client_id' => $client,
            'equipment_type_id' => DB::table('equipment_types')->value('id'),
            'attendance_type' => 'bench', 'reported_problem' => 'Teste de estorno',
            'status' => 'completed', 'total_cents' => 13000, 'received_at' => now(),
            'completed_at' => now(), 'created_by' => $master->id,
        ]);
        $this->actingAs($master);
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_partial_refund_reduces_net_paid_without_reopening_collection(): void
    {
        $this->pay(13000, 'original')->assertCreated();
        $this->refund(1890)->assertCreated();

        $this->getJson("/api/orders/{$this->order->id}/payments")->assertOk()
            ->assertJsonPath('total_cents', 13000)
            ->assertJsonPath('gross_paid_cents', 13000)
            ->assertJsonPath('paid_cents', 11110)
            ->assertJsonPath('balance_cents', 1890)
            ->assertJsonPath('collectible_balance_cents', 0)
            ->assertJsonPath('refunded_cents', 1890)
            ->assertJsonPath('refundable_cents', 11110)
            ->assertJsonPath('status', 'partial');
        $this->getJson('/api/finance/receivables')->assertJsonPath('count', 0)->assertJsonPath('total_balance_cents', 0);
        $this->pay(1890, 'must-not-recollect-refund')->assertConflict();
        $this->assertDatabaseCount('payments', 1);
        $this->assertSame(13000, (int) $this->order->fresh()->total_cents);
    }

    public function test_refund_does_not_increase_an_existing_collectible_balance(): void
    {
        $this->pay(10000, 'partial')->assertCreated();
        $this->refund(1890)->assertCreated();

        $this->getJson("/api/orders/{$this->order->id}/payments")
            ->assertJsonPath('paid_cents', 8110)
            ->assertJsonPath('balance_cents', 4890)
            ->assertJsonPath('collectible_balance_cents', 3000);
        $this->getJson('/api/finance/receivables')->assertJsonPath('count', 1)
            ->assertJsonPath('total_balance_cents', 3000)
            ->assertJsonPath('data.0.paid_cents', 8110)
            ->assertJsonPath('data.0.refunded_cents', 1890)
            ->assertJsonPath('data.0.balance_cents', 3000);
        $this->pay(4890, 'too-much')->assertUnprocessable();
        $this->pay(3000, 'remaining-original-charge')->assertCreated();
        $this->getJson('/api/finance/receivables')->assertJsonPath('count', 0);
        $this->getJson("/api/orders/{$this->order->id}/payments")->assertJsonPath('paid_cents', 11110);
    }

    public function test_full_refund_is_not_paid_and_cannot_be_collected_or_refunded_again(): void
    {
        $this->pay(13000, 'full')->assertCreated();
        $this->refund(13000)->assertCreated();
        $this->getJson("/api/orders/{$this->order->id}/payments")
            ->assertJsonPath('paid_cents', 0)->assertJsonPath('balance_cents', 13000)
            ->assertJsonPath('collectible_balance_cents', 0)->assertJsonPath('refundable_cents', 0)
            ->assertJsonPath('status', 'unpaid');
        $this->pay(1, 'again')->assertConflict();
        $this->refund(1)->assertUnprocessable();
        $this->getJson('/api/finance/receivables')->assertJsonPath('count', 0);
    }

    public function test_daily_cash_subtracts_linked_refund_without_rewriting_its_positive_transaction(): void
    {
        $this->pay(13000, 'daily')->assertCreated();
        $this->postJson('/api/finance/quick-entry', ['amount_cents' => 12300])->assertCreated();
        $refund = $this->refund(1890)->assertCreated()->json();
        $daily = $this->getJson('/api/finance/daily?date=2026-09-12')->assertOk()
            ->assertJsonPath('total_cents', 23410)->json('transactions');
        $row = collect($daily)->firstWhere('id', $refund['financial_transaction_id']);
        $this->assertSame(-1890, $row['effective_cents']);
        $this->assertSame('cash', $row['method']);
        $this->assertSame('refund', $row['kind']);
        $this->assertSame('0000001', $row['order_number']);
        $this->assertSame('Troco faltou do desconto', $row['refund_reason']);
        $this->assertSame('Master', $row['user_name']);
        $this->assertDatabaseHas('financial_transactions', [
            'id' => $refund['financial_transaction_id'], 'origin' => 'adjustment', 'amount_cents' => 1890,
        ]);
    }

    public function test_unrelated_adjustments_are_not_mistaken_for_refunds(): void
    {
        DB::table('financial_transactions')->insert([
            'origin' => 'adjustment', 'description' => 'Outro ajuste', 'amount_cents' => 700,
            'occurred_at' => CarbonImmutable::now('UTC'), 'user_id' => auth()->id(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->getJson('/api/finance/daily?date=2026-09-12')->assertJsonPath('total_cents', 700);
    }

    public function test_refund_method_is_independent_from_original_payment_method(): void
    {
        $this->pay(13000, 'debit-payment', 'debit')->assertCreated();
        $this->postJson("/api/orders/{$this->order->id}/refunds", [
            'amount_cents' => 3000, 'method' => 'pix', 'reason' => 'Devolução combinada com o cliente',
        ])->assertCreated()->assertJsonPath('method', 'pix');

        $this->assertDatabaseHas('payments', [
            'service_order_id' => $this->order->id, 'amount_cents' => 13000, 'method' => 'debit',
        ]);
        $this->assertDatabaseHas('service_order_refunds', [
            'service_order_id' => $this->order->id, 'amount_cents' => 3000, 'method' => 'pix',
        ]);
        $this->postJson('/api/finance/expenses', [
            'spent_on' => '2026-09-12', 'description' => 'Material da bancada',
            'category' => 'usage_material', 'amount_cents' => 1200,
        ])->assertCreated();
        $this->getJson('/api/finance/month?period=2026-09')->assertOk()
            ->assertJsonPath('total_cents', 13000)
            ->assertJsonPath('refund_cents', 3000)
            ->assertJsonPath('expense_cents', 1200)
            ->assertJsonPath('net_cents', 8800)
            ->assertJsonPath('methods.debit.entry_cents', 13000)
            ->assertJsonPath('methods.debit.outflow_cents', 0)
            ->assertJsonPath('methods.pix.entry_cents', 0)
            ->assertJsonPath('methods.pix.outflow_cents', 3000);
        $this->postJson("/api/orders/{$this->order->id}/refunds", [
            'amount_cents' => 100, 'method' => 'debit', 'reason' => 'Forma não permitida',
        ])->assertUnprocessable();
    }

    public function test_refund_is_an_outflow_on_its_local_day_and_does_not_rewrite_the_payment_month(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-08-20 15:00:00', 'UTC'));
        $this->pay(13000, 'previous-month')->assertCreated();
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-01 02:30:00', 'UTC')); // 30/09 23:30 em São Paulo.
        $this->refund(1890)->assertCreated();
        $this->getJson('/api/finance/daily?date=2026-09-30')->assertJsonPath('total_cents', -1890);
        $this->getJson('/api/finance/daily?date=2026-10-01')->assertJsonPath('total_cents', 0);
        $this->getJson('/api/finance/month?period=2026-08')
            ->assertJsonPath('total_cents', 13000)->assertJsonPath('refund_cents', 0)->assertJsonMissingPath('outflow_cents');
        $this->getJson('/api/finance/month?period=2026-09')
            ->assertJsonPath('total_cents', 0)->assertJsonPath('refund_cents', 1890)
            ->assertJsonPath('daily_expenses.2026-09-30', null)
            ->assertJsonPath('daily_refunds.2026-09-30', 1890)
            ->assertJsonMissingPath('outflow_cents');
    }

    private function pay(int $amount, string $key, string $method = 'pix')
    {
        return $this->postJson("/api/orders/{$this->order->id}/payment", [
            'amount_cents' => $amount, 'method' => $method, 'idempotency_key' => $key,
        ]);
    }

    private function refund(int $amount)
    {
        return $this->postJson("/api/orders/{$this->order->id}/refunds", [
            'amount_cents' => $amount, 'method' => 'cash', 'reason' => 'Troco faltou do desconto',
        ]);
    }
}
