<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DashboardSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_summary_requires_authentication(): void
    {
        $this->getJson('/api/orders/dashboard-summary')->assertUnauthorized();
    }

    public function test_weekly_count_matches_legacy_filter_without_loading_orders_or_payments(): void
    {
        $this->seed(DatabaseSeeder::class);
        $user = User::create(['role_id' => Role::where('name', 'Master')->value('id'), 'name' => 'Master Painel', 'login' => 'summary-test', 'password' => 'Senha#123', 'active' => true]);
        $client = Client::create(['name' => 'Cliente fictício', 'document' => '52998224725', 'phone' => '35999990000', 'postal_code' => '37160000', 'street' => 'Rua Teste', 'number' => '1', 'district' => 'Centro', 'city' => 'Cidade', 'state' => 'MG']);
        $base = ['client_id' => $client->id, 'equipment_type_id' => DB::table('equipment_types')->value('id'), 'attendance_type' => 'bench', 'reported_problem' => 'Teste', 'received_at' => now(), 'created_by' => $user->id];
        $week = now('America/Sao_Paulo')->startOfWeek();
        foreach ([
            ['completed', $week, false],
            ['completed', now(), true], // Archived still counts, independently of payment.
            ['interrupted', now(), false],
            ['completed', $week->copy()->subSecond(), false],
            ['analysis', null, false],
        ] as $index => [$status, $closedAt, $archived]) {
            $order = ServiceOrder::create([...$base, 'number' => (string) (9400000 + $index), 'status' => $status, 'completed_at' => $closedAt]);
            $order->forceFill(['archived' => $archived])->save();
            $this->assertSame($archived, $order->fresh()->archived);
        }
        $deleted = ServiceOrder::create([...$base, 'number' => '9400010', 'status' => 'completed', 'completed_at' => now()]);
        $deleted->delete();
        $this->actingAs($user);
        $legacy = $this->getJson('/api/orders?tab=closed_week&per_page=100&panel_light=1')->assertOk();
        DB::enableQueryLog();
        DB::flushQueryLog();
        try {
            $summary = $this->getJson('/api/orders/dashboard-summary')->assertOk()->assertExactJson(['completed_week' => 3]);
            $queries = collect(DB::getQueryLog())->filter(fn ($entry) => str_contains($entry['query'], 'service_orders'))->values();
        } finally {
            DB::disableQueryLog();
            DB::flushQueryLog();
        }
        $this->assertSame($legacy->json('total'), $summary->json('completed_week'));
        $this->assertCount(1, $queries);
        $this->assertStringContainsString('count(*)', strtolower($queries[0]['query']));
        $this->assertStringNotContainsString('join', strtolower($queries[0]['query']));
        $this->assertLessThan(strlen($legacy->getContent()), strlen($summary->getContent()));
    }
}
