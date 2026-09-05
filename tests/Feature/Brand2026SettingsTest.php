<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Brand2026SettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_operational_settings_expose_order_opened_whatsapp_template(): void
    {
        $master = $this->user('Master', 'brand-master');

        $this->actingAs($master)
            ->getJson('/api/operational-settings')
            ->assertOk()
            ->assertJsonPath('company_name', 'ARL Informática')
            ->assertJsonPath('order_opened_whatsapp', fn ($value) => is_string($value) && str_contains($value, '{{nome_cliente}}') && str_contains($value, '{{numero_os}}'));
    }

    public function test_order_opened_whatsapp_template_can_be_saved_in_settings(): void
    {
        $master = $this->user('Master', 'brand-master');
        $settings = $this->actingAs($master)->getJson('/api/settings')->assertOk()->json();
        $settings['order_opened_whatsapp'] = 'Olá {{nome_cliente}}, a OS {{numero_os}} foi aberta pela {{empresa}}.';

        $this->putJson('/api/settings', $settings)
            ->assertOk()
            ->assertJsonPath('order_opened_whatsapp', $settings['order_opened_whatsapp']);

        $this->assertDatabaseHas('settings', [
            'key' => 'order_opened_whatsapp',
            'value' => $settings['order_opened_whatsapp'],
        ]);
    }

    public function test_post_sale_google_and_instagram_templates_are_managed_and_audited(): void
    {
        $admin = $this->user('Administrador', 'brand-admin');
        $employee = $this->user('Funcionário', 'brand-employee');

        $this->actingAs($employee)->getJson('/api/post-sales/settings')->assertForbidden();

        $payload = [
            'post_sale_google' => 'Avaliação {{nome_cliente}} {{link_google}}',
            'post_sale_instagram' => 'Instagram {{nome_cliente}} {{instagram}}',
        ];

        $this->actingAs($admin)
            ->putJson('/api/post-sales/settings', $payload)
            ->assertOk()
            ->assertJson($payload)
            ->assertJsonMissingPath('post_sale_follow_up');

        foreach ($payload as $key => $value) {
            $this->assertDatabaseHas('settings', ['key' => $key, 'value' => $value]);
        }
        $this->assertDatabaseHas('audit_logs', ['action' => 'post_sale.settings_updated']);
    }

    public function test_corporate_theme_is_fixed_to_arl_palette(): void
    {
        $master = $this->user('Master', 'brand-master');

        $expected = [
            'theme_primary' => '#C9001C',
            'theme_sidebar' => '#09080A',
            'theme_accent' => '#FF2443',
        ];

        $this->actingAs($master)->getJson('/api/theme')->assertOk()->assertExactJson($expected);
        $this->putJson('/api/theme', [
            'theme_primary' => '#123456',
            'theme_sidebar' => '#654321',
            'theme_accent' => '#ABCDEF',
        ])->assertOk()->assertExactJson($expected);
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
