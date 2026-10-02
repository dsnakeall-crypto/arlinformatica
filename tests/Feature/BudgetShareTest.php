<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BudgetShareTest extends TestCase
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
        $created = $this->postJson('/api/orders', ['client_id' => $client['id'], 'equipment_type_id' => DB::table('equipment_types')->where('name', 'Notebook')->value('id'), 'attendance_type' => 'bench', 'reported_problem' => 'Teste de link temporário.', 'system_password_absent' => true, 'checklist' => []])->assertCreated()->json();
        $this->order = ServiceOrder::findOrFail($created['id']);
        $this->budgetId = DB::table('budgets')->insertGetId(['service_order_id' => $this->order->id, 'revision' => 1, 'status' => 'draft', 'diagnosis' => 'Falha', 'proposal' => 'Reparo', 'validity_days' => 7, 'total_cents' => 10000, 'created_by' => $this->user->id, 'created_at' => now(), 'updated_at' => now()]);

        $bytes = '%PDF-1.4 final-share-test';
        $path = "documents/orders/{$this->order->id}/budget-r1.pdf";
        Storage::disk('local')->put($path, $bytes);
        DB::table('generated_documents')->insert(['service_order_id' => $this->order->id, 'type' => 'budget', 'revision' => 1, 'path' => $path, 'sha256' => hash('sha256', $bytes), 'snapshot' => json_encode(['test' => true]), 'issued_at' => now(), 'issued_by' => $this->user->id, 'created_at' => now(), 'updated_at' => now()]);
    }

    private int $budgetId;

    private function share(): array
    {
        return $this->actingAs($this->user)->postJson("/api/orders/{$this->order->id}/budgets/1/share")->assertOk()->assertHeader('Cache-Control', 'no-store, private')->json();
    }

    public function test_share_contains_requested_whatsapp_message_and_does_not_mark_as_sent(): void
    {
        $share = $this->share();
        $token = basename(parse_url($share['url'], PHP_URL_PATH));
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $token);
        $this->assertSame('/share/budget/'.$token, parse_url($share['url'], PHP_URL_PATH));
        $stored = DB::table('budget_share_tokens')->first();
        $this->assertSame(hash('sha256', $token), $stored->token_hash);
        $this->assertNotSame($token, $stored->token_hash);
        $this->assertTrue(Carbon::parse($share['expires_at'])->between(now()->addDays(29)->addHours(23), now()->addDays(30)->addMinute()));
        $message = "Olá, Cliente Link Final. Tudo bem?\n\nGostariamos de informar que o seu orçamento já está disponível. Você pode visualizá-lo através do seguinte link:\n\n{$share['url']}\n\nAssim que analisar as condições, por favor, entre em contato conosco por este WhatsApp para confirmar o agendamento/execução do serviço ou esclarecer qualquer dúvida.\n\nAgradecemos a preferência e aguardamos o seu retorno.\n\nAtenciosamente\n*Arl Informática*";
        $this->assertSame('https://wa.me/5535999999999?text='.rawurlencode($message), $share['whatsapp_url']);
        $this->assertDatabaseHas('budgets', ['id' => $this->budgetId, 'status' => 'draft']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'budget.link_created', 'subject_id' => $this->budgetId]);
        $this->assertDatabaseCount('final_share_tokens', 0);
    }

    public function test_guest_can_access_only_shared_revision_with_private_headers(): void
    {
        $share = $this->share();
        auth()->logout();
        $this->get($share['url'])->assertOk()->assertHeader('Content-Type', 'application/pdf')->assertHeader('Cache-Control', 'no-store, private')->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')->assertHeader('Referrer-Policy', 'no-referrer');
        $this->assertDatabaseHas('budget_share_tokens', ['access_count' => 1]);
        $this->getJson("/api/orders/{$this->order->id}/budgets/1/pdf")->assertUnauthorized();
        $this->postJson("/api/orders/{$this->order->id}/budgets/1/share")->assertUnauthorized();
        $this->get('/share/budget/'.str_repeat('0', 64))->assertNotFound();
        $this->get('/share/budget/'.$this->order->id)->assertNotFound();
    }

    public function test_expiry_and_deletion_invalidate_public_access_without_deleting_pdf(): void
    {
        $share = $this->share();
        DB::table('budget_share_tokens')->update(['expires_at' => now()->subSecond()]);
        $this->get($share['url'])->assertGone()->assertSeeText('Este link de acesso expirou.');
        $newShare = $this->share();
        $path = DB::table('generated_documents')->where('type', 'budget')->value('path');
        $bytes = Storage::disk('local')->get($path);
        $this->deleteJson("/api/orders/{$this->order->id}/budgets/1")->assertOk();
        $this->get($newShare['url'])->assertGone();
        $this->assertSame($bytes, Storage::disk('local')->get($path));
        $this->postJson("/api/orders/{$this->order->id}/budgets/1/share")->assertNotFound();
        $this->get("/api/orders/{$this->order->id}/budgets/1/pdf")->assertOk();
    }

    public function test_mismatched_document_and_missing_file_cannot_be_shared(): void
    {
        $share = $this->share();
        DB::table('generated_documents')->where('type', 'budget')->update(['revision' => 2]);
        $this->get($share['url'])->assertGone();
        DB::table('generated_documents')->where('type', 'budget')->update(['revision' => 1]);
        $otherOrder = $this->order->replicate();
        $otherOrder->number = '0000901';
        $otherOrder->save();
        DB::table('generated_documents')->where('type', 'budget')->update(['service_order_id' => $otherOrder->id]);
        $this->get($share['url'])->assertGone();
        DB::table('generated_documents')->where('type', 'budget')->update(['service_order_id' => $this->order->id, 'type' => 'final']);
        $this->get($share['url'])->assertGone();
        DB::table('generated_documents')->where('type', 'final')->update(['type' => 'budget']);
        $path = DB::table('generated_documents')->where('type', 'budget')->value('path');
        Storage::disk('local')->delete($path);
        $this->get($share['url'])->assertGone();
        $this->postJson("/api/orders/{$this->order->id}/budgets/1/share")->assertNotFound();
    }

    public function test_download_is_attachment_and_default_remains_inline(): void
    {
        $this->actingAs($this->user);
        $inline = $this->get("/api/orders/{$this->order->id}/budgets/1/pdf")->assertOk();
        $this->assertStringStartsWith('inline;', $inline->headers->get('Content-Disposition'));
        $download = $this->get("/api/orders/{$this->order->id}/budgets/1/pdf?download=1")->assertOk();
        $this->assertStringStartsWith('attachment;', $download->headers->get('Content-Disposition'));
        $this->assertStringContainsString('Orcamento-OS-', $download->headers->get('Content-Disposition'));
    }

    public function test_invalid_phone_does_not_create_an_unusable_share(): void
    {
        DB::table('clients')->where('id', $this->order->client_id)->update(['phone' => '123']);
        $this->actingAs($this->user)->postJson("/api/orders/{$this->order->id}/budgets/1/share")->assertUnprocessable();
        $this->assertDatabaseCount('budget_share_tokens', 0);
        $this->postJson("/api/orders/{$this->order->id}/budgets/99/share")->assertNotFound();
        $this->postJson("/api/orders/{$this->order->id}/budgets/invalido/share")->assertNotFound();
    }
}
