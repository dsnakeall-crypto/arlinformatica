<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\User;
use App\Services\OrderNumber;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DatabaseResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        Storage::fake('local');
        config(['backup.disk' => 'local']);
    }

    public function test_only_master_can_access_database_reset_endpoints(): void
    {
        $admin = $this->user('Administrador', 'admin');

        $this->actingAs($admin)->getJson('/api/database-reset/preview')->assertForbidden();
        $this->postJson('/api/database-reset/prepare')->assertForbidden();
        $this->postJson('/api/database-reset', [
            'backup_id' => 1,
            'password' => 'Senha#Forte123',
            'confirmation' => 'ZERAR BANCO',
        ])->assertForbidden();
    }

    public function test_reset_requires_fresh_backup_password_and_exact_confirmation_then_preserves_configuration(): void
    {
        $master = $this->user('Master', 'master');
        $otherUser = $this->user('Funcionário', 'employee');
        $client = Client::create([
            'name' => 'Cliente a apagar',
            'document' => '52998224725',
            'phone' => '35999999999',
            'street' => 'Rua do Teste',
        ]);
        $catalogId = DB::table('service_catalog')->insertGetId([
            'name' => 'Produto a apagar',
            'category' => 'product',
            'price_cents' => 1000,
            'warranty_enabled' => false,
            'active' => true,
            'stock_quantity' => 2,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $equipmentTypeId = DB::table('equipment_types')->value('id');
        $orderId = DB::table('service_orders')->insertGetId([
            'number' => '0000001',
            'client_id' => $client->id,
            'equipment_type_id' => $equipmentTypeId,
            'attendance_type' => 'bench',
            'status' => 'analysis',
            'reported_problem' => 'Teste',
            'received_at' => now(),
            'created_by' => $master->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('service_order_items')->insert([
            'service_order_id' => $orderId,
            'catalog_id' => $catalogId,
            'description' => 'Produto a apagar',
            'quantity' => 1,
            'stock_applied_quantity' => 1,
            'unit_price_cents' => 1000,
            'subtotal_cents' => 1000,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('service_order_photos')->insert([
            'service_order_id' => $orderId,
            'disk' => 'local',
            'path' => "orders/$orderId/photo.webp",
            'mime' => 'image/webp',
            'bytes' => 5,
            'width' => 10,
            'height' => 10,
            'uploaded_by' => $master->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('generated_documents')->insert([
            'service_order_id' => $orderId,
            'type' => 'term',
            'revision' => 1,
            'path' => "documents/orders/$orderId/term-r1.pdf",
            'sha256' => str_repeat('a', 64),
            'snapshot' => '{}',
            'issued_at' => now(),
            'issued_by' => $master->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        Storage::disk('local')->put("orders/$orderId/photo.webp", 'photo');
        Storage::disk('local')->put("documents/orders/$orderId/term-r1.pdf", 'pdf');
        DB::table('counters')->updateOrInsert(['name' => 'service_order'], ['value' => 27, 'created_at' => now(), 'updated_at' => now()]);

        $preview = $this->actingAs($master)->getJson('/api/database-reset/preview')
            ->assertOk()
            ->assertJsonPath('counts.clients', 1)
            ->assertJsonPath('counts.users', 1);
        $this->assertSame(1, $preview->json('counts.service_orders'));

        $prepared = $this->postJson('/api/database-reset/prepare')->assertCreated();
        $backupId = $prepared->json('backup_id');
        $backupPath = DB::table('backups')->where('id', $backupId)->value('path');
        Storage::disk('local')->assertExists($backupPath);

        $payload = ['backup_id' => $backupId, 'password' => 'Senha#Forte123', 'confirmation' => 'zerar banco'];
        $this->postJson('/api/database-reset', $payload)->assertUnprocessable();
        $payload['confirmation'] = 'ZERAR BANCO';
        $payload['password'] = 'senha-incorreta';
        $this->postJson('/api/database-reset', $payload)->assertUnprocessable()->assertJsonValidationErrors('password');

        $payload['password'] = 'Senha#Forte123';
        $this->postJson('/api/database-reset', $payload)->assertOk()->assertJsonPath('message', 'Banco zerado com segurança.');

        $this->assertDatabaseCount('clients', 0);
        $this->assertDatabaseCount('service_orders', 0);
        $this->assertDatabaseCount('service_catalog', 0);
        $this->assertDatabaseMissing('users', ['id' => $otherUser->id]);
        $this->assertDatabaseHas('users', ['id' => $master->id]);
        $this->assertGreaterThan(0, DB::table('settings')->count());
        $this->assertGreaterThan(0, DB::table('equipment_types')->count());
        $this->assertGreaterThan(0, DB::table('manufacturers')->count());
        $this->assertGreaterThan(0, DB::table('checklist_templates')->count());
        $this->assertGreaterThan(0, DB::table('technical_report_templates')->count());
        $this->assertGreaterThan(0, DB::table('versioned_templates')->count());
        $this->assertDatabaseHas('counters', ['name' => 'service_order', 'value' => 0]);
        $this->assertDatabaseHas('backups', ['id' => $backupId, 'kind' => 'reset_backup', 'protected' => true]);
        $this->assertDatabaseHas('audit_logs', ['user_id' => $master->id, 'action' => 'database.reset_completed']);
        $this->assertDatabaseCount('audit_logs', 1);
        Storage::disk('local')->assertExists($backupPath);
        Storage::disk('local')->assertMissing("orders/$orderId/photo.webp");
        Storage::disk('local')->assertMissing("documents/orders/$orderId/term-r1.pdf");

        $newClient = Client::create([
            'name' => 'Primeiro cliente novo',
            'document' => '11144477735',
            'phone' => '35988888888',
            'street' => 'Rua Nova',
        ]);
        $this->assertSame(1, $newClient->id);
        $this->assertSame('0000001', app(OrderNumber::class)->next());
    }

    private function user(string $role, string $login): User
    {
        return User::create([
            'role_id' => Role::where('name', $role)->value('id'),
            'name' => $role,
            'login' => $login,
            'password' => 'Senha#Forte123',
            'active' => true,
        ]);
    }
}
