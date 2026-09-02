<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\ServiceOrderPhoto;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StageSevenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_only_master_administers_users_and_password_is_never_exposed(): void
    {
        foreach (['Administrador', 'Funcionário'] as $role) {
            $this->actingAs($this->user($role, strtolower($role)))->getJson('/api/users')->assertForbidden();
        }
        $master = $this->user('Master', 'master');
        $payload = ['name' => 'Nova Pessoa', 'login' => 'nova', 'email' => 'nova@example.test', 'role_id' => Role::where('name', 'Funcionário')->value('id'), 'active' => true, 'password' => 'Senha#Forte123', 'password_confirmation' => 'Senha#Forte123'];
        $response = $this->actingAs($master)->postJson('/api/users', $payload)->assertCreated()->assertJsonMissingPath('password');
        $created = User::findOrFail($response->json('id'));
        $this->assertTrue(Hash::check('Senha#Forte123', $created->password));
        $index = $this->getJson('/api/users')->assertOk();
        $this->assertStringNotContainsString('Senha#Forte123', $index->getContent());
        $this->assertStringNotContainsString($created->password, $index->getContent());
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.created', 'subject_id' => $created->id]);
    }

    public function test_master_edits_deactivates_and_resets_user_but_cannot_remove_last_master(): void
    {
        $master = $this->user('Master', 'master');
        $employee = $this->user('Funcionário', 'employee');
        $payload = ['name' => 'Editado', 'login' => 'editado', 'email' => null, 'role_id' => Role::where('name', 'Administrador')->value('id'), 'active' => false];
        $this->actingAs($master)->putJson("/api/users/{$employee->id}", $payload)->assertOk();
        $this->putJson("/api/users/{$employee->id}/password", ['password' => 'Outra#Senha123', 'password_confirmation' => 'Outra#Senha123'])->assertOk();
        $this->assertTrue(Hash::check('Outra#Senha123', $employee->fresh()->password));
        $this->putJson("/api/users/{$master->id}", [...$payload, 'login' => 'master'])->assertUnprocessable();
    }

    public function test_admin_manages_catalogs_employee_cannot_and_historical_item_is_unchanged(): void
    {
        $admin = $this->user('Administrador', 'admin');
        $employee = $this->user('Funcionário', 'employee');
        $payload = ['name' => 'Limpeza', 'category' => 'service', 'price_cents' => 12550, 'warranty_enabled' => true, 'warranty_term' => 90, 'warranty_unit' => 'days'];
        $this->actingAs($employee)->postJson('/api/catalogs/services', $payload)->assertForbidden();
        $item = $this->actingAs($admin)->postJson('/api/catalogs/services', $payload)->assertCreated()->assertJsonPath('price_cents', 12550)->json();
        DB::table('service_order_items')->insert(['service_order_id' => $this->order($admin)->id, 'catalog_id' => $item['id'], 'description' => $item['name'], 'quantity' => 1, 'unit_price_cents' => 12550, 'subtotal_cents' => 12550, 'created_at' => now(), 'updated_at' => now()]);
        $this->patchJson("/api/catalogs/services/{$item['id']}", ['price_cents' => 20000, 'active' => false])->assertOk();
        $this->assertDatabaseHas('service_order_items', ['catalog_id' => $item['id'], 'unit_price_cents' => 12550]);
    }

    public function test_other_checklist_requires_note_and_snapshot_survives_template_change(): void
    {
        $master = $this->user('Master', 'master');
        $order = $this->orderPayload();
        $other = DB::table('checklist_templates')->where('equipment_type_id', $order['equipment_type_id'])->where('label', 'Outro')->first();
        $order['checklist'] = [['template_id' => $other->id]];
        $this->actingAs($master)->postJson('/api/orders', $order)->assertUnprocessable();
        $order['checklist'][0]['note'] = 'Tampa com marca de queimado';
        $created = $this->postJson('/api/orders', $order)->assertCreated()->json();
        $this->patchJson("/api/catalogs/checklist/options/{$other->id}", ['label' => 'Outra avaria'])->assertOk();
        $this->assertDatabaseHas('service_order_checklists', ['service_order_id' => $created['id'], 'label' => 'Outro', 'note' => 'Tampa com marca de queimado']);
    }

    public function test_client_edit_is_audited_without_changing_order_snapshot(): void
    {
        $master = $this->user('Master', 'master');
        $client = $this->client();
        $order = $this->order($master, $client);
        DB::table('service_order_snapshots')->insert(['service_order_id' => $order->id, 'client' => json_encode($client->toArray()), 'company' => '{}', 'equipment' => '{}', 'term_text' => 'Termo', 'created_at' => now(), 'updated_at' => now()]);
        $payload = $client->only(['name', 'document', 'phone', 'postal_code', 'street', 'number', 'district', 'city', 'state', 'complement']);
        $this->actingAs($master)->putJson("/api/clients/{$client->id}", [...$payload, 'name' => 'Nome Atual'])->assertOk();
        $snapshot = json_decode(DB::table('service_order_snapshots')->where('service_order_id', $order->id)->value('client'), true);
        $this->assertSame('Cliente Histórico', $snapshot['name']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'client.updated', 'subject_id' => $client->id]);
    }

    public function test_photo_statistics_preview_and_master_cleanup_preserve_order(): void
    {
        Storage::fake('local');
        $master = $this->user('Master', 'master');
        $order = $this->order($master);
        Storage::disk('local')->put('orders/test.webp', str_repeat('x', 120));
        ServiceOrderPhoto::create(['service_order_id' => $order->id, 'disk' => 'local', 'path' => 'orders/test.webp', 'mime' => 'image/webp', 'bytes' => 120, 'width' => 10, 'height' => 10, 'uploaded_by' => $master->id]);
        $this->actingAs($master)->getJson('/api/storage/statistics')->assertOk()->assertJsonPath('photo_count', 1);
        $this->postJson('/api/storage/photos/preview', ['filter' => 'all'])->assertOk()->assertJson(['count' => 1, 'bytes' => 120]);
        $this->actingAs($this->user('Administrador', 'admin'))->deleteJson('/api/storage/photos', ['filter' => 'all', 'confirmation' => 'EXCLUIR TODAS AS FOTOS'])->assertForbidden();
        $this->actingAs($master)->deleteJson('/api/storage/photos', ['filter' => 'all', 'confirmation' => 'EXCLUIR TODAS AS FOTOS'])->assertOk();
        $this->assertDatabaseHas('service_orders', ['id' => $order->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'photos.purged']);
    }

    private function user(string $role, string $login): User
    {
        return User::create(['role_id' => Role::where('name', $role)->value('id'), 'name' => $role, 'login' => $login, 'password' => 'Senha#Forte123', 'active' => true]);
    }

    private function client(): Client
    {
        return Client::create(['name' => 'Cliente Histórico', 'document' => '52998224725', 'phone' => '35999999999', 'postal_code' => '37160000', 'street' => 'Rua A', 'number' => '1', 'district' => 'Centro', 'city' => 'Cidade', 'state' => 'MG']);
    }

    private function order(User $user, $client = null): ServiceOrder
    {
        $client ??= $this->client();

        return ServiceOrder::create(['number' => str_pad((string) random_int(1, 999999), 7, '0', STR_PAD_LEFT), 'client_id' => $client->id, 'equipment_type_id' => DB::table('equipment_types')->value('id'), 'attendance_type' => 'bench', 'status' => 'analysis', 'reported_problem' => 'Teste', 'received_at' => now(), 'created_by' => $user->id]);
    }

    private function orderPayload(): array
    {
        return ['client_id' => $this->client()->id, 'equipment_type_id' => DB::table('equipment_types')->where('name', 'Notebook')->value('id'), 'attendance_type' => 'bench', 'reported_problem' => 'Teste'];
    }
}
