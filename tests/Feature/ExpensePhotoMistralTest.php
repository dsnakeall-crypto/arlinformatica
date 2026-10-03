<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ExpensePhotoMistralTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAs(User::create(['name' => 'Teste', 'login' => Str::uuid(), 'password' => 'Teste#Seguro123', 'role_id' => Role::where('name', 'Master')->value('id'), 'active' => true]));
        config(['expense_photo_ai.provider' => 'mistral', 'expense_photo_ai.mistral_enabled' => true, 'expense_photo_ai.mistral_api_key' => 'fake-mistral-key']);
        Http::preventStrayRequests();
        Storage::fake('local');
    }

    private function payload(?string $key = null): array
    {
        return ['photo' => new UploadedFile(base_path('tests/fixtures/expense-invoice.png'), 'fatura.png', 'image/png', null, true), 'rotation' => 0, 'request_key' => $key ?? (string) Str::uuid(), 'consent' => '1'];
    }

    private function provider(?string $annotation = null, int $pages = 1): void
    {
        Http::fake(['https://api.mistral.ai/v1/ocr' => Http::response(['model' => 'mistral-ocr-4-1', 'pages' => [['markdown' => 'Dados privados que não devem sair do backend']], 'usage_info' => ['pages_processed' => $pages], 'document_annotation' => $annotation ?? json_encode(['purchases' => [['name' => 'Investimento + bike 98,90 - pessoa 258,12', 'amount_cents' => 35611, 'first_number' => 4, 'installment_count' => 10, 'purchased_on' => '01 NOV', 'warnings' => []]], 'warnings' => []])])]);
    }

    public function test_structured_invoice_is_reviewable_and_only_backend_sends_secret_and_photo(): void
    {
        $this->provider();
        $this->getJson('/api/expense-control/photo-ai')->assertOk()->assertJsonPath('label', 'Mistral')->assertJsonMissing(['api_key' => 'fake-mistral-key']);
        $this->postJson('/api/expense-control/photo-ai/read', $this->payload())->assertOk()->assertJsonPath('purchases.0.amount_cents', 35611)->assertJsonPath('purchases.0.first_number', 4)->assertJsonPath('usage.used_micro_usd', 9000)->assertJsonMissing(['markdown' => 'Dados privados que não devem sair do backend']);
        Http::assertSent(fn ($r) => $r->url() === 'https://api.mistral.ai/v1/ocr' && $r->hasHeader('Authorization', 'Bearer fake-mistral-key') && $r['model'] === 'mistral-ocr-4-1' && str_starts_with($r['document']['image_url'], 'data:image/jpeg;base64,') && $r['document_annotation_format']['json_schema']['strict'] === true && $r['include_image_base64'] === false);
        Http::assertSentCount(1);
        $this->assertDatabaseCount('cg_debts', 0);
        $this->assertDatabaseCount('financial_transactions', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_cache_reuses_result_without_paid_retry(): void
    {
        $this->provider();
        $key = (string) Str::uuid();
        $this->postJson('/api/expense-control/photo-ai/read', $this->payload($key))->assertOk();
        $this->postJson('/api/expense-control/photo-ai/read', $this->payload($key))->assertOk()->assertJsonPath('replayed', true);
        $this->postJson('/api/expense-control/photo-ai/read', $this->payload())->assertOk()->assertJsonPath('replayed', true);
        Http::assertSentCount(1);
    }

    public function test_budget_and_consent_block_external_calls(): void
    {
        $this->provider();
        $this->postJson('/api/expense-control/photo-ai/read', [...$this->payload(), 'consent' => '0'])->assertUnprocessable();
        config(['expense_photo_ai.monthly_micro_usd' => 8999]);
        $this->postJson('/api/expense-control/photo-ai/read', $this->payload())->assertTooManyRequests();
        Http::assertNothingSent();
        $this->assertSame(0, DB::table('cg_photo_reads')->value('cost_micro_usd'));
    }

    public function test_timeout_preserves_estimate_and_never_retries(): void
    {
        Http::fake(['https://api.mistral.ai/v1/ocr' => Http::failedConnection()]);
        $key = (string) Str::uuid();
        $this->postJson('/api/expense-control/photo-ai/read', $this->payload($key))->assertStatus(503);
        $this->postJson('/api/expense-control/photo-ai/read', $this->payload($key))->assertConflict();
        $this->assertSame(9000, DB::table('cg_photo_reads')->value('cost_micro_usd'));
        $this->assertDatabaseCount('cg_debts', 0);
    }

    public function test_truncated_annotation_and_unexpected_page_count_do_not_create_debts(): void
    {
        $this->provider('{"purchases":[');
        $this->postJson('/api/expense-control/photo-ai/read', $this->payload())->assertStatus(503);
        Http::assertSentCount(1);
        $this->provider(pages: 2);
        $this->postJson('/api/expense-control/photo-ai/read', $this->payload())->assertStatus(503);
        Http::assertSentCount(1);
        $this->assertDatabaseCount('cg_debts', 0);
    }
}
