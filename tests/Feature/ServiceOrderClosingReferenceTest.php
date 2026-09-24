<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ServiceOrderClosingReferenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
    }

    public function test_master_and_administrator_can_mark_update_and_clear_with_audit(): void
    {
        $order = $this->order($this->user('Master', 'closing-owner'));
        $master = $this->user('Master', 'closing-master');
        $admin = $this->user('Administrador', 'closing-admin');

        $this->actingAs($master)->patchJson("/api/orders/{$order->id}/closing-reference", ['amount_cents' => 12500])
            ->assertOk()->assertJsonPath('closing_reference_cents', 12500);
        $this->actingAs($admin)->patchJson("/api/orders/{$order->id}/closing-reference", ['amount_cents' => 13800])
            ->assertOk()->assertJsonPath('closing_reference_cents', 13800);
        $this->actingAs($master)->deleteJson("/api/orders/{$order->id}/closing-reference")
            ->assertOk()->assertJsonPath('closing_reference_cents', null);

        foreach (['service_order.closing_reference_marked', 'service_order.closing_reference_updated', 'service_order.closing_reference_cleared'] as $action) {
            $this->assertDatabaseHas('audit_logs', ['action' => $action, 'subject_id' => $order->id]);
        }
    }

    public function test_employee_cannot_mark_even_by_calling_the_api_directly(): void
    {
        $owner = $this->user('Master', 'closing-owner-employee');
        $order = $this->order($owner);

        $this->actingAs($this->user('Funcionário', 'closing-employee'))
            ->patchJson("/api/orders/{$order->id}/closing-reference", ['amount_cents' => 5000])
            ->assertForbidden();

        $this->assertNull($order->fresh()->closing_reference_cents);
        $this->assertDatabaseMissing('audit_logs', ['action' => 'service_order.closing_reference_marked', 'subject_id' => $order->id]);
    }

    public function test_reference_never_changes_finance_items_totals_or_stock(): void
    {
        $master = $this->user('Master', 'closing-invariants');
        $order = $this->order($master);
        $product = DB::table('service_catalog')->insertGetId([
            'name' => 'SSD', 'category' => 'product', 'price_cents' => 25000, 'stock_quantity' => 7,
            'warranty_enabled' => false, 'active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('service_order_items')->insert([
            'service_order_id' => $order->id, 'catalog_id' => $product, 'description' => 'SSD', 'quantity' => 1,
            'stock_applied_quantity' => 1, 'unit_price_cents' => 25000, 'subtotal_cents' => 25000,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $order->forceFill(['subtotal_cents' => 25000, 'total_cents' => 25000])->save();
        $itemsBefore = DB::table('service_order_items')->where('service_order_id', $order->id)->get()->map(fn ($item) => (array) $item)->all();
        $financialBefore = DB::table('financial_transactions')->count();

        $this->actingAs($master)->patchJson("/api/orders/{$order->id}/closing-reference", ['amount_cents' => 24000])->assertOk();

        $this->assertSame($financialBefore, DB::table('financial_transactions')->count());
        $this->assertSame($itemsBefore, DB::table('service_order_items')->where('service_order_id', $order->id)->get()->map(fn ($item) => (array) $item)->all());
        $this->assertSame(25000, (int) $order->fresh()->subtotal_cents);
        $this->assertSame(25000, (int) $order->fresh()->total_cents);
        $this->assertSame(7, (int) DB::table('service_catalog')->where('id', $product)->value('stock_quantity'));
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_finalizing_clears_the_reference(): void
    {
        $master = $this->user('Master', 'closing-finalize');
        $order = $this->order($master);
        $order->snapshot()->create(['client' => ['name' => 'Cliente'], 'company' => ['company_name' => 'ARL'], 'equipment' => ['name' => 'Notebook'], 'term_text' => 'Termo']);
        $this->actingAs($master)->patchJson("/api/orders/{$order->id}/closing-reference", ['amount_cents' => 9000])->assertOk();

        $this->postJson("/api/orders/{$order->id}/finalize", [
            'technical_report' => 'Reparo concluído.', 'discount_cents' => 0,
            'items' => [['description' => 'Serviço', 'quantity' => 1, 'unit_price_cents' => 10000, 'warranty_enabled' => false]],
        ])->assertCreated();

        $order->refresh();
        $this->assertNull($order->closing_reference_cents);
        $this->assertNull($order->closing_marked_by);
        $this->assertNull($order->closing_marked_at);
    }

    public function test_closed_paid_and_invalid_amounts_are_rejected(): void
    {
        $master = $this->user('Master', 'closing-rejections');
        foreach ([['completed', false], ['interrupted', false], ['analysis', true]] as [$status, $archived]) {
            $order = $this->order($master, $status, $archived);
            $this->actingAs($master)->patchJson("/api/orders/{$order->id}/closing-reference", ['amount_cents' => 1000])
                ->assertStatus(409);
        }

        $open = $this->order($master);
        $this->actingAs($master)->patchJson("/api/orders/{$open->id}/closing-reference", ['amount_cents' => 0])
            ->assertUnprocessable()->assertJsonValidationErrors('amount_cents');
        $this->actingAs($master)->patchJson("/api/orders/{$open->id}/closing-reference", [])
            ->assertUnprocessable()->assertJsonValidationErrors('amount_cents');
    }

    private function user(string $role, string $login): User
    {
        return User::create([
            'role_id' => Role::where('name', $role)->value('id'), 'name' => $role,
            'login' => $login, 'password' => 'Senha#Forte123', 'active' => true,
        ]);
    }

    private function order(User $user, string $status = 'analysis', bool $archived = false): ServiceOrder
    {
        $client = Client::create([
            'name' => 'Cliente '.$user->login.random_int(1, 99999),
            'document' => str_pad((string) random_int(1, 99999999999), 11, '0', STR_PAD_LEFT), 'phone' => '35999999999',
            'street' => 'Rua A', 'number' => null, 'district' => null, 'city' => null, 'state' => null,
        ]);

        return ServiceOrder::create([
            'number' => str_pad((string) random_int(1, 999999), 7, '0', STR_PAD_LEFT), 'client_id' => $client->id,
            'equipment_type_id' => DB::table('equipment_types')->value('id'), 'attendance_type' => 'bench',
            'status' => $status, 'archived' => $archived, 'reported_problem' => 'Teste', 'received_at' => now(),
            'created_by' => $user->id,
        ]);
    }
}
