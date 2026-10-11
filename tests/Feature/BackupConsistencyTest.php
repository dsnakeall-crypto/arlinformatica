<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Role;
use App\Models\User;
use App\Services\BackupService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;
use ZipArchive;

class BackupConsistencyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        Storage::fake('local');
        config(['backup.disk' => 'local', 'backup.recovery_directory' => storage_path('framework/testing/backup-recovery-'.Str::uuid())]);
    }

    public function test_manifest_counts_describe_exported_rows_even_if_a_write_occurs_after_select(): void
    {
        $client = $this->client();
        $changed = false;
        DB::listen(function ($query) use (&$changed, $client) {
            $table = $query->connection->getQueryGrammar()->wrapTable('clients');
            if (! $changed && str_starts_with($query->sql, 'select * from ') && str_contains($query->sql, $table)) {
                $changed = true;
                DB::table('clients')->where('id', $client->id)->delete();
            }
        });
        $backup = app(BackupService::class)->create($this->master(), retain: false);
        $zip = new ZipArchive;
        $zip->open(Storage::disk('local')->path($backup->path));
        $rows = json_decode($zip->getFromName('database/clients.json'), true, flags: JSON_THROW_ON_ERROR);
        $zip->close();
        $this->assertTrue($changed);
        $this->assertCount(1, $rows);
        $this->assertSame(count($rows), $backup->manifest['counts']['clients']);
    }

    public function test_restore_copy_failure_rolls_back_database_and_recovers_private_files(): void
    {
        $master = $this->master();
        $client = $this->client();
        Storage::disk('local')->put('documents/final.pdf', 'old-pdf');
        Storage::disk('local')->put('photos/equipment.webp', 'old-photo');
        $service = app(BackupService::class);
        $backup = $service->create($master, retain: false);
        $client->update(['name' => 'Current']);
        Storage::disk('local')->put('documents/final.pdf', 'current-pdf');
        Storage::disk('local')->put('photos/equipment.webp', 'current-photo');
        Storage::disk('local')->put('photos/new.webp', 'new-photo');
        $failed = false;
        File::partialMock()->shouldReceive('copy')->andReturnUsing(function ($from, $to) use (&$failed) {
            if (! $failed && str_contains(str_replace('\\', '/', $from), '/restore-staging/')) {
                $failed = true;

                return false;
            }

            return copy($from, $to);
        });
        $caught = false;
        try {
            $service->restore($backup, $master);
        } catch (RuntimeException $exception) {
            $caught = true;
            $this->assertStringContainsString('arquivo', mb_strtolower($exception->getMessage()));
        }
        $this->assertTrue($caught, 'A failed private-file write must fail restoration.');
        $this->assertTrue($failed);
        $this->assertSame('Current', $client->fresh()->name);
        $this->assertSame('current-pdf', Storage::disk('local')->get('documents/final.pdf'));
        $this->assertSame('current-photo', Storage::disk('local')->get('photos/equipment.webp'));
        $this->assertSame('new-photo', Storage::disk('local')->get('photos/new.webp'));
        $this->assertSame('ready', $backup->fresh()->status);
        $this->assertDatabaseHas('backups', ['kind' => 'safety', 'status' => 'ready']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'backup.restore_failed']);
    }

    public function test_private_payload_without_checksum_is_rejected_before_restoration(): void
    {
        $backup = app(BackupService::class)->create($this->master(), retain: false);
        $path = Storage::disk('local')->path($backup->path);
        $zip = new ZipArchive;
        $zip->open($path);
        $zip->addFromString('storage/documents/unverified.pdf', 'unchecked');
        $zip->close();
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('checksum');
        app(BackupService::class)->validate($path);
    }

    public function test_missing_or_divergent_registered_document_blocks_backup(): void
    {
        $master = $this->master();
        DB::table('generated_documents')->insert(['service_order_id' => null, 'type' => 'term', 'revision' => 1, 'path' => 'documents/registered.pdf', 'sha256' => hash('sha256', 'registered-pdf'), 'snapshot' => '{}', 'issued_at' => now(), 'issued_by' => $master->id]);
        foreach ([null, 'wrong-pdf'] as $bytes) {
            if ($bytes !== null) {
                Storage::disk('local')->put('documents/registered.pdf', $bytes);
            }
            $caught = false;
            try {
                app(BackupService::class)->create($master, retain: false);
            } catch (RuntimeException $exception) {
                $caught = true;
                $this->assertStringContainsString('registered.pdf', $exception->getMessage());
            }
            $this->assertTrue($caught);
        }
        $this->assertSame(2, DB::table('backups')->where('status', 'failed')->count());
        $this->assertSame(0, DB::table('backups')->where('status', 'ready')->count());
        $this->assertDatabaseCount('generated_documents', 1);
    }

    public function test_persistent_filesystem_failure_preserves_safety_and_recovery_journal(): void
    {
        $master = $this->master();
        $client = $this->client();
        Storage::disk('local')->put('documents/final.pdf', 'old-pdf');
        $service = app(BackupService::class);
        $backup = $service->create($master, retain: false);
        $client->update(['name' => 'Current']);
        Storage::disk('local')->put('documents/final.pdf', 'current-pdf');
        File::partialMock()->shouldReceive('copy')->andReturnUsing(fn ($from, $to) => str_contains(str_replace('\\', '/', $from), '/restore-staging/') ? false : copy($from, $to));
        $caught = false;
        try {
            $service->restore($backup, $master);
        } catch (RuntimeException $exception) {
            $caught = true;
            $this->assertStringContainsString('backup de segurança #', $exception->getMessage());
            $this->assertStringContainsString(config('backup.recovery_directory'), $exception->getMessage());
        }
        $this->assertTrue($caught);
        $this->assertSame('Current', $client->fresh()->name);
        $safety = DB::table('backups')->where('kind', 'safety')->first();
        $this->assertSame('ready', $safety->status);
        Storage::disk('local')->assertExists($safety->path);
        $this->assertDatabaseHas('audit_logs', ['action' => 'backup.restore_recovery_failed']);
        $journals = array_map(fn ($path) => json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR), glob(config('backup.recovery_directory').'/*.json'));
        $this->assertNotEmpty(array_filter($journals, fn ($journal) => $journal['safety_backup_id'] === $safety->id && $journal['state'] === 'applying_files'));
        for ($i = 0; $i < 5; $i++) {
            $service->create($master, retain: false);
        }
        $this->assertDatabaseHas('backups', ['id' => $backup->id, 'status' => 'ready']);
        $this->assertDatabaseHas('backups', ['id' => $safety->id, 'status' => 'ready']);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Retenção suspensa');
        $service->applyRetention();
    }

    public function test_tampered_safety_archive_is_not_used_for_compensation(): void
    {
        $master = $this->master();
        $client = $this->client();
        Storage::disk('local')->put('documents/final.pdf', 'old-pdf');
        $service = app(BackupService::class);
        $backup = $service->create($master, retain: false);
        $client->update(['name' => 'Current']);
        Storage::disk('local')->put('documents/final.pdf', 'current-pdf');
        File::partialMock()->shouldReceive('copy')->andReturnUsing(function ($from, $to) {
            if (str_contains(str_replace('\\', '/', $from), '/restore-staging/')) {
                $path = DB::table('backups')->where('kind', 'safety')->latest('id')->value('path');
                $zip = new ZipArchive;
                $zip->open(Storage::disk('local')->path($path));
                $zip->addFromString('note.txt', 'archive changed after safety creation');
                $zip->close();

                return false;
            }

            return copy($from, $to);
        });
        $caught = false;
        try {
            $service->restore($backup, $master);
        } catch (RuntimeException $exception) {
            $caught = true;
            $this->assertStringContainsString('Checksum do backup de segurança', $exception->getMessage());
        }
        $this->assertTrue($caught);
        $this->assertSame('Current', $client->fresh()->name);
        $this->assertSame('current-pdf', Storage::disk('local')->get('documents/final.pdf'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'backup.restore_recovery_failed']);
    }

    public function test_good_backup_can_repair_corruption_but_divergent_safety_is_not_a_normal_restore_source(): void
    {
        $master = $this->master();
        Storage::disk('local')->put('documents/registered.pdf', 'registered-pdf');
        DB::table('generated_documents')->insert(['service_order_id' => null, 'type' => 'term', 'revision' => 1, 'path' => 'documents/registered.pdf', 'sha256' => hash('sha256', 'registered-pdf'), 'snapshot' => '{}', 'issued_at' => now(), 'issued_by' => $master->id]);
        $service = app(BackupService::class);
        $backup = $service->create($master, retain: false);
        Storage::disk('local')->put('documents/registered.pdf', 'corrupted-pdf');
        $safety = $service->restore($backup, $master);
        $this->assertSame('registered-pdf', Storage::disk('local')->get('documents/registered.pdf'));
        $this->assertTrue($safety->manifest['recovery_only']);
        $this->assertNotEmpty($safety->manifest['integrity_issues']);
        Storage::disk('local')->assertExists($safety->path);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('reservado à recuperação interna');
        $service->restore($safety, $master);
    }

    public function test_valid_archive_checksums_do_not_allow_invalid_foreign_keys_to_commit(): void
    {
        $master = $this->master();
        Storage::disk('local')->put('documents/registered.pdf', 'registered-pdf');
        DB::table('generated_documents')->insert(['service_order_id' => null, 'type' => 'term', 'revision' => 1, 'path' => 'documents/registered.pdf', 'sha256' => hash('sha256', 'registered-pdf'), 'snapshot' => '{}', 'issued_at' => now(), 'issued_by' => $master->id]);
        $service = app(BackupService::class);
        $backup = $service->create($master, retain: false);
        $path = Storage::disk('local')->path($backup->path);
        $zip = new ZipArchive;
        $zip->open($path);
        $rows = json_decode($zip->getFromName('database/generated_documents.json'), true, flags: JSON_THROW_ON_ERROR);
        $rows[0]['issued_by'] = 999999;
        $payload = json_encode($rows, JSON_THROW_ON_ERROR);
        $checksums = json_decode($zip->getFromName('checksums.json'), true, flags: JSON_THROW_ON_ERROR);
        $checksums['database/generated_documents.json'] = hash('sha256', $payload);
        $manifest = json_decode($zip->getFromName('manifest.json'), true, flags: JSON_THROW_ON_ERROR);
        $manifest['payload_sha256'] = hash('sha256', json_encode($checksums, JSON_THROW_ON_ERROR));
        $zip->addFromString('database/generated_documents.json', $payload);
        $zip->addFromString('checksums.json', json_encode($checksums, JSON_THROW_ON_ERROR));
        $zip->addFromString('manifest.json', json_encode($manifest, JSON_THROW_ON_ERROR));
        $zip->close();
        $backup->update(['sha256' => hash_file('sha256', $path)]);
        $caught = false;
        try {
            $service->restore($backup, $master);
        } catch (RuntimeException $exception) {
            $caught = true;
            $this->assertStringContainsString('relacionamentos inválidos', $exception->getMessage());
        }
        $this->assertTrue($caught);
        $this->assertDatabaseHas('generated_documents', ['issued_by' => $master->id]);
        $this->assertSame('registered-pdf', Storage::disk('local')->get('documents/registered.pdf'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'backup.restore_failed']);
    }

    public function test_malformed_recovery_journal_suspends_retention_without_removing_backups(): void
    {
        $master = $this->master();
        $service = app(BackupService::class);
        for ($i = 0; $i < 5; $i++) {
            $service->create($master, retain: false);
        }
        File::ensureDirectoryExists(config('backup.recovery_directory'));
        File::put(config('backup.recovery_directory').'/incomplete.json', '{"state":');
        $caught = false;
        try {
            $service->applyRetention();
        } catch (RuntimeException $exception) {
            $caught = true;
            $this->assertStringContainsString('Retenção suspensa', $exception->getMessage());
        }
        $this->assertTrue($caught);
        $this->assertDatabaseCount('backups', 5);
        $this->assertCount(5, Storage::disk('local')->files(config('backup.directory')));
    }

    private function master(): User
    {
        return User::create(['role_id' => Role::where('name', 'Master')->value('id'), 'name' => 'Master synthetic', 'login' => 'backup-consistency', 'password' => 'Senha#Forte123', 'active' => true]);
    }

    private function client(): Client
    {
        return Client::create(['name' => 'Original', 'document' => '52998224725', 'phone' => '35999999999', 'postal_code' => '37160000', 'street' => 'Rua A', 'number' => '1', 'district' => 'Centro', 'city' => 'Cidade', 'state' => 'MG']);
    }
}
