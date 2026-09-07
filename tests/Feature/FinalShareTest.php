<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FinalShareTest extends TestCase
{
    use RefreshDatabase;

    public function test_final_pdf_has_public_signed_link_valid_without_authentication(): void
    {
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
        $role = Role::where('name', 'Master')->firstOrFail();
        $user = User::create([
            'role_id' => $role->id,
            'name' => 'Master Link Final',
            'login' => 'master-final-share',
            'password' => bcrypt('safe-password'),
            'active' => true,
        ]);

        $client = $this->actingAs($user)->postJson('/api/clients', [
            'name' => 'Cliente Link Final',
            'document' => '52998224725',
            'phone' => '35999999999',
            'postal_code' => '37160000',
            'street' => 'Rua Principal',
            'number' => '10',
            'district' => 'Centro',
            'city' => 'Campos Gerais',
            'state' => 'MG',
        ])->assertCreated()->json();
        $equipment = DB::table('equipment_types')->where('name', 'Notebook')->value('id');
        $created = $this->postJson('/api/orders', [
            'client_id' => $client['id'],
            'equipment_type_id' => $equipment,
            'attendance_type' => 'bench',
            'reported_problem' => 'Teste de link temporário.',
            'checklist' => [],
        ])->assertCreated()->json();
        $order = ServiceOrder::findOrFail($created['id']);

        $bytes = '%PDF-1.4 final-share-test';
        $path = "documents/orders/{$order->id}/final-r1.pdf";
        Storage::disk('local')->put($path, $bytes);
        DB::table('generated_documents')->insert([
            'service_order_id' => $order->id,
            'type' => 'final',
            'revision' => 1,
            'path' => $path,
            'sha256' => hash('sha256', $bytes),
            'snapshot' => json_encode(['test' => true]),
            'issued_at' => now(),
            'issued_by' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $share = $this->getJson("/api/orders/{$order->id}/final-share")
            ->assertOk()
            ->assertJsonPath('revision', 1)
            ->json();

        $this->assertStringContainsString("/share/orders/{$order->id}/final/1", $share['url']);
        $pathOnly = parse_url($share['url'], PHP_URL_PATH);
        $token = basename((string) $pathOnly);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $token);
        $stored = DB::table('final_share_tokens')->where('service_order_id', $order->id)->where('revision', 1)->first();
        $this->assertNotNull($stored);
        $this->assertSame(hash('sha256', $token), $stored->token_hash);
        $this->assertNotSame($token, $stored->token_hash);
        $expires = Carbon::parse($share['expires_at']);
        $this->assertTrue($expires->between(now()->addHours(47)->addMinutes(59), now()->addHours(48)->addMinute()));

        auth()->logout();
        $this->get($share['url'])
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $tampered = str_replace('/final/1', '/final/2', $share['url']);
        $this->get($tampered)->assertForbidden();

        DB::table('final_share_tokens')->where('id', $stored->id)->update(['expires_at' => now()->subSecond()]);
        $this->get($share['url'])->assertForbidden();
    }
}
