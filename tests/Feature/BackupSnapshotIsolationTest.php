<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\BackupService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;
use ZipArchive;

class BackupSnapshotIsolationTest extends TestCase
{
    public function test_concurrent_committed_write_cannot_mix_table_versions_in_backup(): void
    {
        $original = DB::getDefaultConnection();
        $suffix = str_replace('-', '', (string) Str::uuid());
        $snapshotConnection = 'backup_snapshot_'.$suffix;
        $writerConnection = 'backup_writer_'.$suffix;
        $settings = config('database.connections.'.$original);
        if ($settings['driver'] === 'sqlite') {
            $path = storage_path('framework/testing/backup-snapshot-'.$suffix.'.sqlite');
            File::ensureDirectoryExists(dirname($path));
            File::put($path, '');
            $settings['database'] = $path;
        }
        config(['database.connections.'.$snapshotConnection => $settings, 'database.connections.'.$writerConnection => $settings]);
        DB::setDefaultConnection($snapshotConnection);
        Storage::fake('local');
        config(['backup.disk' => 'local']);
        $baselineIds = [];
        $fixtureTables = [];
        try {
            if ($settings['driver'] === 'sqlite') {
                DB::statement('PRAGMA journal_mode = WAL');
                Artisan::call('migrate', ['--database' => $snapshotConnection, '--force' => true]);
            }
            foreach (['notifications', 'audit_logs', 'backups', 'users', 'roles'] as $table) {
                $baselineIds[$table] = DB::table($table)->pluck('id')->all();
            }
            $role = Role::create(['name' => 'Snapshot '.$suffix, 'permissions' => ['*']]);
            $master = User::create(['role_id' => $role->id, 'name' => 'Snapshot synthetic', 'login' => 'backup-'.$suffix, 'password' => 'Senha#Forte123', 'active' => true]);
            $first = 'backup_snapshot_a_'.$suffix;
            $last = 'backup_snapshot_z_'.$suffix;
            foreach ([$first, $last] as $table) {
                Schema::create($table, function ($blueprint) {
                    $blueprint->id();
                    $blueprint->string('version');
                });
                $fixtureTables[] = $table;
                DB::table($table)->insert(['id' => 1, 'version' => 'before']);
            }
            $committed = false;
            DB::listen(function ($query) use (&$committed, $first, $last, $writerConnection) {
                if (! $committed && str_starts_with($query->sql, 'select * from ') && str_contains($query->sql, $first)) {
                    $committed = true;
                    DB::connection($writerConnection)->transaction(function () use ($writerConnection, $first, $last) {
                        foreach ([$first, $last] as $table) {
                            DB::connection($writerConnection)->table($table)->where('id', 1)->update(['version' => 'after']);
                        }
                    });
                }
            });
            $backup = app(BackupService::class)->create($master, retain: false);
            $this->assertTrue($committed);
            $zip = new ZipArchive;
            $zip->open(Storage::disk('local')->path($backup->path));
            try {
                foreach ([$first, $last] as $table) {
                    $rows = json_decode($zip->getFromName('database/'.$table.'.json'), true, flags: JSON_THROW_ON_ERROR);
                    $this->assertSame('before', $rows[0]['version']);
                    $this->assertSame(1, $backup->manifest['counts'][$table]);
                    $this->assertSame('after', DB::table($table)->where('id', 1)->value('version'));
                }
            } finally {
                $zip->close();
            }
        } finally {
            try {
                // Only UUID fixture tables and rows created by this serial test are removed.
                // Existing seed rows are neither reseeded nor changed.
                foreach ($fixtureTables as $table) {
                    Schema::drop($table);
                }
                foreach ($baselineIds as $table => $before) {
                    $created = array_values(array_diff(DB::table($table)->pluck('id')->all(), $before));
                    if ($created) {
                        DB::table($table)->whereIn('id', $created)->delete();
                    }
                    $this->assertSame($before, DB::table($table)->pluck('id')->all(), "Test leaked rows into $table.");
                }
            } finally {
                DB::setDefaultConnection($original);
                DB::purge($snapshotConnection);
                DB::purge($writerConnection);
            }
        }
    }
}
