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

    public function test_theme_is_public_fixed_to_arl_identity_and_cannot_be_overridden(): void
    {
        $expected = [
            'theme_primary' => '#C9001C',
            'theme_sidebar' => '#09080A',
            'theme_accent' => '#FF2443',
        ];

        $this->getJson('/api/theme')->assertOk()->assertExactJson($expected);

        $employee = $this->user('Funcionário', 'theme-employee');
        $payload = ['theme_primary' => '#B42318', 'theme_sidebar' => '#2B1110', 'theme_accent' => '#F5B700'];
        $this->actingAs($employee)->putJson('/api/theme', $payload)->assertForbidden();

        $admin = $this->user('Administrador', 'theme-admin');
        $this->actingAs($admin)->putJson('/api/theme', $payload)->assertOk()->assertExactJson($expected);
        foreach ($payload as $key => $value) {
            $this->assertDatabaseMissing('settings', ['key' => $key, 'value' => $value]);
        }
        $this->assertDatabaseMissing('audit_logs', ['user_id' => $admin->id, 'action' => 'theme.updated', 'subject_type' => 'settings']);
        $this->assertSame('#C9001C', app(CompanySettings::class)->snapshot()['theme_primary']);

        $this->putJson('/api/theme', ['theme_primary' => 'red', 'theme_sidebar' => '#123456', 'theme_accent' => '#ABCDEF'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('theme_primary');
    }

    public function test_official_identity_defaults_keep_arl_brand_and_location(): void
    {
        $settings = app(CompanySettings::class)->all();

        $this->assertSame('ARL Informática', $settings['company_name']);
        $this->assertSame('Campos Gerais', $settings['city']);
        $this->assertSame('MG', $settings['state']);
        $this->assertSame('#C9001C', $settings['theme_primary']);
        $this->assertSame('#09080A', $settings['theme_sidebar']);
        $this->assertSame('#FF2443', $settings['theme_accent']);
        $this->assertStringContainsString('instagram.com/', $settings['instagram']);
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
                'attendance_type' => 'bench', 'reported_problem' => 'Teste de cor', 'checklists' => [],
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
            'password' => 'test-password-only',
            'active' => true,
        ]);
    }
}
