<?php

namespace Tests\Feature;

use App\Http\Controllers\ServiceOrderController;
use App\Models\Client;
use App\Models\ServiceOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class OrderTabCountersPerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_empty_counters_are_zero_and_use_a_single_aggregate_query(): void
    {
        DB::enableQueryLog();
        DB::flushQueryLog();
        $method = new \ReflectionMethod(ServiceOrderController::class, 'tabCounts');
        $counts = $method->invoke(app(ServiceOrderController::class));
        $queries = DB::getQueryLog();
        DB::disableQueryLog();
        $this->assertSame(['progress' => 0, 'awaiting_payment' => 0, 'finalized' => 0, 'interrupted' => 0, 'all' => 0], $counts);
        $this->assertCount(1, $queries);
    }

    public function test_counts_match_each_tab_with_payments_latest_adjustments_and_soft_delete(): void
    {
        $this->seed(DatabaseSeeder::class);
        $user = User::create(['role_id' => DB::table('roles')->where('name', 'Master')->value('id'), 'name' => 'Master Perf', 'login' => 'perf-tabs', 'password' => 'Senha#123', 'active' => true]);
        $client = Client::create(['name' => 'Cliente Performance', 'document' => '52998224725', 'phone' => '35999990000', 'postal_code' => '37160000', 'street' => 'Rua A', 'number' => '1', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG']);
        $base = ['client_id' => $client->id, 'equipment_type_id' => DB::table('equipment_types')->value('id'), 'attendance_type' => 'bench', 'reported_problem' => 'Performance', 'received_at' => now(), 'created_by' => $user->id, 'total_cents' => 10000];
        $cases = [
            ['analysis', 0, null, false], ['waiting_part', 0, null, false], ['in_service', 0, null, false],
            ['completed', 0, null, false], ['completed', 4000, null, false], ['completed', 10000, null, false],
            ['completed', 10000, 3000, false], ['completed', 3000, 10000, false],
            ['interrupted', 10000, null, false], ['analysis', 0, null, true], ['completed', 10000, null, true],
        ];
        foreach ($cases as $index => [$status, $paid, $adjusted, $deleted]) {
            $order = ServiceOrder::create([...$base, 'number' => (string) (9200000 + $index), 'status' => $status, 'completed_at' => in_array($status, ['completed', 'interrupted']) ? now() : null]);
            if ($paid) {
                $payment = DB::table('payments')->insertGetId(['service_order_id' => $order->id, 'amount_cents' => $paid, 'method' => 'pix', 'paid_at' => now(), 'user_id' => $user->id, 'idempotency_key' => 'performance-payment-'.$index, 'created_at' => now(), 'updated_at' => now()]);
                $transaction = DB::table('financial_transactions')->insertGetId(['payment_id' => $payment, 'amount_cents' => $paid, 'origin' => 'service_order', 'occurred_at' => now(), 'user_id' => $user->id, 'created_at' => now(), 'updated_at' => now()]);
                if ($adjusted !== null) {
                    foreach ([5000, $adjusted] as $value) {
                        DB::table('financial_adjustments')->insert(['transaction_id' => $transaction, 'previous_cents' => $paid, 'new_cents' => $value, 'reason' => 'Teste de ajuste', 'user_id' => $user->id, 'created_at' => now(), 'updated_at' => now()]);
                    }
                }
            }
            if ($deleted) {
                DB::table('service_orders')->where('id', $order->id)->update(['deleted_at' => now()]);
            }
        }
        // Completed zero-value orders belong to finalized, even without payments.
        ServiceOrder::create([...$base, 'number' => '9200100', 'status' => 'completed', 'total_cents' => 0, 'completed_at' => now()]);
        $expected = ['progress' => 3, 'awaiting_payment' => 3, 'finalized' => 3, 'interrupted' => 1, 'all' => 10];
        foreach ($expected as $tab => $total) {
            $response = $this->actingAs($user)->getJson('/api/orders?tab='.$tab.'&per_page=1');
            $response->assertOk()->assertJsonPath('total', $total)->assertJsonPath('tab_counts', $expected);
        }
        // Search/status/pagination must not narrow the global tab counters.
        $this->getJson('/api/orders?tab=all&q=inexistente&status=analysis&per_page=1')
            ->assertOk()->assertJsonPath('total', 0)->assertJsonPath('tab_counts', $expected);
    }
}
