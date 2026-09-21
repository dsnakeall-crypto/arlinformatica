<?php

namespace Tests\Feature;

use App\Models\Backup;
use App\Models\Client;
use App\Models\Role;
use App\Models\User;
use App\Services\BackupService;
use App\Services\NotificationService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use ReflectionMethod;
use RuntimeException;
use Tests\TestCase;
use ZipArchive;

class StageEightTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        Storage::fake('local');
        config(['backup.disk' => 'local']);
    }

    public function test_only_master_can_create_download_and_restore_backups(): void
    {
        $employee = $this->user('Funcionário', 'employee');
        $admin = $this->user('Administrador', 'admin');
        $master = $this->user('Master', 'master');
        $this->actingAs($employee)->postJson('/api/backups')->assertForbidden();
        $backup = $this->actingAs($master)->postJson('/api/backups')->assertCreated()->json();
        $this->actingAs($employee)->get("/api/backups/{$backup['id']}/download")->assertForbidden();
        $this->actingAs($admin)->postJson("/api/backups/{$backup['id']}/restore", ['confirmation' => 'RESTAURAR BACKUP'])->assertForbidden();
        $this->actingAs($master)->get("/api/backups/{$backup['id']}/download")->assertOk();
        $this->get('/api/backups/999999/download')->assertNotFound();
    }

    public function test_manual_backup_is_downloaded_and_not_kept_on_server(): void
    {
        $master = $this->user('Master', 'master');

        $response = $this->actingAs($master)->post('/api/backups/manual-download');

        $response->assertOk()->assertDownload();
        $this->assertDatabaseMissing('backups', ['kind' => 'manual']);
    }

    public function test_backup_has_manifest_checksums_records_private_files_and_no_env(): void
    {
        Storage::disk('local')->put('orders/photo.webp', 'private-photo');
        $master = $this->user('Master', 'master');
        $client = Client::create(['name' => 'Preservado', 'document' => '52998224725', 'phone' => '35999999999', 'postal_code' => '37160000', 'street' => 'Rua A', 'number' => '1', 'district' => 'Centro', 'city' => 'Cidade', 'state' => 'MG']);
        $backup = app(BackupService::class)->create($master);
        $this->assertSame(1, $backup->manifest['format_version']);
        $this->assertSame(1, $backup->manifest['clients']);
        $zip = new ZipArchive;
        $zip->open(Storage::disk('local')->path($backup->path));
        $this->assertNotFalse($zip->getFromName('manifest.json'));
        $this->assertNotFalse($zip->getFromName('checksums.json'));
        $this->assertStringContainsString($client->name, $zip->getFromName('database/clients.json'));
        $this->assertSame('private-photo', $zip->getFromName('storage/orders/photo.webp'));
        $this->assertFalse($zip->locateName('.env'));
        $zip->close();
    }

    public function test_restore_requires_confirmation_creates_safety_backup_and_recovers_data(): void
    {
        $master = $this->user('Master', 'master');
        $client = Client::create(['name' => 'Original', 'document' => '52998224725', 'phone' => '35999999999', 'postal_code' => '37160000', 'street' => 'Rua A', 'number' => '1', 'district' => 'Centro', 'city' => 'Cidade', 'state' => 'MG']);
        $backup = app(BackupService::class)->create($master);
        $client->update(['name' => 'Alterado']);
        $this->actingAs($master)->postJson("/api/backups/$backup->id/restore", ['confirmation' => 'sim'])->assertUnprocessable();
        $this->postJson("/api/backups/$backup->id/restore", ['confirmation' => 'RESTAURAR BACKUP'])->assertOk();
        $this->assertDatabaseHas('clients', ['id' => $client->id, 'name' => 'Original']);
        $this->assertDatabaseHas('backups', ['kind' => 'safety', 'protected' => true]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'backup.restore_completed']);
    }

    public function test_restore_snapshot_only_changes_managed_private_files(): void
    {
        $master = $this->user('Master', 'master');
        Storage::disk('local')->put('documents/snapshot.txt', 'conteudo-antigo');
        Storage::disk('local')->put('framework/cache/runtime.txt', 'framework-antigo');
        Storage::disk('local')->put('logs/laravel.log', 'log-antigo');
        Storage::disk('local')->put('backup-work/runtime.tmp', 'temporario-antigo');
        Storage::disk('local')->put('restore-staging/runtime.tmp', 'recuperacao-antiga');

        $backup = app(BackupService::class)->create($master);
        $sourcePath = $backup->path;
        $zip = new ZipArchive;
        $zip->open(Storage::disk('local')->path($sourcePath));
        $this->assertSame('conteudo-antigo', $zip->getFromName('storage/documents/snapshot.txt'));
        $this->assertFalse($zip->locateName('storage/framework/cache/runtime.txt'));
        $this->assertFalse($zip->locateName('storage/logs/laravel.log'));
        $this->assertFalse($zip->locateName('storage/backup-work/runtime.tmp'));
        $this->assertFalse($zip->locateName('storage/restore-staging/runtime.tmp'));
        $zip->close();

        Storage::disk('local')->put('documents/snapshot.txt', 'conteudo-novo');
        Storage::disk('local')->put('documents/criado-depois.txt', 'deve-sumir');
        Storage::disk('local')->put('framework/cache/runtime.txt', 'framework-atual');
        Storage::disk('local')->put('logs/laravel.log', 'log-atual');
        Storage::disk('local')->put('backup-work/runtime.tmp', 'temporario-atual');
        Storage::disk('local')->put('restore-staging/runtime.tmp', 'recuperacao-atual');

        $safety = app(BackupService::class)->restore($backup, $master);

        $this->assertSame('conteudo-antigo', Storage::disk('local')->get('documents/snapshot.txt'));
        Storage::disk('local')->assertMissing('documents/criado-depois.txt');
        $this->assertSame('framework-atual', Storage::disk('local')->get('framework/cache/runtime.txt'));
        $this->assertSame('log-atual', Storage::disk('local')->get('logs/laravel.log'));
        $this->assertSame('temporario-atual', Storage::disk('local')->get('backup-work/runtime.tmp'));
        $this->assertSame('recuperacao-atual', Storage::disk('local')->get('restore-staging/runtime.tmp'));
        Storage::disk('local')->assertExists($sourcePath);
        Storage::disk('local')->assertExists($safety->path);
        $this->assertDatabaseHas('backups', ['id' => $safety->id, 'kind' => 'safety', 'protected' => true]);
    }

    public function test_invalid_zip_checksum_manifest_and_zip_slip_are_rejected(): void
    {
        $master = $this->user('Master', 'master');
        $this->actingAs($master)->post('/api/backups/upload', ['backup' => UploadedFile::fake()->create('invalid.zip', 1, 'application/zip')])->assertUnprocessable()->assertJsonValidationErrors('backup');
        $this->assertBackupArchiveRejected([
            'checksums.json' => '{}',
            'manifest.json' => json_encode(['format_version' => config('backup.format_version'), 'payload_sha256' => 'invalido']),
        ], 'Checksum do manifesto inválido');
        $this->assertBackupArchiveRejected([
            'database/migrations.json' => '[]',
            'checksums.json' => json_encode(['database/migrations.json' => str_repeat('0', 64)]),
            'manifest.json' => json_encode(['format_version' => config('backup.format_version'), 'payload_sha256' => hash('sha256', json_encode(['database/migrations.json' => str_repeat('0', 64)]))]),
        ], 'Integridade inválida');
        $this->assertBackupArchiveRejected([
            '../attack.php' => '<?php',
            'checksums.json' => '{}',
            'manifest.json' => '{}',
        ], 'caminho inseguro');
    }

    public function test_automatic_retention_and_scheduler_heartbeat(): void
    {
        $master = $this->user('Master', 'master');
        app(BackupService::class)->create($master, 'automatic');
        app(BackupService::class)->create($master, 'automatic');
        $latest = app(BackupService::class)->create($master, 'automatic', true);
        $this->assertSame(1, app(BackupService::class)->applyRetention());
        $this->assertDatabaseHas('backups', ['id' => $latest->id]);
        $this->assertSame(2, Backup::where('kind', 'automatic')->count());
        $this->artisan('scheduler:heartbeat')->assertSuccessful();
        $this->assertDatabaseHas('settings', ['key' => 'scheduler_heartbeat_at']);
    }

    public function test_master_can_persist_automatic_backup_configuration_with_audit(): void
    {
        $master = $this->user('Master', 'master');
        $this->actingAs($master)->putJson('/api/backups/automatic', ['enabled' => true, 'frequency' => 'weekly'])
            ->assertOk()->assertJson(['enabled' => true, 'frequency' => 'weekly', 'retention' => 2]);
        $this->assertDatabaseHas('settings', ['key' => 'backup_frequency', 'value' => 'weekly']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'backup.automatic_settings_updated']);
    }

    #[DataProvider('unsafeBackupPaths')]
    public function test_every_unsafe_zip_path_shape_is_rejected(string $path): void
    {
        $method = new ReflectionMethod(BackupService::class, 'safeEntry');
        $this->assertFalse($method->invoke(app(BackupService::class), $path), "Path should be unsafe: $path");
    }

    public static function unsafeBackupPaths(): array
    {
        return [['..'], ['a/..'], ['../arquivo'], ['a/../arquivo'], ['..\\arquivo'], ['a\\..\\arquivo'], ['/absoluto'], ['C:\\arquivo'], ["arquivo\0oculto"], ['arquivo.php'], ['storage/.env']];
    }

    public function test_diagnostics_do_not_expose_secrets_and_push_failure_does_not_block_notification(): void
    {
        config(['webpush.private_key' => 'VERY-PRIVATE-SECRET']);
        $master = $this->user('Master', 'master');
        $response = $this->actingAs($master)->getJson('/api/diagnostics')->assertOk()->assertJsonPath('database.connected', true);
        $this->assertStringNotContainsString('VERY-PRIVATE-SECRET', $response->getContent());
        app(NotificationService::class)->notifyUsers('client_created', 'Novo cliente', 'Texto curto', '/clients', 'stage-eight-push');
        $this->assertDatabaseHas('notifications', ['deduplication_key' => 'stage-eight-push']);
        $this->postJson('/api/diagnostics/push-test')->assertOk()->assertJsonPath('status', 'not_configured');
    }

    private function user(string $role, string $login): User
    {
        return User::create(['role_id' => Role::where('name', $role)->value('id'), 'name' => $role, 'login' => $login, 'password' => 'Senha#Forte123', 'active' => true]);
    }

    private function assertBackupArchiveRejected(array $entries, string $message): void
    {
        $path = tempnam(sys_get_temp_dir(), 'arl-');
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        foreach ($entries as $name => $content) {
            $zip->addFromString($name, $content);
        }
        $zip->close();

        try {
            app(BackupService::class)->validate($path);
            $this->fail('O backup inválido foi aceito.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString($message, $exception->getMessage());
        } finally {
            @unlink($path);
        }
    }
}
