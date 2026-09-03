<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\CompanySettings;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThemeSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_theme_is_public_but_only_authorized_roles_can_change_it(): void
    {
        $this->getJson('/api/theme')->assertOk()->assertExactJson([
            'theme_primary' => '#087443',
            'theme_sidebar' => '#063B2D',
            'theme_accent' => '#28BD65',
        ]);

        $employee = $this->user('Funcionário', 'theme-employee');
        $payload = ['theme_primary' => '#B42318', 'theme_sidebar' => '#2B1110', 'theme_accent' => '#F5B700'];
        $this->actingAs($employee)->putJson('/api/theme', $payload)->assertForbidden();

        $admin = $this->user('Administrador', 'theme-admin');
        $this->actingAs($admin)->putJson('/api/theme', $payload)->assertOk()->assertExactJson($payload);
        foreach ($payload as $key => $value) {
            $this->assertDatabaseHas('settings', ['key' => $key, 'value' => $value]);
        }
        $this->assertDatabaseHas('audit_logs', ['user_id' => $admin->id, 'action' => 'theme.updated', 'subject_type' => 'settings']);
        $this->assertSame('#B42318', app(CompanySettings::class)->snapshot()['theme_primary']);

        $this->putJson('/api/theme', ['theme_primary' => 'red', 'theme_sidebar' => '#123456', 'theme_accent' => '#ABCDEF'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('theme_primary');
    }

    public function test_final_pdf_uses_colors_from_the_historical_company_snapshot(): void
    {
        $company = array_replace(app(CompanySettings::class)->snapshot(), [
            'theme_primary' => '#B42318',
            'theme_sidebar' => '#2B1110',
            'theme_accent' => '#F5B700',
            'company_name' => 'ARL Informática',
            'city' => 'Campos Gerais',
            'state' => 'MG',
        ]);
        $html = view('documents.final', [
            'company' => $company,
            'order' => [
                'number' => '9000001',
                'received_at' => now()->subHour()->toDateTimeString(),
                'client' => [
                    'name' => 'Cliente Tema', 'document' => '52998224725', 'phone' => '35999998888',
                    'street' => 'Rua Tema', 'number' => '10', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG', 'postal_code' => '37160000',
                ],
                'snapshot' => ['equipment' => ['name' => 'Notebook']],
                'attendance_type' => 'bench',
                'reported_problem' => 'Teste de cor',
                'checklists' => [],
            ],
            'finalization' => [
                'completed_at' => now()->toDateTimeString(), 'technical_report' => 'Teste concluído',
                'subtotal_cents' => 10000, 'discount_cents' => 0, 'total_cents' => 10000,
            ],
            'result_label' => 'Reparo realizado',
            'photos' => [],
            'items' => [[
                'description' => 'Serviço de teste', 'quantity' => 1, 'unit_price_cents' => 10000,
                'subtotal_cents' => 10000, 'warranty_snapshot' => null,
            ]],
        ])->render();

        $this->assertStringContainsString('#B42318', $html);
        $this->assertStringContainsString('#F5B700', $html);
        $this->assertStringContainsString('Serviço de teste', $html);
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
