<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FinalShareTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private ServiceOrder $order;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
        $this->user = User::create(['role_id' => Role::where('name', 'Master')->value('id'), 'name' => 'Master Link Final', 'login' => 'master-final-share', 'password' => bcrypt('safe-password'), 'active' => true]);
        $client = $this->actingAs($this->user)->postJson('/api/clients', ['name' => 'Cliente Link Final', 'document' => '52998224725', 'phone' => '35999999999', 'street' => 'Rua Principal'])->assertCreated()->json();
        $created = $this->postJson('/api/orders', ['client_id' => $client['id'], 'equipment_type_id' => DB::table('equipment_types')->where('name', 'Notebook')->value('id'), 'attendance_type' => 'bench', 'reported_problem' => 'Teste de link temporário.', 'checklist' => []])->assertCreated()->json();
        $this->order = ServiceOrder::findOrFail($created['id']);
        $this->order->forceFill(['status' => 'completed', 'archived' => true, 'completed_at' => now()])->save();

        $bytes = '%PDF-1.4 final-share-test';
        $path = "documents/orders/{$this->order->id}/final-r1.pdf";
        Storage::disk('local')->put($path, $bytes);
        DB::table('generated_documents')->insert(['service_order_id' => $this->order->id, 'type' => 'final', 'revision' => 1, 'path' => $path, 'sha256' => hash('sha256', $bytes), 'snapshot' => json_encode(['test' => true]), 'issued_at' => now(), 'issued_by' => $this->user->id, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_token_is_unpredictable_stored_only_as_hash_and_valid_for_thirty_days(): void
    {
        $first = $this->getJson("/api/orders/{$this->order->id}/final-share")->assertOk()->assertJsonPath('revision', 1)->json();
        $second = $this->getJson("/api/orders/{$this->order->id}/final-share")->assertOk()->json();
        $firstToken = basename((string) parse_url($first['url'], PHP_URL_PATH));
        $secondToken = basename((string) parse_url($second['url'], PHP_URL_PATH));

        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $firstToken);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $secondToken);
        $this->assertNotSame($firstToken, $secondToken);
        $this->assertSame('/share/final/'.$firstToken, parse_url($first['url'], PHP_URL_PATH));
        $stored = DB::table('final_share_tokens')->where('token_hash', hash('sha256', $firstToken))->first();
        $this->assertNotNull($stored);
        $this->assertNotSame($firstToken, $stored->token_hash);
        $this->assertNotNull($stored->generated_document_id);
        $this->assertTrue(Carbon::parse($first['expires_at'])->between(now()->addDays(29)->addHours(23), now()->addDays(30)->addMinute()));
    }

    public function test_valid_link_has_private_headers_and_counts_each_access(): void
    {
        $url = $this->getJson("/api/orders/{$this->order->id}/final-share")->assertOk()->json('url');
        auth()->logout();
        $this->get($url)->assertOk()->assertHeader('Content-Type', 'application/pdf')->assertHeader('Cache-Control', 'no-store, private')->assertHeader('Pragma', 'no-cache')->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
        $this->get($url)->assertOk();
        $stored = DB::table('final_share_tokens')->first();
        $this->assertSame(2, $stored->access_count);
        $this->assertNotNull($stored->last_access_at);
    }

    public function test_expired_and_revoked_links_return_the_specific_privacy_messages(): void
    {
        $expiredUrl = $this->getJson("/api/orders/{$this->order->id}/final-share")->assertOk()->json('url');
        DB::table('final_share_tokens')->update(['expires_at' => now()->subSecond()]);
        auth()->logout();
        $this->get($expiredUrl)->assertGone()->assertSeeText('Este link de acesso expirou.');

        $this->actingAs($this->user);
        $revokedUrl = $this->getJson("/api/orders/{$this->order->id}/final-share")->assertOk()->json('url');
        $this->deleteJson("/api/orders/{$this->order->id}/final-share")->assertOk()->assertJsonPath('revoked', 1);
        $this->getJson("/api/orders/{$this->order->id}/final-share/status")->assertOk()->assertJsonPath('active', false);
        auth()->logout();
        $this->get($revokedUrl)->assertGone()->assertSeeText('Este link não está mais disponível.');
    }

    public function test_order_identifiers_do_not_grant_public_document_or_photo_access(): void
    {
        auth()->logout();
        $this->get("/share/final/{$this->order->id}")->assertNotFound();
        $this->get("/share/orders/{$this->order->id}/final/1")->assertNotFound();
        $this->get("/share/orders/{$this->order->number}/final/1")->assertNotFound();
        $this->get("/api/orders/{$this->order->id}/final/1/pdf")->assertUnauthorized();
        $this->get("/api/orders/{$this->order->id}/photos/1")->assertUnauthorized();
        Route::middleware('auth')->get('/final-share-web-auth-check', static fn () => response()->noContent());
        $this->get('/final-share-web-auth-check')->assertRedirect('/login');
    }

    public function test_final_pdf_contains_lgpd_processing_notice(): void
    {
        $html = view('documents.final', ['company' => [], 'order' => ['number' => '0000001', 'received_at' => now(), 'attendance_type' => 'bench', 'reported_problem' => 'Falha', 'intake_condition' => null, 'client' => ['name' => 'Cliente', 'document' => '52998224725', 'phone' => '35999999999', 'street' => 'Rua A', 'number' => '1', 'district' => '', 'city' => 'Cidade', 'state' => 'MG']], 'finalization' => ['completed_at' => now(), 'technical_report' => 'Laudo', 'subtotal_cents' => 1000, 'discount_cents' => 0, 'total_cents' => 1000], 'photos' => [], 'items' => [], 'result_label' => 'Reparo realizado', 'technical_signature' => null])->render();
        $this->assertStringContainsString('Proteção de Dados: Os dados deste documento são tratados pela ARL Informática', $html);
    }
}
