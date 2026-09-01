<?php

namespace Tests\Feature;

use App\Models\ServiceOrder;
use App\Models\User;
use App\Services\ContactLinks;
use App\Services\PostSaleService;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StageSixTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private int $client;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->user = User::create(['role_id' => DB::table('roles')->where('name', 'Master')->value('id'), 'name' => 'Operador', 'login' => 'operador', 'password' => Hash::make('password-password'), 'active' => true]);
        $this->client = DB::table('clients')->insertGetId(['name' => 'João da Silva', 'document' => '52998224725', 'phone' => '(35) 99999-9999', 'postal_code' => '37160000', 'street' => 'Rua A', 'number' => '10', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG', 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_only_completed_repair_becomes_due_on_fifth_day_without_duplicates(): void
    {
        Carbon::setTestNow('2026-09-10 12:00:00');
        $repair = $this->order('0000300', now()->subDays(4), 'repair_completed');
        $this->order('0000301', now()->subDays(10), 'no_fault');
        app(PostSaleService::class)->catchUp();
        $this->assertDatabaseCount('post_sale_cycles', 1);
        $this->assertDatabaseCount('notifications', 0);
        Carbon::setTestNow('2026-09-11 12:00:00');
        app(PostSaleService::class)->catchUp();
        app(PostSaleService::class)->catchUp();
        $this->assertDatabaseCount('post_sale_actions', 3);
        $this->assertDatabaseCount('notifications', 1);
        $this->assertDatabaseHas('post_sale_cycles', ['service_order_id' => $repair->id, 'active' => true]);
    }

    public function test_catch_up_endpoint_creates_due_pending_cycle(): void
    {
        $order = $this->order('0000302', now()->subDays(6), 'repair_completed');
        $this->actingAs($this->user)->getJson('/api/post-sales')->assertOk()->assertJsonPath('0.number', '0000302');
        $this->assertDatabaseHas('post_sale_cycles', ['service_order_id' => $order->id]);
        $this->assertDatabaseHas('notifications', ['type' => 'post_sale_due']);
    }

    public function test_actions_are_independent_snapshot_messages_and_cannot_be_reconfirmed(): void
    {
        $this->order('0000303', now()->subDays(6), 'repair_completed');
        app(PostSaleService::class)->catchUp();
        $cycle = DB::table('post_sale_cycles')->value('id');
        foreach (['follow_up', 'google', 'instagram'] as $type) {
            $this->actingAs($this->user)->postJson("/api/post-sales/$cycle/$type/confirm")->assertOk();
            $this->assertDatabaseHas('post_sale_actions', ['cycle_id' => $cycle, 'type' => $type, 'confirmed_by' => $this->user->id]);
        }
        $this->postJson("/api/post-sales/$cycle/follow_up/confirm")->assertConflict();
        $this->assertDatabaseHas('audit_logs', ['action' => 'post_sale.confirmed', 'subject_id' => $cycle]);
        $this->assertDatabaseHas('notifications', ['deduplication_key' => "post-sale:$cycle", 'active' => false]);
    }

    public function test_sixty_day_cycle_replacement_archives_only_post_sale_and_preserves_order(): void
    {
        $old = $this->order('0000304', now()->subDays(70), 'repair_completed');
        app(PostSaleService::class)->catchUp();
        $new = $this->order('0000305', now()->subDays(5), 'repair_completed');
        app(PostSaleService::class)->catchUp();
        $this->assertDatabaseHas('post_sale_cycles', ['service_order_id' => $old->id, 'active' => false]);
        $this->assertDatabaseHas('post_sale_cycles', ['service_order_id' => $new->id, 'active' => true]);
        $this->assertDatabaseHas('service_orders', ['id' => $old->id, 'number' => '0000304']);
        $this->actingAs($this->user)->getJson('/api/post-sales')->assertJsonCount(1)->assertJsonPath('0.number', '0000305');
    }

    public function test_new_client_and_order_notifications_are_idempotent_and_authorized(): void
    {
        $payload = ['name' => 'Maria', 'document' => '11144477735', 'phone' => '35999990000', 'postal_code' => '37160000', 'street' => 'Rua B', 'number' => '1', 'district' => 'Centro', 'city' => 'Cidade', 'state' => 'MG'];
        $client = $this->actingAs($this->user)->postJson('/api/clients', $payload)->assertCreated()->json();
        $orderPayload = ['client_id' => $client['id'], 'equipment_type_id' => DB::table('equipment_types')->value('id'), 'attendance_type' => 'bench', 'reported_problem' => 'Teste', 'checklist' => []];
        $this->postJson('/api/orders', $orderPayload)->assertCreated();
        $this->assertDatabaseHas('notifications', ['type' => 'client_created', 'user_id' => $this->user->id]);
        $this->assertDatabaseHas('notifications', ['type' => 'order_created', 'user_id' => $this->user->id]);
        $id = DB::table('notifications')->where('type', 'client_created')->value('id');
        $this->actingAs($this->user)->patchJson("/api/notifications/$id/read")->assertOk();
        $other = User::create(['role_id' => $this->user->role_id, 'name' => 'Outro', 'login' => 'outro', 'password' => 'password-password', 'active' => true]);
        $this->actingAs($other)->patchJson("/api/notifications/$id/read")->assertNotFound();
        $this->actingAs($this->user)->patchJson('/api/notifications/read-all')->assertOk();
    }

    public function test_push_subscription_belongs_to_authenticated_user_and_can_be_removed(): void
    {
        $payload = ['endpoint' => 'https://push.example/subscription/1', 'keys' => ['p256dh' => 'public-key', 'auth' => 'auth-token']];
        $this->actingAs($this->user)->postJson('/api/push/subscriptions', $payload)->assertCreated();
        $this->assertDatabaseHas('push_subscriptions', ['user_id' => $this->user->id, 'endpoint_hash' => hash('sha256', $payload['endpoint'])]);
        $this->deleteJson('/api/push/subscriptions', ['endpoint' => $payload['endpoint']])->assertOk();
        $this->assertDatabaseCount('push_subscriptions', 0);
    }

    public function test_whatsapp_and_maps_links_are_normalized_and_encoded(): void
    {
        $this->assertSame('https://wa.me/5535999999999?text=Ol%C3%A1%20Jo%C3%A3o', ContactLinks::whatsapp('(35) 99999-9999', 'Olá João'));
        $this->assertStringContainsString('query=Rua%20A%2C%2010%2C%20Centro%2C%20Campos%20Gerais%2C%20MG%2C%2037160000', ContactLinks::maps(['street' => 'Rua A', 'number' => '10', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG', 'postal_code' => '37160000']));
    }

    private function order(string $number, Carbon $completed, string $result): ServiceOrder
    {
        return ServiceOrder::create(['number' => $number, 'client_id' => $this->client, 'equipment_type_id' => DB::table('equipment_types')->value('id'), 'attendance_type' => 'bench', 'status' => 'completed', 'result' => $result, 'reported_problem' => 'Teste', 'received_at' => $completed->copy()->subDay(), 'completed_at' => $completed, 'created_by' => $this->user->id]);
    }
}
