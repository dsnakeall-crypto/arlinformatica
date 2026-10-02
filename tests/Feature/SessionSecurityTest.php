<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class SessionSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_deactivated_account_loses_existing_session_for_reads_and_writes(): void
    {
        $user = $this->user('Funcionário');
        $this->postJson('/login', ['login' => $user->login, 'password' => 'Session-Test-2026!'])->assertOk();
        DB::table('users')->where('id', $user->id)->update(['active' => false]);
        Auth::forgetGuards();

        $this->getJson('/api/clients')->assertUnauthorized()->assertJsonPath('code', 'ACCOUNT_INACTIVE');
        $this->assertGuest();
        $this->postJson('/api/clients', [])->assertUnauthorized();
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_deactivated_user_cannot_view_the_web_shell(): void
    {
        $user = $this->user('Master');
        $this->actingAs($user);
        $user->update(['active' => false]);
        $this->get('/')->assertRedirect('/login');
        $this->assertGuest();
        $this->get('/login')->assertOk()->assertSee('Acesso restrito')->assertDontSee('id="root"', false);
    }

    public function test_inactive_valid_remember_cookie_is_rejected_and_discarded(): void
    {
        $user = $this->user('Funcionário');
        $user->forceFill(['remember_token' => Str::random(60), 'active' => false])->save();
        $name = Auth::guard('web')->getRecallerName();
        $cookie = implode('|', [$user->id, $user->remember_token, Auth::guard('web')->hashPasswordForCookie($user->password)]);
        $this->withCredentials()->withCookie($name, $cookie)->getJson('/api/clients')
            ->assertUnauthorized()->assertJsonPath('code', 'ACCOUNT_INACTIVE')->assertCookieExpired($name);
        $this->assertGuest();
    }

    public function test_admin_deactivation_clears_the_old_remember_token(): void
    {
        $master = $this->user('Master');
        $employee = $this->user('Funcionário');
        $employee->forceFill(['remember_token' => Str::random(60)])->save();
        $this->actingAs($master)->putJson('/api/users/'.$employee->id, [
            'name' => $employee->name, 'login' => $employee->login, 'role_id' => $employee->role_id, 'active' => false,
        ])->assertOk();
        $this->assertNull($employee->fresh()->remember_token);
    }

    public function test_refresh_token_is_private_and_does_not_grant_guest_authentication(): void
    {
        $response = $this->getJson('/session/csrf-token')->assertOk()->assertJsonPath('authenticated', false);
        $this->assertNotEmpty($response->json('csrf_token'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertNull($response->headers->get('Access-Control-Allow-Origin'));
        $this->getJson('/api/clients')->assertUnauthorized();
        $this->actingAs($this->user('Master'))->getJson('/session/csrf-token')->assertJsonPath('authenticated', true);
    }

    private function user(string $role): User
    {
        return User::create([
            'role_id' => Role::where('name', $role)->value('id'), 'name' => 'Sessão '.$role,
            'login' => 'session-'.Str::random(12), 'password' => 'Session-Test-2026!', 'active' => true,
        ]);
    }
}
