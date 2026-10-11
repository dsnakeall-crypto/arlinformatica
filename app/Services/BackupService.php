<?php

namespace App\Services;

use App\Models\Backup;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
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
    public const AUTOMATIC_RETENTION = 4;

    private const EXCLUDED_TABLES = ['backups', 'cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs', 'sessions', 'password_reset_tokens'];

    public function create(?User $user = null, string $kind = 'manual', bool $protected = false, bool $retain = true): Backup
    {
        $backup = Backup::create(['kind' => $kind, 'path' => 'pending', 'sha256' => str_repeat('0', 64), 'bytes' => 0, 'manifest' => [], 'status' => 'creating', 'protected' => $protected, 'created_by' => $user?->id]);
        $work = storage_path('app/backup-work/'.Str::uuid());
        File::ensureDirectoryExists("$work/database");

        try {
            throw_unless(DB::transactionLevel() === 0 || app()->runningUnitTests(), RuntimeException::class, 'O backup exige uma transação de leitura independente.');
            if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true) && DB::transactionLevel() === 0) {
                foreach (Schema::getTables(Schema::getCurrentSchemaListing()) as $table) {
                    if (! in_array($table['name'], self::EXCLUDED_TABLES, true)) {
                        throw_unless(strcasecmp($table['engine'] ?? '', 'InnoDB') === 0, RuntimeException::class, 'Snapshot consistente exige tabelas InnoDB: '.$table['name']);
                    }
                }
                DB::statement('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
            }
            [$checksums, $counts, $migrations, $schemaVersion, $integrityIssues] = DB::transaction(function () use ($work, $kind) {
                $tables = array_values(array_filter(
                    $this->currentDatabaseTables(),
                    fn (string $table) => ! in_array($this->logicalTableName($table), self::EXCLUDED_TABLES, true)
                ));
                sort($tables);
                $checksums = [];
                $counts = [];
                $references = [];
                foreach ($tables as $table) {
                    $logicalTable = $this->logicalTableName($table);
                    $rows = DB::table($table)->orderBy($this->primaryKey($table))->get()->map(fn ($row) => (array) $row)->all();
                    $json = json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
                    throw_unless(File::put("$work/database/$logicalTable.json", $json) !== false, RuntimeException::class, "Não foi possível gravar a tabela $logicalTable.");
                    $checksums["database/$logicalTable.json"] = hash('sha256', $json);
                    $counts[$logicalTable] = count($rows);
                    if (in_array($logicalTable, ['generated_documents', 'service_order_photos', 'supplier_documents', 'supplier_invoices'], true)) {
                        $references = array_merge($references, $rows);
                    }
                }
                $this->copyPrivateStorage($work, $checksums);
                $integrityIssues = [];
                foreach ($references as $reference) {
                    $name = 'storage/'.$reference['path'];
                    if (($reference['disk'] ?? 'local') !== 'local' || ! isset($checksums[$name])) {
                        $integrityIssues[] = 'Arquivo referenciado ausente no backup: '.$reference['path'];

                        continue;
                    }
                    if (isset($reference['sha256']) && ! hash_equals($reference['sha256'], $checksums[$name])) {
                        $integrityIssues[] = 'Checksum do arquivo diverge do banco: '.$reference['path'];
                    }
                    if (isset($reference['bytes']) && (int) $reference['bytes'] !== filesize("$work/$name")) {
                        $integrityIssues[] = 'Tamanho do arquivo diverge do banco: '.$reference['path'];
                    }
                }
                throw_unless($kind === 'safety' || ! $integrityIssues, RuntimeException::class, implode('; ', $integrityIssues));

                return [$checksums, $counts, DB::table('migrations')->orderBy('id')->pluck('migration')->all(), optional(DB::table('migrations')->orderByDesc('batch')->first())->batch, $integrityIssues];
            });
            $manifest = [
                'system' => config('app.name'), 'app_version' => config('app.version', env('APP_VERSION', 'unknown')),
                'created_at' => now()->toIso8601String(), 'timezone' => config('app.timezone'), 'git_commit' => env('APP_COMMIT', 'unknown'),
                'database_driver' => DB::getDriverName(), 'schema_version' => $schemaVersion,
                'migrations' => $migrations, 'counts' => $counts,
                'clients' => $counts['clients'] ?? 0, 'service_orders' => $counts['service_orders'] ?? 0,
                'documents' => $counts['generated_documents'] ?? 0, 'photos' => $counts['service_order_photos'] ?? 0,
                'payload_bytes' => collect($checksums)->keys()->sum(fn ($name) => filesize("$work/$name")),
                'format_version' => config('backup.format_version'), 'payload_sha256' => hash('sha256', json_encode($checksums, JSON_THROW_ON_ERROR)),
                'integrity_issues' => $integrityIssues, 'recovery_only' => (bool) $integrityIssues,
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
            throw_unless(hash_equals(hash_file('sha256', $archive), hash_file('sha256', $disk->path($path))), RuntimeException::class, 'Checksum do arquivo gravado inválido.');
            $backup->update(['path' => $path, 'sha256' => hash_file('sha256', $archive), 'bytes' => $storedBytes, 'manifest' => $manifest, 'status' => 'ready']);
            $this->validate($disk->path($path));
            $this->audit($user, $kind === 'automatic' ? 'backup.automatic_created' : 'backup.created', $backup->id, ['bytes' => $backup->bytes, 'sha256' => $backup->sha256]);
        } catch (Throwable $e) {
            $backup->update(['status' => 'failed', 'error' => Str::limit($e->getMessage(), 1000)]);
            throw $e;
        } finally {
            File::deleteDirectory($work);
        }
        if ($retain) {
            $this->applyRetention();
        }

        return $backup->fresh();
    }

    public function validate(string $archive): array
    {
        $zip = new ZipArchive;
        throw_unless($zip->open($archive) === true, RuntimeException::class, 'O arquivo não é um ZIP válido.');
        try {
            $uncompressedBytes = 0;
            $entryNames = [];
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                $normalized = str_replace('\\', '/', $name);
                if (! $this->safeEntry($name) || isset($entryNames[$normalized])) {
                    throw new RuntimeException('O backup contém um caminho inseguro.');
                }
                $entryNames[$normalized] = true;
                $uncompressedBytes += (int) $zip->statIndex($i)['size'];
                if ($uncompressedBytes > config('backup.max_upload_kb') * 1024 * 4) {
                    throw new RuntimeException('O conteúdo descompactado ultrapassa o limite seguro.');
                }
            }
            $manifest = json_decode($zip->getFromName('manifest.json') ?: '', true, 512, JSON_THROW_ON_ERROR);
            $checksums = json_decode($zip->getFromName('checksums.json') ?: '', true, 512, JSON_THROW_ON_ERROR);
            throw_unless(is_array($manifest) && is_array($checksums), RuntimeException::class, 'Manifesto ou checksums inválidos.');
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (! str_ends_with($name, '/') && (str_starts_with($name, 'database/') || str_starts_with($name, 'storage/'))) {
                    throw_unless(isset($checksums[$name]), RuntimeException::class, "Arquivo sem checksum: $name.");
                }
            }
            throw_unless(($manifest['format_version'] ?? null) === config('backup.format_version'), RuntimeException::class, 'Versão de backup não suportada.');
            throw_unless(hash_equals($manifest['payload_sha256'] ?? '', hash('sha256', json_encode($checksums, JSON_THROW_ON_ERROR))), RuntimeException::class, 'Checksum do manifesto inválido.');
            foreach ($checksums as $name => $checksum) {
                throw_unless(is_string($name) && $this->safeEntry($name) && is_string($checksum) && preg_match('/^[a-f0-9]{64}$/i', $checksum), RuntimeException::class, 'Entrada de checksum inválida.');
                $content = $zip->getFromName($name);
                throw_unless(is_string($content) && hash_equals($checksum, hash('sha256', $content)), RuntimeException::class, "Integridade inválida em $name.");
                if (str_starts_with($name, 'database/')) {
                    $rows = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
                    throw_unless(is_array($rows) && array_is_list($rows), RuntimeException::class, "Tabela inválida em $name.");
                    $table = basename($name, '.json');
                    if (isset($manifest['counts'][$table])) {
                        throw_unless((int) $manifest['counts'][$table] === count($rows), RuntimeException::class, "Contagem inválida em $name.");
                    }
                }
            }
            throw_unless(isset($checksums['database/migrations.json']), RuntimeException::class, 'Banco de dados ausente no backup.');
            if (empty($manifest['recovery_only'])) {
                foreach (['generated_documents', 'service_order_photos', 'supplier_documents', 'supplier_invoices'] as $table) {
                    $content = $zip->getFromName("database/$table.json");
                    foreach ($content === false ? [] : json_decode($content, true, 512, JSON_THROW_ON_ERROR) as $reference) {
                        $name = 'storage/'.$reference['path'];
                        throw_unless(($reference['disk'] ?? 'local') === 'local' && isset($checksums[$name]), RuntimeException::class, 'Arquivo referenciado ausente no backup: '.$reference['path']);
                        if (isset($reference['sha256'])) {
                            throw_unless(hash_equals($reference['sha256'], $checksums[$name]), RuntimeException::class, 'Checksum do arquivo diverge do banco: '.$reference['path']);
                        }
                        if (isset($reference['bytes'])) {
                            throw_unless((int) $reference['bytes'] === strlen($zip->getFromName($name)), RuntimeException::class, 'Tamanho do arquivo diverge do banco: '.$reference['path']);
                        }
                    }
                }
            }

            return $manifest;
        } finally {
            $zip->close();
        }
    }

    public function restore(Backup $source, User $user): Backup
    {
        try {
            // Retention cannot remove the source while a restore is reading it.
            return Cache::lock('backup-retention', 1800)->block(10, fn () => $this->restoreSnapshot($source, $user));
        } finally {
            if (! $this->hasPendingRecovery()) {
                $this->applyRetention();
            }
        }
    }

    private function restoreSnapshot(Backup $source, User $user): Backup
    {
        throw_unless($source->status === 'ready' && Storage::disk(config('backup.disk'))->exists($source->path), RuntimeException::class, 'Backup indisponível.');
        $archive = Storage::disk(config('backup.disk'))->path($source->path);
        throw_unless(hash_equals($source->sha256, hash_file('sha256', $archive)), RuntimeException::class, 'Checksum do backup armazenado inválido.');
        $manifest = $this->validate($archive);
        throw_unless(empty($manifest['recovery_only']) && empty($manifest['integrity_issues']), RuntimeException::class, 'Backup contém divergências e está reservado à recuperação interna do estado anterior.');
        // Keep the restore source until its ZIP has been consumed, even if it is oldest.
        $safety = $this->create($user, 'safety', true, false);
        $this->audit($user, 'backup.restore_started', $source->id, ['safety_backup_id' => $safety->id]);
        $zip = new ZipArchive;
        $zip->open($archive);
        $storageStarted = false;
        $databaseCommitted = false;
        $journal = $this->recoveryDirectory().'/'.Str::uuid().'.json';
        File::ensureDirectoryExists(dirname($journal));
        $this->writeRecoveryJournal($journal, $source, $safety, 'prepared');
        try {
            $sqlite = DB::getDriverName() === 'sqlite';
            if ($sqlite) {
                DB::statement('PRAGMA defer_foreign_keys = ON');
            } else {
                Schema::disableForeignKeyConstraints();
            }

            try {
                DB::transaction(function () use ($zip, &$storageStarted, $journal, $source, $safety, $user) {
                    $tables = array_values(array_filter(
                        $this->currentDatabaseTables(),
                        // Restoring data must not rewind the ledger of the schema actually installed.
                        fn (string $table) => $this->logicalTableName($table) !== 'migrations'
                            && ! in_array($this->logicalTableName($table), self::EXCLUDED_TABLES, true)
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
                    $this->verifyRestoredForeignKeys($tables);
                    $this->writeRecoveryJournal($journal, $source, $safety, 'applying_files');
                    $storageStarted = true;
                    $this->restoreStorage($zip);
                    $source->update(['status' => 'restored']);
                    $this->audit($user, 'backup.restore_completed', $source->id, ['safety_backup_id' => $safety->id]);
                });
                $databaseCommitted = true;
            } finally {
                if ($sqlite) {
                    DB::statement('PRAGMA defer_foreign_keys = OFF');
                } else {
                    Schema::enableForeignKeyConstraints();
                }
            }
            $this->writeRecoveryJournal($journal, $source, $safety, 'completed');

            return $safety;
        } catch (Throwable $e) {
            if ($storageStarted && ! $databaseCommitted) {
                $recovery = new ZipArchive;
                $recoveryOpened = false;
                try {
                    $recoveryPath = Storage::disk(config('backup.disk'))->path($safety->path);
                    throw_unless(hash_equals($safety->sha256, hash_file('sha256', $recoveryPath)), RuntimeException::class, 'Checksum do backup de segurança armazenado inválido.');
                    $this->validate($recoveryPath);
                    throw_unless($recovery->open($recoveryPath) === true, RuntimeException::class, 'Backup de segurança indisponível.');
                    $recoveryOpened = true;
                    $this->restoreStorage($recovery);
                    $this->writeRecoveryJournal($journal, $source, $safety, 'rolled_back');
                } catch (Throwable $recoveryError) {
                    $this->audit($user, 'backup.restore_recovery_failed', $source->id, ['safety_backup_id' => $safety->id, 'journal' => $journal, 'error' => Str::limit($recoveryError->getMessage(), 500)]);
                    throw new RuntimeException("Falha ao recuperar arquivos. Preserve o backup de segurança #{$safety->id} e o registro $journal. ".$recoveryError->getMessage(), 0, $e);
                } finally {
                    if ($recoveryOpened) {
                        $recovery->close();
                    }
                }
            } elseif (! $databaseCommitted) {
                $this->writeRecoveryJournal($journal, $source, $safety, 'rolled_back');
            }
            $this->audit($user, 'backup.restore_failed', $source->id, ['safety_backup_id' => $safety->id, 'error' => Str::limit($e->getMessage(), 500)]);
            throw $e;
        } finally {
            $zip->close();
        }
    }

    public function applyRetention(): int
    {
        return Cache::lock('backup-retention', 120)->block(10, function () {
            throw_if($this->hasPendingRecovery(), RuntimeException::class, 'Retenção suspensa: existe recuperação pendente. Preserve os backups de segurança e os registros de recuperação.');
            $disk = Storage::disk(config('backup.disk'));
            $backups = Backup::whereIn('status', ['ready', 'restored'])->latest('id')->get();
            if ($backups->count() <= self::AUTOMATIC_RETENTION) {
                return 0;
            }
            // Never remove an older recovery point without four valid replacements.
            foreach ($backups->take(self::AUTOMATIC_RETENTION) as $backup) {
                throw_if(! empty($backup->manifest['recovery_only']), RuntimeException::class, 'Retenção suspensa: uma cópia recente preserva um estado divergente e não substitui um backup restaurável.');
                throw_unless($disk->exists($backup->path) && hash_equals($backup->sha256, hash_file('sha256', $disk->path($backup->path))), RuntimeException::class, 'Retenção suspensa: backup recente indisponível ou corrompido.');
                $this->validate($disk->path($backup->path));
            }
            $removed = 0;
            foreach ($backups->slice(self::AUTOMATIC_RETENTION) as $backup) {
                throw_unless(! $disk->exists($backup->path) || $disk->delete($backup->path), RuntimeException::class, 'Não foi possível remover o backup antigo.');
                $this->audit(null, 'backup.retention_deleted', $backup->id, ['kind' => $backup->kind, 'sha256' => $backup->sha256]);
                $backup->delete();
                $removed++;
            }

            return $removed;
        });
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
            $before = hash_file('sha256', $file->getPathname());
            throw_unless(File::copy($file->getPathname(), $target), RuntimeException::class, "Não foi possível copiar o arquivo $relative.");
            $checksums["storage/$relative"] = hash_file('sha256', $target);
            throw_unless(hash_equals($before, $checksums["storage/$relative"]) && hash_equals($before, hash_file('sha256', $file->getPathname())), RuntimeException::class, "Arquivo alterado durante o backup: $relative.");
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
            $content = $zip->getFromIndex($i);
            throw_unless(is_string($content) && File::put($target, $content) !== false && hash_equals(hash('sha256', $content), hash_file('sha256', $target)), RuntimeException::class, "Não foi possível preparar o arquivo $relative.");
            $snapshotFiles[] = $relative;
        }
        $completed = false;
        try {
            // The ZIP is a snapshot of the managed private domain, not an additive patch.
            // Framework state, logs, backups and temporary recovery data are deliberately excluded.
            foreach (File::allFiles($root) as $file) {
                $relative = str_replace('\\', '/', $file->getRelativePathname());
                if ($this->managedPrivateFile($relative) && ! in_array($relative, $snapshotFiles, true)) {
                    throw_unless(File::delete($file->getPathname()), RuntimeException::class, "Não foi possível substituir o arquivo $relative.");
                }
            }
            foreach (File::allFiles($staging) as $file) {
                $relative = str_replace('\\', '/', $file->getRelativePathname());
                $target = "$root/$relative";
                File::ensureDirectoryExists(dirname($target));
                throw_unless(File::copy($file->getPathname(), $target) && hash_equals(hash_file('sha256', $file->getPathname()), hash_file('sha256', $target)), RuntimeException::class, "Não foi possível restaurar o arquivo $relative.");
            }
            $completed = true;
        } finally {
            if ($completed) {
                File::deleteDirectory($staging);
            }
        }
    }

    private function writeRecoveryJournal(string $path, Backup $source, Backup $safety, string $state): void
    {
        $content = json_encode(['state' => $state, 'source_backup_id' => $source->id, 'safety_backup_id' => $safety->id, 'safety_path' => $safety->path, 'safety_sha256' => $safety->sha256, 'updated_at' => now()->toIso8601String()], JSON_THROW_ON_ERROR);
        throw_unless(File::put($path, $content) !== false, RuntimeException::class, 'Não foi possível gravar o registro de recuperação.');
    }

    private function recoveryDirectory(): string
    {
        return config('backup.recovery_directory', storage_path('app/restore-recovery'));
    }

    private function verifyRestoredForeignKeys(array $tables): void
    {
        if (DB::getDriverName() === 'sqlite') {
            throw_unless(DB::select('PRAGMA foreign_key_check') === [], RuntimeException::class, 'Restauração contém relacionamentos inválidos.');

            return;
        }
        foreach ($tables as $table) {
            foreach (Schema::getForeignKeys($table) as $key) {
                throw_unless(($key['foreign_schema'] ?? DB::getDatabaseName()) === DB::getDatabaseName(), RuntimeException::class, 'Relacionamento fora do banco configurado.');
                $query = DB::table($table.' as backup_child')->leftJoin($key['foreign_table'].' as backup_parent', function ($join) use ($key) {
                    foreach ($key['columns'] as $index => $column) {
                        $join->on('backup_child.'.$column, '=', 'backup_parent.'.$key['foreign_columns'][$index]);
                    }
                });
                foreach ($key['columns'] as $column) {
                    $query->whereNotNull('backup_child.'.$column);
                }
                throw_if($query->whereNull('backup_parent.'.$key['foreign_columns'][0])->exists(), RuntimeException::class, 'Restauração contém relacionamentos inválidos em '.$this->logicalTableName($table).'.');
            }
        }
    }

    private function hasPendingRecovery(): bool
    {
        foreach (glob($this->recoveryDirectory().'/*.json') ?: [] as $path) {
            $journal = json_decode(File::get($path), true);
            if (! is_array($journal) || ! in_array($journal['state'] ?? null, ['completed', 'rolled_back'], true)) {
                return true;
            }
        }

        return false;
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
            && ! in_array('.', $segments, true)
            && ! str_contains($normalized, '//')
            && ! preg_match('/(^|\/)\.env($|\/)|\.php$/i', $normalized);
    }

    private function managedPrivateFile(string $relative): bool
    {
        $relative = str_replace('\\', '/', $relative);

        return $this->safeEntry($relative)
            && ! str_starts_with($relative, config('backup.directory').'/')
            && ! str_starts_with($relative, 'backup-work/')
            && ! str_starts_with($relative, 'restore-staging/')
            && ! str_starts_with($relative, 'restore-recovery/')
            && ! str_starts_with($relative, 'framework/')
            && ! str_starts_with($relative, 'logs/');
    }

    private function logicalTableName(string $table): string
    {
        return Str::afterLast($table, '.');
    }

    private function currentDatabaseTables(): array
    {
        // Laravel may list every accessible MySQL schema when no schema is given.
        // A backup and restore must only touch the configured application database.
        return Schema::getTableListing(Schema::getCurrentSchemaListing());
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
