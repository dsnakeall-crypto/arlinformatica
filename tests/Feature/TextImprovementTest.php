<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class TextImprovementTest extends TestCase
{
    use RefreshDatabase;

    private function enableOpenAi(): void
    {
        config()->set('openai.api_key', str_repeat('x', 32));
    }

    private function user(): User
    {
        $this->seed(DatabaseSeeder::class);
        $user = User::create(['role_id' => Role::where('name', 'Master')->value('id'), 'name' => 'Teste IA', 'login' => 'teste-ia', 'password' => bcrypt('safe-password'), 'active' => true]);
        RateLimiter::clear('text-improvement:'.$user->id);

        return $user;
    }

    private function openAiResponse(string $text): array
    {
        return ['output' => [['content' => [['type' => 'output_text', 'text' => $text]]]]];
    }

    public function test_authenticated_user_receives_suggestion_and_only_field_text_is_sent(): void
    {
        $this->enableOpenAi();
        config()->set('openai.model', 'gpt-4.1-mini');
        Http::fake(['https://api.openai.com/v1/responses' => Http::response($this->openAiResponse('Texto corrigido.'), 200)]);
        $this->actingAs($this->user())->postJson('/api/text-improvements', ['text' => 'texto corrigido'])
            ->assertOk()->assertJsonPath('suggestion', 'Texto corrigido.');
        Http::assertSent(fn ($request) => $request->url() === 'https://api.openai.com/v1/responses'
            && $request['input'] === 'texto corrigido'
            && str_contains($request['instructions'], 'assistência técnica de informática')
            && str_contains($request['instructions'], '500 caracteres')
            && str_contains($request['instructions'], 'É proibido acrescentar qualquer fato')
            && array_keys($request->data()) === ['model', 'store', 'max_output_tokens', 'instructions', 'input']);
    }

    public function test_openai_error_and_missing_key_return_safe_message(): void
    {
        $user = $this->user();
        $this->enableOpenAi();
        Http::fake(['https://api.openai.com/v1/responses' => Http::response([], 500)]);
        $this->actingAs($user)->postJson('/api/text-improvements', ['text' => 'texto'])->assertStatus(503)->assertJsonPath('message', 'Não foi possível melhorar o texto agora.');
        config()->set('openai.api_key', '');
        $this->actingAs($user)->postJson('/api/text-improvements', ['text' => 'texto'])->assertStatus(503)->assertJsonPath('message', 'Não foi possível melhorar o texto agora.');
    }

    public function test_validates_empty_and_oversized_text_and_requires_login(): void
    {
        $this->postJson('/api/text-improvements', ['text' => 'texto'])->assertUnauthorized();
        $user = $this->user();
        $this->actingAs($user)->postJson('/api/text-improvements', ['text' => ''])->assertUnprocessable()->assertJsonValidationErrors('text');
        $this->actingAs($user)->postJson('/api/text-improvements', ['text' => str_repeat('a', 3001)])->assertUnprocessable()->assertJsonValidationErrors('text');
    }

    public function test_limits_requests_per_user(): void
    {
        $this->enableOpenAi();
        Http::fake(['https://api.openai.com/v1/responses' => Http::response($this->openAiResponse('Texto.'), 200)]);
        $user = $this->user();
        RateLimiter::clear('text-improvement:'.$user->id);
        for ($i = 0; $i < 20; $i++) $this->actingAs($user)->postJson('/api/text-improvements', ['text' => 'texto'])->assertOk();
        $this->actingAs($user)->postJson('/api/text-improvements', ['text' => 'texto'])->assertStatus(429)->assertJsonPath('message', 'Não foi possível melhorar o texto agora.');
    }
}
