<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\BackupService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BackupDatabaseIsolationTest extends TestCase
{
    public function test_backup_restore_does_not_read_or_change_another_accessible_schema(): void
    {
        $originalConnection = DB::getDefaultConnection();
        config(['database.connections.backup_isolation' => ['driver' => 'sqlite', 'database' => ':memory:', 'foreign_key_constraints' => true]]);
        DB::setDefaultConnection('backup_isolation');
        Storage::fake('local');
        config(['backup.disk' => 'local']);

        try {
            Artisan::call('migrate', ['--database' => 'backup_isolation', '--force' => true]);
            $this->seed(DatabaseSeeder::class);
            $master = User::create(['role_id' => Role::where('name', 'Master')->value('id'), 'name' => 'Master isolado', 'login' => 'backup-isolation', 'password' => 'Senha#Forte123', 'active' => true]);
            DB::statement("ATTACH DATABASE ':memory:' AS unrelated");
            DB::statement('CREATE TABLE unrelated.clients (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');
            DB::table('unrelated.clients')->insert(['id' => 1, 'name' => 'Dados de outra aplicação']);

            $service = app(BackupService::class);
            $backup = $service->create($master, 'manual', true);
            $manifest = $service->validate(Storage::disk('local')->path($backup->path));
            $this->assertSame(0, $manifest['clients']);
            Schema::create('newer_schema_table', fn ($table) => $table->id());
            DB::table('migrations')->insert(['migration' => 'newer_schema_marker', 'batch' => 999]);
            $service->restore($backup, $master);
            $this->assertSame('Dados de outra aplicação', DB::table('unrelated.clients')->where('id', 1)->value('name'));
            $this->assertSame(0, DB::table('clients')->count());
            $this->assertTrue(Schema::hasTable('newer_schema_table'));
            $this->assertTrue(DB::table('migrations')->where('migration', 'newer_schema_marker')->exists());
        } finally {
            DB::setDefaultConnection($originalConnection);
            DB::purge('backup_isolation');
        }
    }
}
