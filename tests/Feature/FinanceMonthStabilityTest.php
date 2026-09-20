<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use App\Services\CompanySettings;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FinanceMonthStabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_month_uses_only_paid_order_ids_when_open_orders_also_have_items(): void
    {
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);

        $user = User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => 'Finance Stability',
            'login' => 'finance-stability',
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
        $client = Client::create([
            'name' => 'Cliente Financeiro',
            'document' => '52998224725',
            'phone' => '35999998888',
            'postal_code' => '37160000',
            'street' => 'Rua Financeiro',
            'number' => '10',
            'district' => 'Centro',
            'city' => 'Campos Gerais',
            'state' => 'MG',
        ]);
        $equipment = DB::table('equipment_types')->value('id');
        $settings = app(CompanySettings::class);

        $paidOrder = ServiceOrder::create([
            'number' => '7888801',
            'client_id' => $client->id,
            'equipment_type_id' => $equipment,
            'attendance_type' => 'bench',
            'status' => 'analysis',
            'reported_problem' => 'OS que será paga no mês',
            'received_at' => now(),
            'created_by' => $user->id,
        ]);
        $paidOrder->snapshot()->create([
            'client' => $client->toArray(),
            'company' => $settings->snapshot(),
            'equipment' => ['name' => 'Notebook'],
            'term_text' => $settings->all()['term_text'],
        ]);

        $this->actingAs($user)->postJson("/api/orders/{$paidOrder->id}/finalize", [
            'result' => 'repair_completed',
            'technical_report' => 'Serviço concluído para validar o fechamento mensal.',
            'discount_cents' => 1000,
            'items' => [[
                'description' => 'Serviço pago',
                'quantity' => 1,
                'unit_price_cents' => 15000,
                'warranty_enabled' => false,
            ]],
        ])->assertCreated();

        $this->postJson("/api/orders/{$paidOrder->id}/payment", [
            'amount_cents' => 14000,
            'method' => 'pix',
            'idempotency_key' => 'finance-month-stability-paid-order',
        ])->assertCreated();

        $catalog = DB::table('service_catalog')->insertGetId([
            'name' => 'Item provisório sem pagamento',
            'category' => 'service',
            'price_cents' => 99999,
            'warranty_enabled' => false,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->postJson('/api/orders', [
            'client_id' => $client->id,
            'equipment_type_id' => $equipment,
            'attendance_type' => 'bench',
            'reported_problem' => 'OS aberta com item provisório',
            'checklist' => [],
            'items' => [['catalog_id' => $catalog, 'quantity' => 1]],
        ])->assertCreated();

        $period = now('America/Sao_Paulo')->format('Y-m');
        $response = $this->getJson("/api/finance/month?period={$period}")
            ->assertOk()
            ->assertJsonPath('period', $period)
            ->assertJsonPath('total_cents', 14000)
            ->assertJsonPath('service_orders_cents', 14000)
            ->assertJsonPath('paid_orders', 1)
            ->assertJsonPath('discount_cents', 1000);

        $items = collect($response->json('items'));
        $this->assertSame(15000, $items->firstWhere('description', 'Serviço pago')['total_cents']);
        $this->assertFalse($items->contains('description', 'Item provisório sem pagamento'));
        $this->assertSame('7888801', $response->json('transactions.0.order_number'));
        $this->assertSame('Finance Stability', $response->json('transactions.0.user_name'));
    }
}
