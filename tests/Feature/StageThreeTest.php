<?php

namespace Tests\Feature;

use App\Models\ServiceOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StageThreeTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private ServiceOrder $order;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $role = DB::table('roles')->where('name', 'Master')->value('id');
        $this->user = User::create(['role_id' => $role, 'name' => 'Master', 'login' => 'master', 'password' => Hash::make('password-password'), 'active' => true]);
        $client = DB::table('clients')->insertGetId(['name' => 'Cliente Teste', 'document' => '52998224725', 'phone' => '35999999999', 'postal_code' => '37160000', 'street' => 'Rua A', 'number' => '1', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG', 'created_at' => now(), 'updated_at' => now()]);
        $equipment = DB::table('equipment_types')->value('id');
        $this->order = ServiceOrder::create(['number' => '0000001', 'client_id' => $client, 'equipment_type_id' => $equipment, 'attendance_type' => 'bench', 'status' => 'analysis', 'reported_problem' => 'Não liga', 'received_at' => now(), 'created_by' => $this->user->id]);
        $this->order->snapshot()->create(['client' => ['name' => 'Cliente Histórico', 'document' => '52998224725'], 'company' => ['company_name' => 'Empresa Antiga', 'instagram' => 'antigo'], 'equipment' => ['name' => 'Notebook'], 'term_text' => 'Termo histórico']);
    }

    public function test_company_settings_validate_and_save(): void
    {
        $payload = ['company_name' => 'ARL Informática', 'trade_name' => 'ARL', 'cnpj' => '18588208000139', 'phone' => '35988285777', 'email' => 'arl@example.com', 'postal_code' => '37160000', 'street' => 'Rua Nossa Senhora do Carmo', 'number' => '331', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG', 'complement' => '', 'instagram' => 'https://www.instagram.com/allanluttembarck', 'google_review' => 'https://example.com/review', 'budget_validity_days' => 7, 'budget_observation' => '', 'budget_institutional_text' => 'Texto profissional', 'term_text' => 'Termo configurável', 'layout_mode' => 'automatic', 'show_company_document' => true, 'show_company_address' => true];
        $this->actingAs($this->user)->putJson('/api/settings', $payload)->assertOk()->assertJsonPath('company_name', 'ARL Informática');
        $this->actingAs($this->user)->putJson('/api/settings', [...$payload, 'cnpj' => '123'])->assertUnprocessable()->assertJsonValidationErrors('cnpj');
    }

    public function test_company_settings_normalize_formatted_identifiers_before_persisting(): void
    {
        $payload = $this->companySettingsPayload([
            'cnpj' => '18.588.208/0001-39',
            'phone' => '(35) 98828-5777',
            'postal_code' => '37160-000',
            'state' => ' mg ',
        ]);

        $this->actingAs($this->user)->putJson('/api/settings', $payload)->assertOk()
            ->assertJsonPath('cnpj', '18588208000139')
            ->assertJsonPath('phone', '35988285777')
            ->assertJsonPath('postal_code', '37160000')
            ->assertJsonPath('state', 'MG');

        $this->assertSame('18588208000139', DB::table('settings')->where('key', 'cnpj')->value('value'));
        $this->assertSame('35988285777', DB::table('settings')->where('key', 'phone')->value('value'));
        $this->assertSame('37160000', DB::table('settings')->where('key', 'postal_code')->value('value'));
        $this->assertSame('MG', DB::table('settings')->where('key', 'state')->value('value'));
    }

    public function test_company_settings_validation_messages_are_in_portuguese(): void
    {
        $response = $this->actingAs($this->user)->putJson('/api/settings', $this->companySettingsPayload([
            'cnpj' => '123', 'phone' => '123', 'postal_code' => '123', 'state' => 'M',
        ]));

        $response->assertUnprocessable()
            ->assertJsonPath('errors.cnpj.0', 'O CNPJ deve conter 14 números.')
            ->assertJsonPath('errors.phone.0', 'O telefone deve conter 10 ou 11 números.')
            ->assertJsonPath('errors.postal_code.0', 'O CEP deve conter 8 números.')
            ->assertJsonPath('errors.state.0', 'A UF deve conter exatamente 2 letras.');
    }

    private function companySettingsPayload(array $overrides = []): array
    {
        return array_replace([
            'company_name' => 'ARL Informática', 'trade_name' => 'ARL', 'cnpj' => '18588208000139', 'phone' => '35988285777',
            'email' => 'arl@example.com', 'postal_code' => '37160000', 'street' => 'Rua Nossa Senhora do Carmo', 'number' => '331',
            'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG', 'complement' => '',
            'instagram' => 'https://www.instagram.com/allanluttembarck', 'google_review' => 'https://example.com/review',
            'budget_validity_days' => 7, 'budget_observation' => '', 'budget_institutional_text' => 'Texto profissional',
            'term_text' => 'Termo configurável', 'show_company_document' => true, 'show_company_address' => true,
        ], $overrides);
    }

    public function test_logo_variants_are_generated(): void
    {
        Storage::fake('local');
        $image = imagecreatetruecolor(2, 2);
        $white = imagecolorallocate($image, 255, 255, 255);
        imagefill($image, 0, 0, $white);
        ob_start();
        imagepng($image);
        $png = ob_get_clean();
        imagedestroy($image);
        $this->assertIsString($png);

        $response = $this->actingAs($this->user)->post('/api/settings/logo', ['logo' => UploadedFile::fake()->createWithContent('logo.png', $png)]);
        $response->assertCreated();
        foreach (['app', 'menu', 'term', 'a4', 'budget', 'report'] as $variant) {
            Storage::disk('local')->assertExists($response->json($variant));
        }
    }

    public function test_budget_total_revision_warranty_snapshot_and_historical_document(): void
    {
        Storage::fake('local');
        $payload = ['diagnosis' => 'SSD danificado', 'proposal' => 'Substituir SSD', 'validity_days' => 7, 'items' => [['description' => 'SSD Kingston', 'quantity' => 2, 'unit_price_cents' => 25000, 'warranty_enabled' => true, 'warranty_term' => 1, 'warranty_unit' => 'years'], ['description' => 'Formatação', 'quantity' => 1, 'unit_price_cents' => 10000, 'warranty_enabled' => false]]];
        $first = $this->actingAs($this->user)->postJson("/api/orders/{$this->order->id}/budgets", $payload)->assertCreated()->assertJsonPath('budget.total_cents', 60000)->assertJsonPath('budget.revision', 1);
        $this->actingAs($this->user)->patchJson("/api/orders/{$this->order->id}/budgets/1/status", ['status' => 'sent'])->assertOk();
        $this->actingAs($this->user)->postJson("/api/orders/{$this->order->id}/budgets", [...$payload, 'diagnosis' => 'Nova análise'])->assertCreated()->assertJsonPath('budget.revision', 2);
        $warranty = json_decode(DB::table('budget_items')->where('budget_id', $first->json('budget.id'))->first()->warranty_snapshot, true);
        $this->assertCount(3, $warranty);
        $this->assertTrue($warranty['enabled']);
        $this->assertSame(1, $warranty['term']);
        $this->assertSame('years', $warranty['unit']);
        DB::table('settings')->updateOrInsert(['key' => 'company_name'], ['value' => 'Empresa Nova', 'created_at' => now(), 'updated_at' => now()]);
        $snapshot = json_decode(DB::table('generated_documents')->where(['service_order_id' => $this->order->id, 'type' => 'budget', 'revision' => 1])->value('snapshot'), true);
        $this->assertSame('ARL Informática', $snapshot['company']['company_name']);
    }

    public function test_term_uses_order_snapshot_and_is_not_regenerated(): void
    {
        Storage::fake('local');
        $this->actingAs($this->user)->get("/api/orders/{$this->order->id}/term")->assertOk();
        DB::table('service_order_snapshots')->where('service_order_id', $this->order->id)->update(['term_text' => 'Texto novo']);
        $this->actingAs($this->user)->get("/api/orders/{$this->order->id}/term")->assertOk();
        $snapshot = json_decode(DB::table('generated_documents')->where(['service_order_id' => $this->order->id, 'type' => 'term'])->value('snapshot'), true);
        $this->assertSame('Termo histórico', $snapshot['snapshot']['term_text']);
    }
}
