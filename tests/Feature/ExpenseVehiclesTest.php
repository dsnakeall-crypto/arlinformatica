<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ExpenseVehiclesTest extends TestCase
{
    use RefreshDatabase;

    private int $institution;

    private int $type;

    private int $vehicle;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->travelTo(now()->setDate(2026, 10, 20)->startOfDay());
        $this->actingAs($this->account('Master'));
        $this->institution = $this->postJson('/api/expense-control/catalogs/institutions', [
            'name' => 'Oficina e lavagem', 'due_day' => 10, 'active' => true, 'color' => '#dda548',
        ])->assertOk()->json('id');
        $this->type = $this->postJson('/api/expense-control/catalogs/types', [
            'name' => 'Despesas do carro', 'active' => true,
        ])->assertOk()->json('id');
        $this->vehicle = $this->postJson('/api/expense-control/vehicles', [
            'name' => 'Peugeot 3008', 'plate' => 'ABC1D23', 'notes' => 'Carro fictício',
        ])->assertCreated()->json('id');
    }

    private function account(string $role): User
    {
        return User::create([
            'name' => $role, 'login' => (string) Str::uuid(), 'password' => 'Teste#Seguro123',
            'role_id' => Role::where('name', $role)->value('id'), 'active' => true,
        ]);
    }

    private function entry(array $extra = []): array
    {
        return array_replace([
            'request_key' => (string) Str::uuid(), 'vehicle_id' => $this->vehicle,
            'kind' => 'maintenance', 'occurred_on' => '2026-10-20',
            'location' => 'Oficina de teste', 'odometer_km' => 74000, 'next_due_km' => 84000,
            'next_due_on' => '2027-04-20', 'work_notes' => 'Troca de óleo e filtros',
            'attention_notes' => 'Verificar arrefecimento',
            'responsibility' => 'shared', 'institution_id' => $this->institution, 'type_id' => $this->type,
            'amount_cents' => 49500,
            'items' => [
                ['description' => 'Óleo motor', 'amount_cents' => 28000],
                ['description' => 'Filtro', 'amount_cents' => 6500],
            ],
        ], $extra);
    }

    public function test_maintenance_preserves_history_and_creates_exactly_one_split_debt(): void
    {
        DB::table('cg_people')->where('id', 1)->update(['default_percent' => 60]);
        DB::table('cg_people')->where('id', 2)->update(['default_percent' => 40]);
        $payload = $this->entry();
        $response = $this->postJson('/api/expense-control/vehicle-events', $payload)->assertCreated()->json();
        $this->assertDatabaseHas('cg_vehicle_events', [
            'id' => $response['id'], 'debt_id' => $response['debt_id'], 'odometer_km' => 74000,
            'next_due_km' => 84000, 'kind' => 'maintenance',
        ]);
        $this->assertDatabaseHas('cg_debts', [
            'id' => $response['debt_id'], 'recurrence' => 'once', 'amount_cents' => 49500,
            'responsibility' => 'shared', 'percent_one' => 60,
        ]);
        $this->assertDatabaseHas('cg_installments', [
            'debt_id' => $response['debt_id'], 'share_one_cents' => 29700, 'share_two_cents' => 19800,
        ]);
        $this->assertDatabaseCount('cg_vehicle_event_items', 2);
        $this->getJson('/api/expense-control/vehicles')->assertOk()
            ->assertJsonPath('events.0.vehicle_name', 'Peugeot 3008')
            ->assertJsonPath('events.0.items.0.description', 'Óleo motor');
        $this->getJson('/api/expense-control/summary?month=2026-10')->assertOk()
            ->assertJsonPath('totals.original_cents', 49500);
        $this->postJson('/api/expense-control/vehicle-events', $payload)->assertOk()->assertJsonPath('replayed', true);
        $this->assertDatabaseCount('cg_vehicle_events', 1);
        $this->assertDatabaseCount('cg_debts', 1);
        $this->assertDatabaseCount('cg_installments', 1);
        $this->assertDatabaseCount('cg_vehicle_event_items', 2);
        $this->postJson('/api/expense-control/vehicle-events', [...$payload, 'amount_cents' => 50000])->assertStatus(409);
    }

    public function test_wash_is_a_single_debt_for_only_carol_and_history_survives_payment(): void
    {
        $payload = $this->entry([
            'kind' => 'wash', 'responsibility' => 'two', 'amount_cents' => 5500,
            'items' => [], 'work_notes' => null, 'next_due_km' => null, 'next_due_on' => null,
        ]);
        $created = $this->postJson('/api/expense-control/vehicle-events', $payload)->assertCreated()->json();
        $inst = DB::table('cg_installments')->where('debt_id', $created['debt_id'])->first();
        $this->assertSame(0, (int) $inst->share_one_cents);
        $this->assertSame(5500, (int) $inst->share_two_cents);
        $this->postJson('/api/expense-control/operations', [
            'request_key' => (string) Str::uuid(), 'installment_ids' => [$inst->id],
            'kind' => 'payment', 'target' => 'two', 'paid_by' => 2,
            'occurred_on' => '2026-10-20', 'amount_cents' => 5500, 'notes' => 'Lavagem paga',
        ])->assertSuccessful();
        $this->getJson('/api/expense-control/vehicles')->assertOk()
            ->assertJsonCount(1, 'events')
            ->assertJsonPath('events.0.debt_id', $created['debt_id']);
        $this->assertDatabaseCount('cg_vehicle_events', 1);
    }

    public function test_invalid_amount_or_mileage_roll_back_financial_records(): void
    {
        $this->postJson('/api/expense-control/vehicle-events', $this->entry(['amount_cents' => 1000]))->assertUnprocessable();
        $this->postJson('/api/expense-control/vehicle-events', $this->entry(['next_due_km' => 70000]))->assertUnprocessable();
        $this->postJson('/api/expense-control/vehicle-events', $this->entry(['institution_id' => 999999]))->assertUnprocessable();
        $this->assertDatabaseCount('cg_debts', 0);
        $this->assertDatabaseCount('cg_vehicle_events', 0);
    }

    public function test_maintenance_accepts_optional_date_and_notes_with_manual_total_without_items(): void
    {
        $payload = $this->entry([
            'amount_cents' => 150000,
            'items' => [],
            'next_due_on' => null,
            'work_notes' => null,
            'attention_notes' => null,
            'responsibility' => 'one',
        ]);
        $response = $this->postJson('/api/expense-control/vehicle-events', $payload)->assertCreated()->json();
        $this->assertDatabaseHas('cg_vehicle_events', [
            'id' => $response['id'],
            'next_due_on' => null,
            'work_notes' => null,
            'amount_cents' => 150000,
        ]);
        $this->assertDatabaseHas('cg_debts', [
            'id' => $response['debt_id'],
            'amount_cents' => 150000,
            'responsibility' => 'one',
        ]);
        $this->assertDatabaseCount('cg_vehicle_event_items', 0);
        $this->getJson('/api/expense-control/vehicles')->assertOk()
            ->assertJsonPath('events.0.next_due_on', null)
            ->assertJsonPath('events.0.items', []);
    }

    public function test_local_user_cannot_read_or_create_car_expenses(): void
    {
        $this->actingAs($this->account('Usuário local'));
        $this->getJson('/api/expense-control/vehicles')->assertForbidden();
        $this->postJson('/api/expense-control/vehicles', ['name' => 'Carro secreto'])->assertForbidden();
        $this->postJson('/api/expense-control/vehicle-events', $this->entry())->assertForbidden();
    }
}
