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

    public function test_only_completed_repair_is_visible_immediately_and_becomes_due_after_seven_days_without_duplicates(): void
    {
        Carbon::setTestNow('2026-09-10 12:00:00');
        $completedAt = now()->subMinute();
        $repair = $this->order('0000300', $completedAt, 'repair_completed');
        $this->order('0000301', now()->subDays(10), 'no_fault');

        app(PostSaleService::class)->catchUp();

        $this->assertDatabaseCount('post_sale_cycles', 1);
        $this->assertDatabaseCount('post_sale_actions', 2);
        $this->assertDatabaseCount('notifications', 0);
        $cycle = DB::table('post_sale_cycles')->where('service_order_id', $repair->id)->first();
        $this->assertSame($completedAt->copy()->addDays(7)->format('Y-m-d H:i:s'), Carbon::parse($cycle->eligible_at)->format('Y-m-d H:i:s'));

        $this->actingAs($this->user)->getJson('/api/post-sales')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.number', '0000300')
            ->assertJsonPath('0.available', false)
            ->assertJsonPath('0.eligible_at', $completedAt->copy()->addDays(7)->toIso8601String());

        $this->postJson("/api/post-sales/{$cycle->id}/google/confirm")
            ->assertConflict()
            ->assertJsonPath('message', 'O Pós-Venda desta OS será liberado 7 dias após a conclusão.');

        Carbon::setTestNow($completedAt->copy()->addDays(7)->addSecond());
        app(PostSaleService::class)->catchUp();
        app(PostSaleService::class)->catchUp();

        $this->assertDatabaseCount('notifications', 1);
        $this->actingAs($this->user)->getJson('/api/post-sales')->assertOk()->assertJsonPath('0.available', true);
        $this->assertDatabaseHas('post_sale_cycles', ['service_order_id' => $repair->id, 'active' => true]);
    }

    public function test_catch_up_endpoint_creates_due_pending_cycle(): void
    {
        $order = $this->order('0000302', now()->subDays(8), 'repair_completed');
        $this->actingAs($this->user)->getJson('/api/post-sales')->assertOk()->assertJsonPath('0.number', '0000302')->assertJsonPath('0.available', true);
        $this->assertDatabaseHas('post_sale_cycles', ['service_order_id' => $order->id]);
        $this->assertDatabaseHas('notifications', ['type' => 'post_sale_due']);
    }

    public function test_actions_are_independent_snapshot_messages_and_cannot_be_reconfirmed(): void
    {
        $this->order('0000303', now()->subDays(8), 'repair_completed');
        app(PostSaleService::class)->catchUp();
        $cycle = DB::table('post_sale_cycles')->value('id');
        foreach (['google', 'instagram'] as $type) {
            $this->actingAs($this->user)->postJson("/api/post-sales/$cycle/$type/confirm")->assertOk();
            $this->assertDatabaseHas('post_sale_actions', ['cycle_id' => $cycle, 'type' => $type, 'confirmed_by' => $this->user->id]);
        }
        $this->postJson("/api/post-sales/$cycle/google/confirm")->assertConflict();
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

    public function test_manual_post_sale_card_deletion_preserves_the_order_actions_and_blocks_the_same_order_and_client_for_thirty_five_days(): void
    {
        Carbon::setTestNow('2026-09-10 12:00:00');
        $original = $this->order('0000306', now()->subDays(2), 'repair_completed');
        app(PostSaleService::class)->catchUp();
        $cycle = DB::table('post_sale_cycles')->where('service_order_id', $original->id)->first();
        DB::table('post_sale_actions')->where('cycle_id', $cycle->id)->where('type', 'google')->update([
            'confirmed_at' => now(),
            'confirmed_by' => $this->user->id,
        ]);

        $this->actingAs($this->user)->deleteJson("/api/post-sales/{$cycle->id}")
            ->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertDatabaseHas('service_orders', ['id' => $original->id, 'number' => '0000306']);
        $this->assertDatabaseHas('post_sale_cycles', [
            'id' => $cycle->id,
            'active' => false,
            'archive_reason' => PostSaleService::MANUAL_EXCLUSION_REASON,
        ]);
        $this->assertDatabaseHas('post_sale_actions', [
            'cycle_id' => $cycle->id,
            'type' => 'google',
            'confirmed_by' => $this->user->id,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'post_sale.card_deleted',
            'subject_id' => $cycle->id,
            'user_id' => $this->user->id,
        ]);

        $original->update(['status' => 'analysis', 'completed_at' => null]);
        $original->update(['status' => 'completed', 'completed_at' => now()]);
        app(PostSaleService::class)->catchUp();
        $this->assertDatabaseCount('post_sale_cycles', 1);

        $blockedNewOrder = $this->order('0000307', now(), 'repair_completed');
        app(PostSaleService::class)->catchUp();
        $this->assertDatabaseMissing('post_sale_cycles', ['service_order_id' => $blockedNewOrder->id]);

        Carbon::setTestNow(now()->addDays(35)->addSecond());
        $allowedNewOrder = $this->order('0000308', now(), 'repair_completed');
        app(PostSaleService::class)->catchUp();
        $this->assertDatabaseHas('post_sale_cycles', ['service_order_id' => $allowedNewOrder->id, 'active' => true]);
    }

    public function test_inconsistent_reopened_cycle_is_skipped_without_breaking_the_list(): void
    {
        $valid = $this->order('0000309', now()->subDays(8), 'repair_completed');
        $broken = $this->order('0000310', now()->subDays(8), 'repair_completed');
        app(PostSaleService::class)->catchUp();
        $broken->update(['status' => 'analysis', 'completed_at' => null]);

        $this->actingAs($this->user)->getJson('/api/post-sales')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.number', $valid->number);
    }

    public function test_new_client_and_order_notifications_are_idempotent_and_authorized(): void
    {
        $payload = ['name' => 'Maria', 'document' => '11144477735', 'phone' => '35999990000', 'postal_code' => '37160000', 'street' => 'Rua B', 'number' => '1', 'district' => 'Centro', 'city' => 'Cidade', 'state' => 'MG'];
        $client = $this->actingAs($this->user)->postJson('/api/clients', $payload)->assertCreated()->json();
        $orderPayload = ['client_id' => $client['id'], 'equipment_type_id' => DB::table('equipment_types')->value('id'), 'attendance_type' => 'bench', 'reported_problem' => 'Teste', 'system_password_absent' => true, 'checklist' => []];
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
        $messages = $this->actingAs($this->user)->getJson('/api/post-sales/settings')->assertOk()->json();
        foreach ([$messages['post_sale_google'], $messages['post_sale_instagram']] as $message) {
            $this->assertStringNotContainsString("\u{FFFD}", $message);
            $this->assertStringNotContainsString("\u{00EF}\u{00BF}\u{00BD}", $message);
            $this->assertDoesNotMatchRegularExpression('/[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}]/u', $message);
        }
        $this->assertStringContainsString('query=Rua%20A%2C%2010%2C%20Centro%2C%20Campos%20Gerais%2C%20MG%2C%2037160000', ContactLinks::maps(['street' => 'Rua A', 'number' => '10', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG', 'postal_code' => '37160000']));
    }

    public function test_bulk_removal_archives_ten_selected_cards_atomically_and_preserves_their_history(): void
    {
        $ids = $this->bulkCycles(11);
        $selected = array_slice($ids, 0, 10);
        $actions = DB::table('post_sale_actions')->orderBy('id')->get()->toJson();
        $orders = DB::table('service_orders')->orderBy('id')->get()->toJson();

        $this->actingAs($this->user)->postJson('/api/post-sales/bulk-delete', ['ids' => $selected])
            ->assertOk()->assertJsonPath('count', 10)->assertJsonPath('ids', $selected);

        $this->assertSame($actions, DB::table('post_sale_actions')->orderBy('id')->get()->toJson());
        $this->assertSame($orders, DB::table('service_orders')->orderBy('id')->get()->toJson());
        foreach ($selected as $id) {
            $this->assertDatabaseHas('post_sale_cycles', ['id' => $id, 'active' => false, 'archive_reason' => PostSaleService::MANUAL_EXCLUSION_REASON]);
            $this->assertDatabaseHas('audit_logs', ['subject_id' => $id, 'action' => 'post_sale.card_deleted', 'user_id' => $this->user->id]);
            $this->assertDatabaseHas('notifications', ['deduplication_key' => "post-sale:$id", 'active' => false]);
        }
        $this->assertDatabaseHas('post_sale_cycles', ['id' => $ids[10], 'active' => true]);
        $this->getJson('/api/post-sales')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $ids[10]);
    }

    public function test_bulk_removal_with_an_unavailable_card_does_not_remove_any_other_card(): void
    {
        $ids = $this->bulkCycles(3);
        $this->actingAs($this->user)->deleteJson("/api/post-sales/{$ids[1]}")->assertOk();
        $before = DB::table('notifications')->orderBy('id')->get()->toJson();
        $auditCount = DB::table('audit_logs')->count();
        $this->postJson('/api/post-sales/bulk-delete', ['ids' => $ids])->assertConflict();
        $this->postJson('/api/post-sales/bulk-delete', ['ids' => [$ids[0], 999999]])->assertConflict();
        foreach ([$ids[0], $ids[2]] as $id) {
            $this->assertDatabaseHas('post_sale_cycles', ['id' => $id, 'active' => true]);
        }
        $this->assertSame($before, DB::table('notifications')->orderBy('id')->get()->toJson());
        $this->assertSame($auditCount, DB::table('audit_logs')->count());
    }

    public function test_bulk_removal_validates_selection_and_requires_authentication(): void
    {
        $ids = $this->bulkCycles(1);
        $this->postJson('/api/post-sales/bulk-delete', ['ids' => $ids])->assertUnauthorized();
        $this->actingAs($this->user);
        foreach ([[], ['ids' => []], ['ids' => [$ids[0], $ids[0]]], ['ids' => ['invalid']], ['ids' => [-1]], ['ids' => range(1, 501)]] as $payload) {
            $this->postJson('/api/post-sales/bulk-delete', $payload)->assertUnprocessable();
        }
        $this->assertDatabaseHas('post_sale_cycles', ['id' => $ids[0], 'active' => true]);
        $this->assertDatabaseMissing('audit_logs', ['action' => 'post_sale.card_deleted']);
    }

    public function test_navigation_does_not_scan_history_recent_recovery_and_scheduled_full_scan_remain_idempotent(): void
    {
        Carbon::setTestNow('2026-10-04 12:00:00');
        $old = $this->order('9100001', now()->subDays(90), 'repair_completed');
        $template = (array) DB::table('clients')->where('id', $this->client)->first();
        unset($template['id']);
        $this->client = DB::table('clients')->insertGetId([...$template, 'document' => '11144477735']);
        $recent = $this->order('9100002', now()->subDays(8), 'repair_completed');

        foreach (['/api/orders', '/api/orders/desk', '/api/navigation-summary'] as $endpoint) {
            $this->actingAs($this->user)->getJson($endpoint)->assertOk();
            $this->assertDatabaseCount('post_sale_cycles', 0);
            $this->assertDatabaseCount('notifications', 0);
        }
        $this->getJson('/api/post-sales')->assertOk()->assertJsonCount(1)->assertJsonPath('0.number', $recent->number);
        $this->assertDatabaseMissing('post_sale_cycles', ['service_order_id' => $old->id]);
        $this->assertDatabaseHas('post_sale_cycles', ['service_order_id' => $recent->id, 'active' => true]);
        $this->artisan('post-sale:check')->assertExitCode(0);
        $this->assertDatabaseHas('post_sale_cycles', ['service_order_id' => $old->id, 'active' => true]);
        $this->assertDatabaseCount('post_sale_cycles', 2);
        $this->assertDatabaseCount('post_sale_actions', 4);
        $this->artisan('post-sale:check')->assertExitCode(0);
        $this->assertDatabaseCount('post_sale_cycles', 2);
        $this->assertDatabaseCount('post_sale_actions', 4);
    }

    private function bulkCycles(int $count): array
    {
        $template = (array) DB::table('clients')->where('id', $this->client)->first();
        unset($template['id']);
        for ($index = 0; $index < $count; $index++) {
            $this->client = DB::table('clients')->insertGetId([...$template, 'document' => (string) (12000000000 + $index), 'name' => "Cliente lote $index"]);
            $this->order((string) (8000000 + $index), now()->subDays(8), 'repair_completed');
        }
        app(PostSaleService::class)->catchUp();

        return DB::table('post_sale_cycles')->orderBy('id')->pluck('id')->all();
    }

    private function order(string $number, Carbon $completed, string $result): ServiceOrder
    {
        return ServiceOrder::create(['number' => $number, 'client_id' => $this->client, 'equipment_type_id' => DB::table('equipment_types')->value('id'), 'attendance_type' => 'bench', 'status' => 'completed', 'result' => $result, 'reported_problem' => 'Teste', 'received_at' => $completed->copy()->subDay(), 'completed_at' => $completed, 'created_by' => $this->user->id]);
    }
}
