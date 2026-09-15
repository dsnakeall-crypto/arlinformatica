<?php

namespace Tests\Feature;

use App\Models\ServiceOrder;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class NavigationSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_summary_counts_open_orders_and_available_post_sale_contacts(): void
    {
        Carbon::setTestNow('2026-09-11 12:00:00');
        $this->seed(DatabaseSeeder::class);
        $user = User::create([
            'role_id' => DB::table('roles')->where('name', 'Master')->value('id'),
            'name' => 'Master Menu',
            'login' => 'master.menu',
            'password' => Hash::make('password-password'),
            'active' => true,
        ]);
        $client = DB::table('clients')->insertGetId([
            'name' => 'Cliente Menu', 'document' => '52998224725', 'phone' => '35999999999',
            'postal_code' => '37160000', 'street' => 'Rua Menu', 'number' => '8',
            'district' => 'Centro', 'city' => 'Cidade', 'state' => 'MG',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $equipment = DB::table('equipment_types')->value('id');
        ServiceOrder::create([
            'number' => '0000801', 'client_id' => $client, 'equipment_type_id' => $equipment,
            'attendance_type' => 'bench', 'status' => 'analysis', 'reported_problem' => 'Aberta',
            'received_at' => now(), 'created_by' => $user->id,
        ]);
        ServiceOrder::create([
            'number' => '0000802', 'client_id' => $client, 'equipment_type_id' => $equipment,
            'attendance_type' => 'bench', 'status' => 'interrupted', 'reported_problem' => 'Interrompida',
            'received_at' => now(), 'created_by' => $user->id,
        ]);
        ServiceOrder::create([
            'number' => '0000803', 'client_id' => $client, 'equipment_type_id' => $equipment,
            'attendance_type' => 'bench', 'status' => 'completed', 'reported_problem' => 'Concluída',
            'received_at' => now()->subDays(3), 'completed_at' => now()->subDays(2),
            'result' => 'repair_completed', 'created_by' => $user->id,
        ]);

        $this->actingAs($user)->getJson('/api/navigation-summary')
            ->assertOk()
            ->assertExactJson(['open_orders' => 1, 'available_post_sales' => 1]);

        DB::table('post_sale_actions')->update(['confirmed_at' => now(), 'confirmed_by' => $user->id]);
        $this->getJson('/api/navigation-summary')
            ->assertOk()
            ->assertJsonPath('available_post_sales', 0);
    }
}
