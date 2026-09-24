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

    private function openAiResponse(array $suggestions): array
    {
        return ['output' => [['content' => [['type' => 'output_text', 'text' => json_encode($suggestions, JSON_THROW_ON_ERROR)]]]]];
    }

    public function test_authenticated_user_receives_suggestion_and_only_field_text_is_sent(): void
    {
        $this->enableOpenAi();
        config()->set('openai.model', 'gpt-4.1-mini');
        Http::fake(['https://api.openai.com/v1/responses' => Http::response($this->openAiResponse(['simples' => 'Texto simples.', 'tecnica' => 'Texto técnico.']), 200)]);
        $this->actingAs($this->user())->postJson('/api/text-improvements', ['text' => 'texto corrigido'])
            ->assertOk()->assertJsonPath('suggestions.simples', 'Texto simples.')->assertJsonPath('suggestions.tecnica', 'Texto técnico.');
        Http::assertSent(fn ($request) => $request->url() === 'https://api.openai.com/v1/responses'
            && $request['input'] === 'texto corrigido'
            && str_contains($request['instructions'], 'assistência técnica de informática')
            && str_contains($request['instructions'], '500 caracteres')
            && str_contains($request['instructions'], 'resultado de teste')
            && $request['text']['format']['type'] === 'json_schema'
            && array_keys($request->data()) === ['model', 'store', 'max_output_tokens', 'instructions', 'input', 'text']);
    }

    public function test_retries_once_when_the_suggestion_exceeds_five_hundred_characters(): void
    {
        $this->enableOpenAi();
        Http::fake(['https://api.openai.com/v1/responses' => Http::sequence()
            ->push($this->openAiResponse(['simples' => str_repeat('a', 501), 'tecnica' => 'Versão técnica.']), 200)
            ->push($this->openAiResponse(['simples' => 'Versão simples reduzida.', 'tecnica' => 'Versão técnica reduzida.']), 200)]);

        $this->actingAs($this->user())->postJson('/api/text-improvements', ['text' => 'texto'])
            ->assertOk()->assertJsonPath('suggestions.simples', 'Versão simples reduzida.')->assertJsonPath('suggestions.tecnica', 'Versão técnica reduzida.')->assertJsonMissingPath('warnings');

        Http::assertSentCount(2);
    }

    public function test_returns_an_uncut_long_suggestion_with_a_warning_after_one_retry(): void
    {
        $this->enableOpenAi();
        $firstSuggestions = ['simples' => str_repeat('a', 501), 'tecnica' => str_repeat('b', 501)];
        $secondSuggestions = ['simples' => str_repeat('c', 502), 'tecnica' => str_repeat('d', 503)];
        Http::fake(['https://api.openai.com/v1/responses' => Http::sequence()
            ->push($this->openAiResponse($firstSuggestions), 200)
            ->push($this->openAiResponse($secondSuggestions), 200)]);

        $this->actingAs($this->user())->postJson('/api/text-improvements', ['text' => 'texto'])
            ->assertOk()->assertJsonPath('suggestions.simples', $secondSuggestions['simples'])->assertJsonPath('suggestions.tecnica', $secondSuggestions['tecnica'])
            ->assertJsonPath('warnings.simples', 'A sugestão passou de 500 caracteres.')
            ->assertJsonPath('warnings.tecnica', 'A sugestão passou de 500 caracteres.');

        Http::assertSentCount(2);
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

    public function test_invalid_structured_response_returns_a_safe_error(): void
    {
        $this->enableOpenAi();
        Http::fake(['https://api.openai.com/v1/responses' => Http::response(['output' => [['content' => [['type' => 'output_text', 'text' => '{"simples":"Texto sem versão técnica."}']]]]], 200)]);

        $this->actingAs($this->user())->postJson('/api/text-improvements', ['text' => 'texto'])
            ->assertStatus(503)->assertJsonPath('message', 'Não foi possível melhorar o texto agora.');
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
        Http::fake(['https://api.openai.com/v1/responses' => Http::response($this->openAiResponse(['simples' => 'Texto simples.', 'tecnica' => 'Texto técnico.']), 200)]);
        $user = $this->user();
        RateLimiter::clear('text-improvement:'.$user->id);
        for ($i = 0; $i < 20; $i++) $this->actingAs($user)->postJson('/api/text-improvements', ['text' => 'texto'])->assertOk();
        $this->actingAs($user)->postJson('/api/text-improvements', ['text' => 'texto'])->assertStatus(429)->assertJsonPath('message', 'Não foi possível melhorar o texto agora.');
    }
}
