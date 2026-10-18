<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PostSaleFastListTest extends TestCase
{
    use RefreshDatabase;

    private User $operator;

    private int $clientId;

    private int $equipmentTypeId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->operator = User::create([
            'role_id' => DB::table('roles')->where('name', 'Master')->value('id'),
            'name' => 'Operador de Testes',
            'login' => 'operador-posvenda-rapido',
            'password' => Hash::make('teste-teste-123'),
            'active' => true,
        ]);
        $this->clientId = DB::table('clients')->insertGetId([
            'name' => 'Cliente Fictício',
            'document' => '52998224725',
            'phone' => '(35) 99999-9999',
            'postal_code' => '37160000',
            'street' => 'Rua A',
            'number' => '10',
            'district' => 'Centro',
            'city' => 'Campos Gerais',
            'state' => 'MG',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->equipmentTypeId = (int) DB::table('equipment_types')->value('id');
        $this->actingAs($this->operator);
    }

    private function populate(int $count): void
    {
        $stamp = Carbon::parse('2026-10-01 14:00:00');
        foreach (array_chunk(range(1, $count), 100) as $part) {
            $orders = [];
            $cycles = [];
            $actions = [];
            foreach ($part as $n) {
                $id = 100000 + $n;
                $cycle = 200000 + $n;
                $orders[] = [
                    'id' => $id,
                    'number' => str_pad((string) $n, 7, '0', STR_PAD_LEFT),
                    'client_id' => $this->clientId,
                    'equipment_type_id' => $this->equipmentTypeId,
                    'attendance_type' => 'bench',
                    'status' => 'completed',
                    'result' => 'repair_completed',
                    'reported_problem' => 'Conserto fictício',
                    'received_at' => $stamp->copy()->subDay(),
                    'completed_at' => $stamp,
                    'created_by' => $this->operator->id,
                    'created_at' => $stamp,
                    'updated_at' => $stamp,
                ];
                $cycles[] = [
                    'id' => $cycle,
                    'service_order_id' => $id,
                    'client_id' => $this->clientId,
                    'active' => 1,
                    'eligible_at' => $stamp->copy()->addDays(7),
                    'created_at' => $stamp,
                    'updated_at' => $stamp,
                ];
                foreach (['google', 'instagram'] as $type) {
                    $actions[] = [
                        'cycle_id' => $cycle,
                        'type' => $type,
                        'created_at' => $stamp,
                        'updated_at' => $stamp,
                    ];
                }
            }
            DB::table('service_orders')->insert($orders);
            DB::table('post_sale_cycles')->insert($cycles);
            DB::table('post_sale_actions')->insert($actions);
        }
    }

    public function test_quick_page_does_not_create_records_or_notifications(): void
    {
        $this->populate(30);
        // Ordem elegível ainda sem ciclo: a LEITURA nunca a sincroniza.
        $newOrder = DB::table('service_orders')->insertGetId([
            'number' => '0099999',
            'client_id' => $this->clientId,
            'equipment_type_id' => $this->equipmentTypeId,
            'attendance_type' => 'bench',
            'status' => 'completed',
            'result' => 'repair_completed',
            'reported_problem' => 'Somente teste',
            'received_at' => now()->subDays(10),
            'completed_at' => now()->subDays(9),
            'created_by' => $this->operator->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $notificationsBefore = DB::table('notifications')->count();
        $response = $this->getJson('/api/post-sales?page=1&per_page=30');
        $response->assertOk()
            ->assertJsonPath('total', 30)
            ->assertJsonPath('per_page', 30)
            ->assertJsonCount(30, 'data')
            ->assertJsonPath('data.0.number', '0000001');
        $this->assertDatabaseMissing('post_sale_cycles', ['service_order_id' => $newOrder]);
        $this->assertSame($notificationsBefore, DB::table('notifications')->count());
        $this->assertDatabaseCount('post_sale_cycles', 30);
    }

    public function test_database_pagination_and_search_on_65_fictitious_orders(): void
    {
        $this->populate(65);
        $response = $this->getJson('/api/post-sales?page=3&per_page=30');
        $response->assertOk()
            ->assertJsonPath('current_page', 3)
            ->assertJsonPath('last_page', 3)
            ->assertJsonPath('total', 65)
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('data.0.number', '0000061')
            ->assertJsonPath('data.4.number', '0000065');
        $this->getJson('/api/post-sales?page=1&per_page=30&q=0000065')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.number', '0000065');
        $this->getJson('/api/post-sales?page=1&per_page=999')->assertUnprocessable();
    }

    public function test_300_records_are_split_into_ten_pages_without_full_transfer(): void
    {
        $this->populate(300);
        $this->getJson('/api/post-sales?page=1&per_page=30')
            ->assertOk()
            ->assertJsonPath('total', 300)
            ->assertJsonPath('last_page', 10)
            ->assertJsonCount(30, 'data')
            ->assertJsonPath('data.0.number', '0000001');
        $this->getJson('/api/post-sales?page=10&per_page=30')
            ->assertOk()
            ->assertJsonPath('current_page', 10)
            ->assertJsonPath('total', 300)
            ->assertJsonCount(30, 'data')
            ->assertJsonPath('data.29.number', '0000300');
        $this->assertDatabaseCount('post_sale_cycles', 300);
    }

    public function test_first_page_large_dataset_3000_queries_are_limited_to_current_page(): void
    {
        $this->populate(3000);
        $queries = [];
        DB::listen(static function ($query) use (&$queries) {
            $sql = strtolower(trim($query->sql));
            if (str_starts_with($sql, 'select') && str_contains($sql, 'post_sale_')) {
                $queries[] = $sql;
            }
        });
        $start = microtime(true);
        $this->getJson('/api/post-sales?page=1&per_page=30')
            ->assertOk()
            ->assertJsonPath('total', 3000)
            ->assertJsonPath('last_page', 100)
            ->assertJsonCount(30, 'data')
            ->assertJsonPath('data.29.number', '0000030');
        $elapsed = (microtime(true) - $start) * 1000;
        $this->assertLessThanOrEqual(4, count($queries), 'A listagem não deve repetir consulta por cliente/card.');
        $this->assertDatabaseCount('post_sale_cycles', 3000);
        fwrite(STDERR, sprintf("\nBENCHMARK_PÓS_VENDA_SQLITE_3000: %.2f ms, %d SELECTs relevantes\n", $elapsed, count($queries)));
    }
}
