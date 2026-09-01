<?php

namespace Tests\Feature;

use App\Models\ServiceOrder;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StageFiveTest extends TestCase
{
    use RefreshDatabase;

    private User $master;

    private User $employee;

    private ServiceOrder $order;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        Storage::fake('local');
        $this->master = $this->user('Master', 'master');
        $this->employee = $this->user('Funcionário', 'employee');
        $client = DB::table('clients')->insertGetId(['name' => 'Cliente', 'document' => '52998224725', 'phone' => '35999999999', 'postal_code' => '37160000', 'street' => 'Rua A', 'number' => '1', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG', 'created_at' => now(), 'updated_at' => now()]);
        $this->order = ServiceOrder::create(['number' => '0000200', 'client_id' => $client, 'equipment_type_id' => DB::table('equipment_types')->value('id'), 'attendance_type' => 'bench', 'status' => 'in_service', 'reported_problem' => 'Teste', 'received_at' => now(), 'total_cents' => 12550, 'created_by' => $this->master->id]);
    }

    public function test_payment_is_in_cents_supports_methods_and_does_not_change_operational_status(): void
    {
        foreach (['pix', 'cash', 'debit', 'credit', 'transfer', 'other'] as $index => $method) {
            $order = $index ? $this->newOrder($index) : $this->order;
            $this->actingAs($this->employee)->postJson("/api/orders/{$order->id}/payment", ['amount_cents' => 12550, 'method' => $method, 'idempotency_key' => "key-$index"])->assertCreated()->assertJsonPath('amount_cents', 12550);
            $this->assertSame('in_service', $order->fresh()->status);
        }
        $this->assertDatabaseCount('financial_transactions', 6);
    }

    public function test_duplicate_payment_is_rejected(): void
    {
        $payload = ['amount_cents' => 1000, 'method' => 'pix', 'idempotency_key' => 'same'];
        $this->actingAs($this->employee)->postJson("/api/orders/{$this->order->id}/payment", $payload)->assertCreated();
        $this->postJson("/api/orders/{$this->order->id}/payment", [...$payload, 'idempotency_key' => 'other'])->assertConflict();
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_quick_entry_daily_cash_and_overview_use_sao_paulo_timezone(): void
    {
        Carbon::setTestNow('2026-09-02 02:30:00 UTC'); // 01/09 23:30 em São Paulo
        $this->actingAs($this->employee)->postJson('/api/finance/quick-entry', ['amount_cents' => 7500])->assertCreated()->assertJsonPath('description', 'Serviço rápido não cadastrado');
        $this->getJson('/api/finance/daily?date=2026-09-01')->assertOk()->assertJsonPath('timezone', 'America/Sao_Paulo')->assertJsonPath('total_cents', 7500);
        $this->getJson('/api/finance/daily?date=2026-09-02')->assertJsonPath('total_cents', 0);
        $this->getJson('/api/finance/overview?date=2026-09-01')->assertJsonPath('today_cents', 7500)->assertJsonPath('month_total_cents', 7500);
    }

    public function test_month_closing_adjustment_permissions_and_private_pdf_are_auditable(): void
    {
        Carbon::setTestNow('2026-09-15 15:00:00 UTC');
        $this->actingAs($this->employee)->postJson("/api/orders/{$this->order->id}/payment", ['amount_cents' => 12550, 'method' => 'credit', 'idempotency_key' => 'payment'])->assertCreated();
        $quick = $this->postJson('/api/finance/quick-entry', ['amount_cents' => 2450])->assertCreated()->json();
        $this->postJson("/api/finance/transactions/{$quick['id']}/adjust", ['new_cents' => 2000, 'reason' => 'Valor digitado incorretamente'])->assertForbidden();
        $this->actingAs($this->master)->postJson("/api/finance/transactions/{$quick['id']}/adjust", ['new_cents' => 2000, 'reason' => 'Valor digitado incorretamente'])->assertCreated()->assertJsonPath('previous_cents', 2450);
        $this->getJson('/api/finance/month?period=2026-09')->assertOk()->assertJsonPath('total_cents', 14550)->assertJsonPath('service_orders_cents', 12550)->assertJsonPath('quick_entries_cents', 2000)->assertJsonPath('paid_orders', 1);
        $document = $this->postJson('/api/finance/reports', ['period' => '2026-09'])->assertCreated()->json();
        $this->assertDatabaseHas('generated_documents', ['id' => $document['id'], 'type' => 'financial-report', 'period' => '2026-09']);
        $this->get($document['url'])->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertDatabaseHas('audit_logs', ['action' => 'finance.adjusted', 'subject_id' => $quick['id']]);
    }

    private function user(string $role, string $login): User
    {
        return User::create(['role_id' => DB::table('roles')->where('name', $role)->value('id'), 'name' => $role, 'login' => $login, 'password' => Hash::make('password-password')]);
    }

    private function newOrder(int $index): ServiceOrder
    {
        $order = $this->order->replicate(['number']);
        $order->number = str_pad((string) (200 + $index), 7, '0', STR_PAD_LEFT);
        $order->save();

        return $order;
    }
}
