<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\BackupService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ExpensePhotoAiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAs($this->account('Master'));
        config(['expense_photo_ai.provider' => 'gemini', 'expense_photo_ai.enabled' => true, 'expense_photo_ai.api_key' => 'test-key-never-real', 'expense_photo_ai.monthly_reads' => 20, 'expense_photo_ai.monthly_micro_usd' => 1000000]);
        Http::preventStrayRequests();
        Storage::fake('local');
    }

    private function account(string $role): User
    {
        return User::create(['name' => $role, 'login' => Str::uuid(), 'password' => 'Teste#Seguro123', 'role_id' => Role::where('name', $role)->value('id'), 'active' => true]);
    }

    private function payload(?string $key = null, array $extra = []): array
    {
        return [...['photo' => new UploadedFile(base_path('tests/fixtures/expense-invoice.png'), 'fatura.png', 'image/png', null, true), 'rotation' => 0, 'request_key' => $key ?? (string) Str::uuid(), 'consent' => '1'], ...$extra];
    }

    private function read(array $payload): TestResponse
    {
        return $this->post('/api/expense-control/photo-ai/read', $payload, ['Accept' => 'application/json']);
    }

    private function provider(array $result = [], array $overrides = []): void
    {
        $purchase = ['name' => 'Geladeira', 'amount_cents' => 12050, 'first_number' => 3, 'installment_count' => 10, 'purchased_on' => '10/08', 'warnings' => []];
        $body = ['candidates' => [['finishReason' => 'STOP', 'content' => ['parts' => [['text' => json_encode($result ?: ['purchases' => [$purchase], 'warnings' => []])]]]]], 'usageMetadata' => ['promptTokenCount' => 3000, 'candidatesTokenCount' => 1000, 'thoughtsTokenCount' => 1000]];
        Http::fake([
            '*:countTokens' => Http::response(['totalTokens' => 3000]),
            '*:generateContent' => Http::response(array_replace_recursive($body, $overrides)),
        ]);
    }

    public function test_provider_receives_image_only_after_consent_and_financial_data_is_not_saved(): void
    {
        $this->provider();
        $response = $this->read($this->payload())->assertOk()->assertJsonPath('purchases.0.amount_cents', 12050)->assertJsonPath('purchases.0.first_number', 3)->assertJsonPath('usage.used_micro_usd', 30000);
        $this->assertArrayNotHasKey('api_key', $response->json('usage'));
        Http::assertSent(fn ($request) => str_ends_with($request->url(), ':generateContent') && $request->hasHeader('x-goog-api-key', 'test-key-never-real') && $request['generationConfig']['maxOutputTokens'] === 4096 && $request['generationConfig']['thinkingConfig']['thinkingLevel'] === 'LOW' && $request['contents'][0]['parts'][1]['inlineData']['mimeType'] === 'image/jpeg');
        $this->assertDatabaseCount('cg_debts', 0);
        $this->assertDatabaseCount('financial_transactions', 0);
        $this->assertDatabaseCount('cg_photo_reads', 1);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_retry_and_recent_same_photo_reuse_result_without_another_paid_call(): void
    {
        $this->provider();
        $key = (string) Str::uuid();
        $this->read($this->payload($key))->assertOk()->assertJsonPath('replayed', false);
        $this->read($this->payload($key))->assertOk()->assertJsonPath('replayed', true);
        $this->actingAs($this->account('Controle de Gasto'));
        $this->read($this->payload())->assertOk()->assertJsonPath('replayed', true);
        Http::assertSentCount(2);
        $this->read($this->payload($key))->assertConflict();
    }

    public function test_monthly_read_limit_blocks_provider_call_even_with_new_photo(): void
    {
        $this->provider();
        config(['expense_photo_ai.monthly_reads' => 1]);
        $this->read($this->payload())->assertOk();
        $this->read($this->payload(null, ['rotation' => 90]))->assertTooManyRequests();
        Http::assertSentCount(2);
    }

    public function test_cost_reservation_blocks_generation_when_monthly_balance_is_insufficient(): void
    {
        $this->provider();
        config(['expense_photo_ai.monthly_micro_usd' => 1000]);
        $this->read($this->payload())->assertTooManyRequests();
        Http::assertSentCount(1);
        $this->assertSame(0, DB::table('cg_photo_reads')->value('cost_micro_usd'));
    }

    public function test_truncation_is_not_returned_as_a_complete_purchase_list_and_is_not_retried(): void
    {
        $this->provider(overrides: ['candidates' => [['finishReason' => 'MAX_TOKENS']]]);
        $key = (string) Str::uuid();
        $this->read($this->payload($key))->assertStatus(503)->assertJsonMissing(['api_key' => 'test-key-never-real']);
        $this->read($this->payload($key))->assertConflict();
        Http::assertSentCount(2);
        $this->assertSame('failed', DB::table('cg_photo_reads')->value('status'));
        $this->assertSame(30000, DB::table('cg_photo_reads')->value('cost_micro_usd'));
    }

    public function test_timeout_keeps_reservation_because_the_provider_may_have_charged(): void
    {
        Http::fake(['*:countTokens' => Http::response(['totalTokens' => 3000]), '*:generateContent' => Http::failedConnection()]);
        $this->read($this->payload())->assertStatus(503);
        $this->assertSame(55152, DB::table('cg_photo_reads')->value('cost_micro_usd'));
        $this->assertSame('failed', DB::table('cg_photo_reads')->value('status'));
    }

    public function test_unknown_numbers_remain_missing_for_user_review_and_duplicates_are_flagged(): void
    {
        $p = ['name' => 'Compra ilegível', 'amount_cents' => null, 'first_number' => null, 'installment_count' => null, 'purchased_on' => null, 'warnings' => ['Confira os números']];
        $this->provider(['purchases' => [$p, $p], 'warnings' => []]);
        $this->read($this->payload())->assertOk()->assertJsonPath('purchases.0.amount_cents', null)->assertJsonPath('purchases.1.duplicate', true);
        $this->assertDatabaseCount('cg_debts', 0);
    }

    public function test_disabled_key_invalid_image_missing_consent_and_unauthorized_roles_make_no_calls(): void
    {
        $this->read($this->payload(null, ['consent' => '0']))->assertUnprocessable();
        $this->read($this->payload(null, ['photo' => UploadedFile::fake()->createWithContent('fake.png', '<script>not a photo</script>')]))->assertUnprocessable();
        config(['expense_photo_ai.api_key' => '']);
        $this->read($this->payload())->assertStatus(503);
        $this->getJson('/api/expense-control/photo-ai')->assertOk()->assertJsonPath('enabled', false)->assertJsonMissing(['api_key' => '']);
        foreach (['Funcionário', 'Usuário local'] as $role) {
            $this->actingAs($this->account($role));
            $this->read($this->payload())->assertForbidden();
            $this->getJson('/api/expense-control/photo-ai')->assertForbidden();
        }
        Http::assertNothingSent();
        $this->assertDatabaseCount('cg_photo_reads', 0);
    }

    public function test_incorrect_structured_result_is_not_imported(): void
    {
        $p = ['name' => 'Compra', 'amount_cents' => -999, 'first_number' => 1, 'installment_count' => 1, 'purchased_on' => null, 'warnings' => []];
        $this->provider(['purchases' => [$p], 'warnings' => []]);
        $this->read($this->payload())->assertStatus(503);
        $this->assertDatabaseCount('cg_debts', 0);
    }

    public function test_backup_restore_preserves_usage_and_retry_protection(): void
    {
        $this->provider();
        $key = (string) Str::uuid();
        $this->read($this->payload($key))->assertOk();
        $service = app(BackupService::class);
        $backup = $service->create(auth()->user());
        $manifest = $service->validate(Storage::disk('local')->path($backup->path));
        $this->assertSame(1, $manifest['counts']['cg_photo_reads']);
        $service->restore($backup, auth()->user());
        $this->read($this->payload($key))->assertOk()->assertJsonPath('replayed', true)->assertJsonPath('usage.used_micro_usd', 30000);
        Http::assertSentCount(2);
    }

    public function test_new_month_resets_quota_without_deleting_usage_and_expired_result_is_not_replayed(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3));
        $this->provider();
        $key = (string) Str::uuid();
        $this->read($this->payload($key))->assertOk();
        $this->travelTo(now()->setDate(2026, 11, 3));
        $this->getJson('/api/expense-control/photo-ai')->assertOk()->assertJsonPath('used_reads', 0);
        $this->read($this->payload($key))->assertConflict();
        $this->assertNull(DB::table('cg_photo_reads')->value('result'));
        $this->assertDatabaseCount('cg_photo_reads', 1);
        Http::assertSentCount(2);
    }
}
