<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class RememberCookieTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_invalid_remember_cookies_show_the_login_gate_without_a_server_error(): void
    {
        foreach (['1|remember-token', '1|remember-token|', 'not-a-recaller-cookie'] as $value) {
            $response = $this->withCookie($this->recallerName(), $value)->get('/');

            $response->assertOk()
                ->assertSee('Acesso restrito')
                ->assertCookieExpired($this->recallerName());
        }
    }

    public function test_an_illegible_remember_cookie_is_discarded_without_a_server_error(): void
    {
        $this->withUnencryptedCookie($this->recallerName(), 'ilegível')
            ->get('/')
            ->assertOk()
            ->assertSee('Acesso restrito')
            ->assertCookieExpired($this->recallerName());
    }

    public function test_a_valid_remember_cookie_keeps_the_user_authenticated(): void
    {
        $user = $this->user();
        $value = implode('|', [
            $user->getAuthIdentifier(),
            $user->getRememberToken(),
            auth()->guard('web')->hashPasswordForCookie($user->getAuthPassword()),
        ]);

        $this->withCredentials()
            ->withCookie($this->recallerName(), $value)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('id', $user->id);
    }

    public function test_api_request_with_an_invalid_remember_cookie_returns_unauthorized(): void
    {
        $this->withCredentials()
            ->withCookie($this->recallerName(), '1|remember-token')
            ->getJson('/api/me')
            ->assertUnauthorized();
    }

    private function recallerName(): string
    {
        return auth()->guard('web')->getRecallerName();
    }

    private function user(): User
    {
        $user = User::create([
            'role_id' => Role::where('name', 'Master')->value('id'),
            'name' => 'Usuário com lembrar login',
            'login' => 'remember-user',
            'password' => Hash::make('Senha#Forte123'),
            'active' => true,
        ]);
        $user->forceFill(['remember_token' => Str::random(60)])->save();

        return $user->fresh();
    }
}
