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

class ServiceOrderSystemPasswordTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
    }

    public function test_password_is_required_or_explicitly_absent_and_is_encrypted_and_hidden(): void
    {
        $master = $this->user('Master', 'system-password-master');

        $this->actingAs($master)->postJson('/api/orders', [
            ...$this->orderPayload(),
            'system_password_absent' => false,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('system_password')
            ->assertJsonPath('errors.system_password.0', 'Informe a senha ou marque Sem senha');

        $secret = 'Cliente#Windows-2026';
        $created = $this->postJson('/api/orders', [
            ...$this->orderPayload(),
            'system_password' => $secret,
            'system_password_absent' => false,
        ])->assertCreated()
            ->assertJsonMissingPath('system_password')
            ->json();

        $stored = DB::table('service_orders')->where('id', $created['id'])->value('system_password');
        $this->assertIsString($stored);
        $this->assertNotSame($secret, $stored);
        $this->assertSame($secret, ServiceOrder::findOrFail($created['id'])->system_password);

        $this->getJson("/api/orders/{$created['id']}")
            ->assertOk()
            ->assertJsonPath('has_system_password', true)
            ->assertJsonMissingPath('system_password');

        $withoutPassword = $this->postJson('/api/orders', [
            ...$this->orderPayload('Sem senha cadastrada'),
            'system_password_absent' => true,
        ])->assertCreated()->json();
        $this->assertNull(DB::table('service_orders')->where('id', $withoutPassword['id'])->value('system_password'));
    }

    public function test_only_master_and_administrator_can_reveal_password_and_each_view_is_audited(): void
    {
        $master = $this->user('Master', 'password-view-master');
        $administrator = $this->user('Administrador', 'password-view-admin');
        $employee = $this->user('Funcionário', 'password-view-employee');
        $secret = 'Senha-Restrita#31';
        $order = $this->actingAs($employee)->postJson('/api/orders', [
            ...$this->orderPayload(),
            'system_password' => $secret,
            'system_password_absent' => false,
        ])->assertCreated()->json();

        $this->actingAs($master)->getJson("/api/orders/{$order['id']}/system-password")
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('password', $secret);
        $this->actingAs($administrator)->getJson("/api/orders/{$order['id']}/system-password")
            ->assertOk()
            ->assertJsonPath('password', $secret);
        $this->actingAs($employee)->getJson("/api/orders/{$order['id']}/system-password")
            ->assertForbidden();

        $this->assertSame(2, DB::table('audit_logs')
            ->where('subject_type', 'service_order')
            ->where('subject_id', $order['id'])
            ->where('action', 'service_order.system_password_viewed')
            ->count());
        $this->assertStringNotContainsString($secret, DB::table('audit_logs')->where('action', 'service_order.system_password_viewed')->pluck('after')->implode(' '));
        $history = collect($this->actingAs($master)->getJson("/api/orders/{$order['id']}/audit-history")->assertOk()->json());
        $this->assertTrue($history->contains(fn (array $entry) => $entry['action'] === 'Senha do sistema visualizada'
            && in_array('Senha visualizada por Master Senha.', $entry['changes'], true)));
    }

    public function test_password_is_cleared_when_order_is_finalized_or_interrupted_and_never_enters_documents(): void
    {
        $administrator = $this->user('Administrador', 'password-close-admin');
        $serviceId = DB::table('service_catalog')->insertGetId([
            'name' => 'Serviço para fechamento', 'category' => 'service', 'price_cents' => 10000,
            'warranty_enabled' => false, 'active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $secret = 'NaoPodeIrAoPDF#2026';
        $finalized = $this->actingAs($administrator)->postJson('/api/orders', [
            ...$this->orderPayload('Finalizar com senha'),
            'system_password' => $secret,
            'system_password_absent' => false,
        ])->assertCreated()->json();

        $this->get("/api/orders/{$finalized['id']}/term")->assertOk();
        $this->postJson("/api/orders/{$finalized['id']}/finalize", [
            'technical_report' => 'Serviço concluído.',
            'discount_cents' => 0,
            'photo_ids' => [],
            'items' => [[
                'catalog_id' => $serviceId, 'description' => 'Serviço para fechamento',
                'quantity' => 1, 'unit_price_cents' => 10000, 'warranty_enabled' => false,
            ]],
        ])->assertCreated()->assertJsonMissingPath('order.system_password');
        $this->assertNull(DB::table('service_orders')->where('id', $finalized['id'])->value('system_password'));

        $documents = DB::table('generated_documents')->where('service_order_id', $finalized['id'])->get();
        $this->assertNotEmpty($documents);
        foreach ($documents as $document) {
            $this->assertStringNotContainsString('system_password', (string) $document->snapshot);
            $this->assertStringNotContainsString($secret, (string) $document->snapshot);
            $this->assertStringNotContainsString($secret, Storage::disk('local')->get($document->path));
        }

        $interrupted = $this->postJson('/api/orders', [
            ...$this->orderPayload('Interromper com senha'),
            'system_password' => 'Senha temporária',
            'system_password_absent' => false,
        ])->assertCreated()->json();
        $this->patchJson("/api/orders/{$interrupted['id']}/status", [
            'status' => 'interrupted',
            'interruption_reason' => 'Cliente solicitou interrupção.',
            'interruption_work_done' => 'Somente avaliação inicial.',
        ])->assertOk();
        $this->assertNull(DB::table('service_orders')->where('id', $interrupted['id'])->value('system_password'));
    }

    public function test_active_order_fields_attendance_and_password_can_be_edited_but_closed_order_is_rejected(): void
    {
        $employee = $this->user('Funcionário', 'password-edit-employee');
        $order = $this->actingAs($employee)->postJson('/api/orders', [
            ...$this->orderPayload(),
            'system_password_absent' => true,
        ])->assertCreated()->json();

        $this->patchJson("/api/orders/{$order['id']}", [
            'reported_problem' => 'Sistema reinicia durante o uso.',
            'equipment_description' => 'Notebook',
            'equipment_details' => 'Dell Inspiron 15 + carregador',
            'intake_condition' => 'Tampa riscada',
            'attendance_type' => 'external',
            'system_password' => 'NovaSenha#Cliente',
            'system_password_absent' => false,
        ])->assertOk()
            ->assertJsonPath('reported_problem', 'Sistema reinicia durante o uso.')
            ->assertJsonPath('equipment_description', 'Notebook')
            ->assertJsonPath('equipment_details', 'Dell Inspiron 15 + carregador')
            ->assertJsonPath('intake_condition', 'Tampa riscada')
            ->assertJsonPath('attendance_type', 'external')
            ->assertJsonMissingPath('system_password');
        $this->assertSame('NovaSenha#Cliente', ServiceOrder::findOrFail($order['id'])->system_password);

        DB::table('service_orders')->where('id', $order['id'])->update(['status' => 'completed', 'completed_at' => now()]);
        $this->patchJson("/api/orders/{$order['id']}", ['reported_problem' => 'Tentativa tardia'])
            ->assertStatus(409)
            ->assertJsonPath('message', 'Somente uma OS aberta pode ser editada.');

        $interrupted = $this->postJson('/api/orders', [
            ...$this->orderPayload('OS interrompida não pode ser editada'),
            'system_password_absent' => true,
        ])->assertCreated()->json();
        DB::table('service_orders')->where('id', $interrupted['id'])->update(['status' => 'interrupted', 'completed_at' => now()]);
        $this->patchJson("/api/orders/{$interrupted['id']}", ['attendance_type' => 'external'])
            ->assertStatus(409)
            ->assertJsonPath('message', 'Somente uma OS aberta pode ser editada.');
    }

    private function orderPayload(string $problem = 'Equipamento não inicia'): array
    {
        $client = Client::firstOrCreate(['document' => '52998224725'], [
            'name' => 'Cliente Senha', 'phone' => '35999998888', 'street' => 'Rua Segura',
            'number' => null, 'district' => null, 'city' => null, 'state' => null, 'postal_code' => null,
        ]);

        return [
            'client_id' => $client->id,
            'equipment_type_id' => DB::table('equipment_types')->where('name', 'Notebook')->value('id'),
            'equipment_description' => 'Notebook',
            'attendance_type' => 'bench',
            'reported_problem' => $problem,
            'checklist' => [],
            'items' => [],
        ];
    }

    private function user(string $role, string $login): User
    {
        return User::create([
            'role_id' => Role::where('name', $role)->value('id'),
            'name' => $role.' Senha',
            'login' => $login,
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
    }
}
