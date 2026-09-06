<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class Brand2026SettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_operational_settings_do_not_expose_editable_opening_whatsapp_template(): void
    {
        $master = $this->user('Master', 'brand-master');

        $this->actingAs($master)
            ->getJson('/api/operational-settings')
            ->assertOk()
            ->assertJsonPath('company_name', 'ARL Informática')
            ->assertJsonMissingPath('order_opened_whatsapp');
    }

    public function test_legacy_whatsapp_message_fields_are_not_saved_by_general_settings(): void
    {
        $master = $this->user('Master', 'brand-master');
        $settings = $this->actingAs($master)->getJson('/api/settings')->assertOk()->json();
        $legacyKeys = ['order_opened_whatsapp', 'post_sale_follow_up', 'post_sale_google', 'post_sale_instagram'];
        $before = collect($legacyKeys)->mapWithKeys(fn ($key) => [$key => DB::table('settings')->where('key', $key)->value('value')])->all();

        foreach ($legacyKeys as $key) {
            $settings[$key] = "ALTERADO-$key";
        }

        $this->putJson('/api/settings', $settings)->assertOk();

        foreach ($before as $key => $value) {
            $this->assertSame($value, DB::table('settings')->where('key', $key)->value('value'));
        }
    }

    public function test_post_sale_google_and_instagram_messages_are_fixed_and_read_only(): void
    {
        $admin = $this->user('Administrador', 'brand-admin');
        $employee = $this->user('Funcionário', 'brand-employee');

        $this->actingAs($employee)->getJson('/api/post-sales/settings')->assertForbidden();

        $this->actingAs($admin)
            ->getJson('/api/post-sales/settings')
            ->assertOk()
            ->assertJsonPath('editable', false)
            ->assertJsonPath('instagram', 'https://www.instagram.com/allanluttembarck')
            ->assertJsonPath('google_review', 'https://g.page/r/CSxkz5Y88MaJEBM/review')
            ->assertJsonPath('post_sale_google', fn ($value) => is_string($value) && str_contains($value, 'Equipe Arl Informática'))
            ->assertJsonPath('post_sale_instagram', fn ($value) => is_string($value) && str_contains($value, 'Equipe Arl Informática'))
            ->assertJsonMissingPath('post_sale_follow_up');

        $this->actingAs($admin)
            ->putJson('/api/post-sales/settings', [
                'post_sale_google' => 'não pode substituir',
                'post_sale_instagram' => 'não pode substituir',
            ])
            ->assertStatus(405)
            ->assertJsonPath('message', 'As mensagens de Pós-Venda são fixas e não podem ser editadas.');
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
