<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use App\Services\DocumentService;
use App\Services\ReplacedFinalDocumentService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class DocumentIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private ServiceOrder $order;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
        $this->user = User::create(['role_id' => Role::where('name', 'Master')->value('id'), 'name' => 'Integridade', 'login' => 'document-integrity', 'password' => bcrypt('safe-password'), 'active' => true]);
        $client = $this->actingAs($this->user)->postJson('/api/clients', ['name' => 'Cliente Documental', 'document' => '52998224725', 'phone' => '35999999999', 'street' => 'Rua Teste'])->assertCreated()->json();
        $order = $this->postJson('/api/orders', ['client_id' => $client['id'], 'equipment_type_id' => DB::table('equipment_types')->where('name', 'Notebook')->value('id'), 'attendance_type' => 'bench', 'reported_problem' => 'Teste documental.', 'system_password_absent' => true, 'checklist' => []])->assertCreated()->json();
        $this->order = ServiceOrder::findOrFail($order['id']);
    }

    private function issue(string $type = 'budget', string $bytes = '%PDF-1.4 integrity'): void
    {
        app(DocumentService::class)->issueBytes($this->order, $type, ['fixture' => true], $bytes, $this->user->id);
    }

    private function path(string $type = 'budget'): string
    {
        return "documents/orders/{$this->order->id}/$type-r1.pdf";
    }

    public function test_emission_preserves_hash_and_repeated_emission_cannot_overwrite(): void
    {
        $this->issue();
        $original = Storage::disk('local')->get($this->path());
        try {
            $this->issue(bytes: '%PDF competing request');
            $this->fail('A revisão existente deveria bloquear a emissão.');
        } catch (HttpException $error) {
            $this->assertSame(409, $error->getStatusCode());
        }
        $this->assertDatabaseCount('generated_documents', 1);
        $this->assertSame($original, Storage::disk('local')->get($this->path()));
        $this->assertSame(hash('sha256', $original), DB::table('generated_documents')->value('sha256'));
    }

    public function test_orphan_is_preserved_and_never_registered_or_overwritten(): void
    {
        Storage::disk('local')->put($this->path(), 'historical orphan');
        try {
            $this->issue();
            $this->fail('O arquivo sem registro deveria bloquear a emissão.');
        } catch (HttpException $error) {
            $this->assertSame(409, $error->getStatusCode());
        }
        $this->assertSame('historical orphan', Storage::disk('local')->get($this->path()));
        $this->assertDatabaseCount('generated_documents', 0);
    }

    public function test_partial_write_is_compensated_without_touching_other_files(): void
    {
        Storage::disk('local')->put('documents/preserved.pdf', 'preserved');
        $service = new class extends DocumentService
        {
            protected function writeBytes($stream, string $bytes): void
            {
                fwrite($stream, substr($bytes, 0, 5));
                throw new RuntimeException('Injected partial write');
            }
        };
        try {
            $service->issueBytes($this->order, 'budget', [], '%PDF partial', $this->user->id);
            $this->fail('A gravação parcial deveria falhar.');
        } catch (RuntimeException $error) {
            $this->assertSame('Injected partial write', $error->getMessage());
        }
        Storage::disk('local')->assertMissing($this->path());
        $this->assertSame('preserved', Storage::disk('local')->get('documents/preserved.pdf'));
        $this->assertDatabaseCount('generated_documents', 0);
    }

    public function test_insert_failure_removes_only_the_exclusively_created_file(): void
    {
        try {
            app(DocumentService::class)->issueBytes($this->order, 'budget', [], '%PDF invalid issuer', 999999999);
            $this->fail('A chave estrangeira inválida deveria falhar.');
        } catch (QueryException $error) {
            $this->assertNotEmpty($error->getMessage());
        }
        Storage::disk('local')->assertMissing($this->path());
        $this->assertDatabaseCount('generated_documents', 0);
    }

    public function test_outer_rollback_compensates_a_committed_child_transaction(): void
    {
        DB::beginTransaction();
        $this->issue();
        Storage::disk('local')->assertExists($this->path());
        DB::rollBack();
        Storage::disk('local')->assertMissing($this->path());
        $this->assertDatabaseCount('generated_documents', 0);
    }

    public function test_deep_outer_rollback_compensates_two_committed_transaction_levels(): void
    {
        DB::beginTransaction();
        DB::transaction(fn () => $this->issue());
        DB::rollBack();
        Storage::disk('local')->assertMissing($this->path());
        $this->assertDatabaseCount('generated_documents', 0);
    }

    public function test_rollback_preserves_a_file_whose_hash_changed_unexpectedly(): void
    {
        DB::beginTransaction();
        $this->issue();
        Storage::disk('local')->put($this->path(), 'unexpected change');
        try {
            DB::rollBack();
            $this->fail('A alteração inesperada deveria ser informada.');
        } catch (RuntimeException $error) {
            $this->assertStringContainsString('Falha na compensação documental', $error->getMessage());
            $this->assertStringContainsString('preservado para inspeção', $error->getPrevious()->getMessage());
        }
        $this->assertSame('unexpected change', Storage::disk('local')->get($this->path()));
        $this->assertDatabaseCount('generated_documents', 0);
    }

    public function test_download_refuses_missing_and_corrupt_recorded_pdf(): void
    {
        $this->issue();
        Storage::disk('local')->put($this->path(), 'corrupt');
        $this->get("/api/orders/{$this->order->id}/budgets/1/pdf")->assertStatus(409);
        Storage::disk('local')->delete($this->path());
        $this->get("/api/orders/{$this->order->id}/budgets/1/pdf")->assertNotFound();
    }

    public function test_repeated_term_http_requests_return_the_same_pdf(): void
    {
        $this->get("/api/orders/{$this->order->id}/term")->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $hash = DB::table('generated_documents')->where('type', 'term')->value('sha256');
        $this->get("/api/orders/{$this->order->id}/term")->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertDatabaseCount('generated_documents', 1);
        $this->assertSame($hash, hash('sha256', Storage::disk('local')->get($this->path('term'))));
    }

    public function test_replaced_final_outer_rollback_restores_original_document_and_bytes(): void
    {
        $this->issue('final', '%PDF historical final');
        $original = DB::table('generated_documents')->first();
        $service = new class extends DocumentService
        {
            public function render(string $type, array $snapshot): string
            {
                return '%PDF lightweight record';
            }
        };
        DB::beginTransaction();
        (new ReplacedFinalDocumentService($service))->replacePrevious($this->order, 1, 2, $this->user->id, null);
        Storage::disk('local')->assertMissing($original->path);
        $record = DB::table('generated_documents')->where('type', 'final-record')->first();
        $this->assertNotNull($record);
        DB::rollBack();
        $this->assertSame('%PDF historical final', Storage::disk('local')->get($original->path));
        Storage::disk('local')->assertMissing($record->path);
        $this->assertDatabaseHas('generated_documents', ['id' => $original->id, 'type' => 'final', 'sha256' => $original->sha256]);
        $this->assertDatabaseMissing('generated_documents', ['type' => 'final-record']);
        $recovery = collect(Storage::disk('local')->allFiles('documents/recovery/orders'))->first(fn ($path) => str_ends_with($path, '.pdf'));
        $this->assertNotNull($recovery);
        $this->assertSame('%PDF historical final', Storage::disk('local')->get($recovery));
        $metadata = json_decode(Storage::disk('local')->get($recovery.'.json'), true);
        $this->assertSame($original->sha256, $metadata['sha256']);
        $this->assertSame($original->path, $metadata['original_path']);
    }

    public function test_failed_budget_pdf_does_not_commit_budget_or_items(): void
    {
        $this->app->instance(DocumentService::class, new class extends DocumentService
        {
            public function render(string $type, array $snapshot): string
            {
                throw new RuntimeException('Injected rendering failure');
            }
        });
        $this->postJson("/api/orders/{$this->order->id}/budgets", ['diagnosis' => 'Teste', 'proposal' => 'Teste', 'validity_days' => 7, 'items' => [['description' => 'Serviço', 'quantity' => 1, 'unit_price_cents' => 1000]]])->assertServerError();
        $this->assertDatabaseCount('budgets', 0);
        $this->assertDatabaseCount('budget_items', 0);
        $this->assertDatabaseCount('generated_documents', 0);
    }

    public function test_integrity_inventory_reports_anomalies_without_mutating_data_or_files(): void
    {
        $this->issue('term');
        $this->issue('budget');
        Storage::disk('local')->put($this->path('budget'), 'corrupt fixture');
        $this->issue('final');
        Storage::disk('local')->delete($this->path('final'));
        Storage::disk('local')->put("documents/orders/{$this->order->id}/orphan.pdf", 'preserved orphan');
        Storage::disk('local')->put("documents/orders/{$this->order->id}/.pending-fixture.pdf", 'preserved pending');
        $files = collect(Storage::disk('local')->allFiles())->mapWithKeys(fn ($path) => [$path => hash('sha256', Storage::disk('local')->get($path))])->all();
        $rows = DB::table('generated_documents')->orderBy('id')->get()->toJson();
        $this->artisan('arl:documents:integrity')->expectsOutputToContain('CONSISTENT')->expectsOutputToContain('HASH_MISMATCH')->expectsOutputToContain('DB_RECORD_FILE_MISSING')->expectsOutputToContain('ORPHAN_UNREGISTERED')->expectsOutputToContain('PENDING_STALE')->assertExitCode(1);
        $this->assertSame($rows, DB::table('generated_documents')->orderBy('id')->get()->toJson());
        $this->assertSame($files, collect(Storage::disk('local')->allFiles())->mapWithKeys(fn ($path) => [$path => hash('sha256', Storage::disk('local')->get($path))])->all());
        // Restore the deliberately corrupt fixture before the test transaction
        // rolls back; production rollback correctly refuses changed bytes.
        Storage::disk('local')->put($this->path('budget'), '%PDF-1.4 integrity');
    }

    public function test_failed_paid_finalization_does_not_change_order_finance_or_history(): void
    {
        $history = DB::table('status_history')->where('service_order_id', $this->order->id)->get()->toJson();
        $this->app->instance(DocumentService::class, new class extends DocumentService
        {
            public function render(string $type, array $snapshot): string
            {
                throw new RuntimeException('Injected final rendering failure');
            }
        });
        $this->postJson("/api/orders/{$this->order->id}/finalize", [
            'result' => 'repair_completed', 'technical_report' => 'Teste', 'discount_cents' => 0,
            'items' => [['description' => 'Serviço', 'quantity' => 1, 'unit_price_cents' => 1000, 'warranty_enabled' => false]],
            'is_paid' => true, 'payment_method' => 'pix',
        ])->assertServerError();
        $this->assertSame('analysis', $this->order->fresh()->status);
        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('financial_transactions', 0);
        $this->assertDatabaseCount('service_order_finalizations', 0);
        $this->assertDatabaseCount('generated_documents', 0);
        $this->assertSame($history, DB::table('status_history')->where('service_order_id', $this->order->id)->get()->toJson());
        $this->assertSame([], Storage::disk('local')->allFiles('documents/orders'));
    }

    public function test_process_crash_after_old_pdf_removal_preserves_durable_recovery_bytes(): void
    {
        $directory = Storage::disk('local')->path('crash-fixture');
        mkdir($directory, 0777, true);
        $database = $directory.'/fixture.sqlite';
        touch($database);
        $process = new Process([PHP_BINARY, base_path('tests/support/document-crash-worker.php'), $database, $directory.'/private'], base_path());
        $process->setOptions(['create_new_console' => false]);
        $process->run();
        $this->assertSame(79, $process->getExitCode(), $process->getErrorOutput().$process->getOutput());
        $pdo = new \PDO('sqlite:'.$database);
        $original = $pdo->query('SELECT * FROM generated_documents')->fetchAll(\PDO::FETCH_ASSOC);
        $this->assertCount(1, $original);
        $this->assertSame('final', $original[0]['type']);
        $this->assertFileDoesNotExist($directory.'/private/'.$original[0]['path']);
        $recovery = glob($directory.'/private/documents/recovery/orders/1/*.pdf');
        $this->assertCount(1, $recovery);
        $this->assertSame($original[0]['sha256'], hash_file('sha256', $recovery[0]));
        $metadata = json_decode(file_get_contents($recovery[0].'.json'), true);
        $this->assertSame($original[0]['path'], $metadata['original_path']);
        $this->assertSame($original[0]['sha256'], $metadata['sha256']);
    }

    public function test_failed_rollback_callback_does_not_skip_later_compensations_or_manager_cleanup(): void
    {
        $manager = app('db.transactions');
        $before = $manager->getPendingTransactions()->map(fn ($transaction) => [$transaction->connection, $transaction->level])->all();
        $executed = [];
        DB::beginTransaction();
        $documents = app(DocumentService::class);
        $documents->onRollback(function () use (&$executed): void {
            $executed[] = 'first';
            throw new RuntimeException('Injected compensation failure');
        });
        $documents->onRollback(function () use (&$executed): void {
            $executed[] = 'second';
        });
        try {
            DB::rollBack();
            $this->fail('O erro da compensação deveria ser propagado após a limpeza.');
        } catch (RuntimeException $error) {
            $this->assertSame('Injected compensation failure', $error->getPrevious()->getMessage());
        }
        $this->assertSame(['first', 'second'], $executed);
        $this->assertSame($before, $manager->getPendingTransactions()->map(fn ($transaction) => [$transaction->connection, $transaction->level])->all());
        $this->assertSame([], app('arl.document-rollback-state')->errors);
        DB::beginTransaction();
        DB::rollBack();
        $this->assertSame(['first', 'second'], $executed);
    }

    public function test_pdf_response_transmits_the_verified_bytes_even_if_the_path_changes_before_send(): void
    {
        $original = '%PDF-1.4 integrity';
        $this->issue();
        $response = app(DocumentService::class)->response($this->order, 'budget');
        Storage::disk('local')->put($this->path(), 'unexpected replacement');
        ob_start();
        try {
            $response->sendContent();
            $sent = ob_get_contents();
        } finally {
            ob_end_clean();
            Storage::disk('local')->put($this->path(), $original);
        }
        $this->assertSame($original, $sent);
        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
        $this->assertTrue($response->headers->hasCacheControlDirective('private'));
        $this->assertTrue($response->headers->hasCacheControlDirective('no-store'));
        $this->assertSame((string) strlen($original), $response->headers->get('Content-Length'));
        $this->assertSame('inline; filename=budget-OS-'.$this->order->number.'-R1.pdf', $response->headers->get('Content-Disposition'));
    }
}
