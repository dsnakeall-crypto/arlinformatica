<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CsrfSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        // Exercise CSRF middleware for real instead of Laravel's test bypass.
        $this->app->bind(ValidateCsrfToken::class, fn ($app) => new class($app, $app['encrypter']) extends ValidateCsrfToken
        {
            protected function runningUnitTests()
            {
                return false;
            }
        });
        $this->actingAs(User::create([
            'role_id' => Role::where('name', 'Master')->value('id'), 'name' => 'CSRF Master',
            'login' => 'csrf-master', 'password' => 'Csrf-Test-2026!', 'active' => true,
        ]));
    }

    public function test_absent_and_invalid_tokens_block_financial_mutations_without_writes(): void
    {
        $this->withSession(['_token' => 'current-token']);
        $this->postJson('/api/finance/quick-entry', ['amount_cents' => 1234])
            ->assertStatus(419)->assertJsonPath('code', 'SESSION_EXPIRED');
        $this->postJson('/api/finance/quick-entry', ['amount_cents' => 1234], ['X-CSRF-TOKEN' => 'expired-token'])
            ->assertStatus(419);
        $this->assertDatabaseCount('financial_transactions', 0);
    }

    public function test_refreshed_token_allows_one_financial_mutation(): void
    {
        $token = $this->getJson('/session/csrf-token')->assertOk()->json('csrf_token');
        $this->postJson('/api/finance/quick-entry', ['amount_cents' => 1234], ['X-CSRF-TOKEN' => $token])->assertCreated();
        $this->assertDatabaseCount('financial_transactions', 1);
    }

    public function test_login_and_logout_are_also_csrf_protected(): void
    {
        $this->withSession(['_token' => 'current-token']);
        $this->postJson('/login', ['login' => 'csrf-master', 'password' => 'Csrf-Test-2026!'])->assertStatus(419);
        $this->postJson('/logout')->assertStatus(419);
        $this->assertAuthenticated();
    }
}
