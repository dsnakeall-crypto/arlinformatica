<?php

namespace App\Services;

use App\Models\Backup;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;
use ZipArchive;

class BackupService
{
    public const AUTOMATIC_RETENTION = 2;

    private const EXCLUDED_TABLES = ['backups', 'cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs', 'sessions', 'password_reset_tokens'];

    public function create(?User $user = null, string $kind = 'manual', bool $protected = false): Backup
    {
        $backup = Backup::create(['kind' => $kind, 'path' => 'pending', 'sha256' => str_repeat('0', 64), 'bytes' => 0, 'manifest' => [], 'status' => 'creating', 'protected' => $protected, 'created_by' => $user?->id]);
        $work = storage_path('app/backup-work/'.Str::uuid());
        File::ensureDirectoryExists("$work/database");

        try {
            $tables = array_values(array_filter(
                Schema::getTableListing(),
                fn (string $table) => ! in_array($this->logicalTableName($table), self::EXCLUDED_TABLES, true)
            ));
            sort($tables);
            $checksums = [];
            $counts = [];
            foreach ($tables as $table) {
                $logicalTable = $this->logicalTableName($table);
                $json = json_encode(DB::table($table)->orderBy($this->primaryKey($table))->get()->map(fn ($row) => (array) $row)->all(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
                File::put("$work/database/$logicalTable.json", $json);
                $checksums["database/$logicalTable.json"] = hash('sha256', $json);
                $counts[$logicalTable] = DB::table($table)->count();
            }
            $this->copyPrivateStorage($work, $checksums);
            $manifest = [
                'system' => config('app.name'), 'app_version' => config('app.version', env('APP_VERSION', 'unknown')),
                'created_at' => now()->toIso8601String(), 'timezone' => config('app.timezone'), 'git_commit' => env('APP_COMMIT', 'unknown'),
                'database_driver' => DB::getDriverName(), 'schema_version' => optional(DB::table('migrations')->orderByDesc('batch')->first())->batch,
                'migrations' => DB::table('migrations')->orderBy('id')->pluck('migration')->all(), 'counts' => $counts,
                'clients' => $counts['clients'] ?? 0, 'service_orders' => $counts['service_orders'] ?? 0,
                'documents' => $counts['generated_documents'] ?? 0, 'photos' => $counts['service_order_photos'] ?? 0,
                'payload_bytes' => collect($checksums)->keys()->sum(fn ($name) => filesize("$work/$name")),
                'format_version' => config('backup.format_version'), 'payload_sha256' => hash('sha256', json_encode($checksums, JSON_THROW_ON_ERROR)),
            ];
            File::put("$work/checksums.json", json_encode($checksums, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
            File::put("$work/manifest.json", json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
            $filename = 'backup-arl-'.now()->format('Ymd-His').'-'.$backup->id.'.zip';
            $archive = "$work/$filename";
            $this->zipDirectory($work, $archive, $filename);
            $path = config('backup.directory')."/$filename";
            $disk = Storage::disk(config('backup.disk'));
            $written = $disk->put($path, File::get($archive));
            throw_unless($written && $disk->exists($path), RuntimeException::class, 'O arquivo de backup não foi gravado no servidor.');
            $storedBytes = $disk->size($path);
            throw_unless($storedBytes > 0, RuntimeException::class, 'O arquivo de backup foi gerado vazio.');
            $backup->update(['path' => $path, 'sha256' => hash_file('sha256', $archive), 'bytes' => $storedBytes, 'manifest' => $manifest, 'status' => 'ready']);
            $this->audit($user, $kind === 'automatic' ? 'backup.automatic_created' : 'backup.created', $backup->id, ['bytes' => $backup->bytes, 'sha256' => $backup->sha256]);

            return $backup->fresh();
        } catch (Throwable $e) {
            $backup->update(['status' => 'failed', 'error' => Str::limit($e->getMessage(), 1000)]);
            throw $e;
        } finally {
            File::deleteDirectory($work);
        }
    }

    public function validate(string $archive): array
    {
        $zip = new ZipArchive;
        throw_unless($zip->open($archive) === true, RuntimeException::class, 'O arquivo não é um ZIP válido.');
        try {
            $uncompressedBytes = 0;
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (! $this->safeEntry($name)) {
                    throw new RuntimeException('O backup contém um caminho inseguro.');
                }
                $uncompressedBytes += (int) $zip->statIndex($i)['size'];
                if ($uncompressedBytes > config('backup.max_upload_kb') * 1024 * 4) {
                    throw new RuntimeException('O conteúdo descompactado ultrapassa o limite seguro.');
                }
            }
            $manifest = json_decode($zip->getFromName('manifest.json') ?: '', true, 512, JSON_THROW_ON_ERROR);
            $checksums = json_decode($zip->getFromName('checksums.json') ?: '', true, 512, JSON_THROW_ON_ERROR);
            throw_unless(($manifest['format_version'] ?? null) === config('backup.format_version'), RuntimeException::class, 'Versão de backup não suportada.');
            throw_unless(hash_equals($manifest['payload_sha256'] ?? '', hash('sha256', json_encode($checksums, JSON_THROW_ON_ERROR))), RuntimeException::class, 'Checksum do manifesto inválido.');
            foreach ($checksums as $name => $checksum) {
                $content = $zip->getFromName($name);
                throw_unless(is_string($content) && hash_equals($checksum, hash('sha256', $content)), RuntimeException::class, "Integridade inválida em $name.");
            }
            throw_unless(isset($checksums['database/migrations.json']), RuntimeException::class, 'Banco de dados ausente no backup.');

            return $manifest;
        } finally {
            $zip->close();
        }
    }

    public function restore(Backup $source, User $user): Backup
    {
        throw_unless($source->status === 'ready' && Storage::disk(config('backup.disk'))->exists($source->path), RuntimeException::class, 'Backup indisponível.');
        $archive = Storage::disk(config('backup.disk'))->path($source->path);
        $this->validate($archive);
        $safety = $this->create($user, 'safety', true);
        $this->audit($user, 'backup.restore_started', $source->id, ['safety_backup_id' => $safety->id]);
        $zip = new ZipArchive;
        $zip->open($archive);
        try {
            $sqlite = DB::getDriverName() === 'sqlite';
            if ($sqlite) {
                DB::statement('PRAGMA defer_foreign_keys = ON');
            } else {
                Schema::disableForeignKeyConstraints();
            }

            try {
                DB::transaction(function () use ($zip) {
                    $tables = array_values(array_filter(
                        Schema::getTableListing(),
                        fn (string $table) => ! in_array($this->logicalTableName($table), self::EXCLUDED_TABLES, true)
                    ));
                    foreach (array_reverse($tables) as $table) {
                        DB::table($table)->delete();
                    }
                    foreach ($tables as $table) {
                        $logicalTable = $this->logicalTableName($table);
                        $content = $zip->getFromName("database/$logicalTable.json");
                        if ($content === false) {
                            continue;
                        }
                        foreach (array_chunk(json_decode($content, true, 512, JSON_THROW_ON_ERROR), 250) as $rows) {
                            if ($rows) {
                                DB::table($table)->insert($rows);
                            }
                        }
                    }
                });
            } finally {
                if ($sqlite) {
                    DB::statement('PRAGMA defer_foreign_keys = OFF');
                } else {
                    Schema::enableForeignKeyConstraints();
                }
            }
            $this->restoreStorage($zip);
            $source->update(['status' => 'restored']);
            $this->audit($user, 'backup.restore_completed', $source->id, ['safety_backup_id' => $safety->id]);

            return $safety;
        } catch (Throwable $e) {
            $this->audit($user, 'backup.restore_failed', $source->id, ['safety_backup_id' => $safety->id, 'error' => Str::limit($e->getMessage(), 500)]);
            throw $e;
        } finally {
            $zip->close();
        }
    }

    public function applyRetention(): int
    {
        $eligible = Backup::where('kind', 'automatic')->where('status', 'ready')->latest('id')->get()->slice(self::AUTOMATIC_RETENTION);
        foreach ($eligible as $backup) {
            Storage::disk(config('backup.disk'))->delete($backup->path);
            $backup->delete();
        }

        return $eligible->count();
    }

    public function automaticSettings(): array
    {
        $values = DB::table('settings')->whereIn('key', ['backup_automatic', 'backup_frequency'])->pluck('value', 'key');

        return [
            'enabled' => filter_var($values['backup_automatic'] ?? config('backup.automatic'), FILTER_VALIDATE_BOOL),
            'frequency' => in_array($values['backup_frequency'] ?? null, ['daily', 'weekly', 'monthly'], true) ? $values['backup_frequency'] : config('backup.frequency'),
            'retention' => self::AUTOMATIC_RETENTION,
        ];
    }

    public function saveAutomaticSettings(array $settings): void
    {
        foreach (['backup_automatic' => $settings['enabled'] ? '1' : '0', 'backup_frequency' => $settings['frequency'], 'backup_retention' => (string) self::AUTOMATIC_RETENTION] as $key => $value) {
            DB::table('settings')->updateOrInsert(['key' => $key], ['value' => $value, 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    private function copyPrivateStorage(string $work, array &$checksums): void
    {
        $root = Storage::disk('local')->path('');
        foreach (File::allFiles($root) as $file) {
            $relative = str_replace('\\', '/', $file->getRelativePathname());
            if (! $this->managedPrivateFile($relative)) {
                continue;
            }
            $target = "$work/storage/$relative";
            File::ensureDirectoryExists(dirname($target));
            File::copy($file->getPathname(), $target);
            $checksums["storage/$relative"] = hash_file('sha256', $target);
        }
    }

    private function zipDirectory(string $work, string $archive, string $skip): void
    {
        $zip = new ZipArchive;
        throw_unless($zip->open($archive, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true, RuntimeException::class, 'Não foi possível criar o ZIP.');
        foreach (File::allFiles($work) as $file) {
            $relative = str_replace('\\', '/', $file->getRelativePathname());
            if ($relative !== $skip) {
                $zip->addFile($file->getPathname(), $relative);
            }
        }
        throw_unless($zip->close(), RuntimeException::class, 'Não foi possível finalizar o ZIP.');
    }

    private function restoreStorage(ZipArchive $zip): void
    {
        $root = Storage::disk('local')->path('');
        $staging = storage_path('app/restore-staging/'.Str::uuid());
        File::ensureDirectoryExists($staging);
        $snapshotFiles = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (! str_starts_with($name, 'storage/') || str_ends_with($name, '/')) {
                continue;
            }
            $relative = substr($name, 8);
            throw_unless($this->safeEntry($relative), RuntimeException::class, 'Arquivo privado inseguro.');
            if (! $this->managedPrivateFile($relative)) {
                continue;
            }
            $target = "$staging/$relative";
            File::ensureDirectoryExists(dirname($target));
            File::put($target, $zip->getFromIndex($i));
            $snapshotFiles[] = $relative;
        }
        try {
            // The ZIP is a snapshot of the managed private domain, not an additive patch.
            // Framework state, logs, backups and temporary recovery data are deliberately excluded.
            foreach (File::allFiles($root) as $file) {
                $relative = str_replace('\\', '/', $file->getRelativePathname());
                if ($this->managedPrivateFile($relative) && ! in_array($relative, $snapshotFiles, true)) {
                    File::delete($file->getPathname());
                }
            }
            foreach (File::allFiles($staging) as $file) {
                $relative = str_replace('\\', '/', $file->getRelativePathname());
                $target = "$root/$relative";
                File::ensureDirectoryExists(dirname($target));
                File::copy($file->getPathname(), $target);
            }
        } finally {
            File::deleteDirectory($staging);
        }
    }

    private function safeEntry(string $name): bool
    {
        $normalized = str_replace('\\', '/', $name);
        $segments = explode('/', $normalized);

        return $normalized !== ''
            && ! str_contains($normalized, "\0")
            && ! str_starts_with($normalized, '/')
            && ! preg_match('/^[A-Za-z]:/', $normalized)
            && ! in_array('..', $segments, true)
            && ! preg_match('/(^|\/)\.env($|\/)|\.php$/i', $normalized);
    }

    private function managedPrivateFile(string $relative): bool
    {
        $relative = str_replace('\\', '/', $relative);

        return $this->safeEntry($relative)
            && ! str_starts_with($relative, config('backup.directory').'/')
            && ! str_starts_with($relative, 'backup-work/')
            && ! str_starts_with($relative, 'restore-staging/')
            && ! str_starts_with($relative, 'framework/')
            && ! str_starts_with($relative, 'logs/');
    }

    private function logicalTableName(string $table): string
    {
        return Str::afterLast($table, '.');
    }

    private function primaryKey(string $table): string
    {
        return Schema::hasColumn($table, 'id') ? 'id' : (Schema::hasColumn($table, 'key') ? 'key' : Schema::getColumnListing($table)[0]);
    }

    private function audit(?User $user, string $action, int $id, array $after): void
    {
        $userId = $user && DB::table('users')->where('id', $user->id)->exists() ? $user->id : null;
        DB::table('audit_logs')->insert(['user_id' => $userId, 'action' => $action, 'subject_type' => 'backup', 'subject_id' => $id, 'after' => json_encode($after), 'created_at' => now()]);
    }
}
