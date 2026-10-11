<?php

use App\Models\ServiceOrder;
use App\Services\DocumentService;
use App\Services\ReplacedFinalDocumentService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

// A disposable process fixture; never uses the application's configured database.
require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
[$script, $database, $storage] = $argv;
config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => $database, 'filesystems.disks.local.root' => $storage]);
DB::purge();
Storage::forgetDisk('local');
$db = DB::connection();
$db->statement('CREATE TABLE service_orders (id INTEGER PRIMARY KEY, number TEXT, deleted_at TEXT)');
$db->statement('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
$db->statement('CREATE TABLE audit_logs (id INTEGER PRIMARY KEY, user_id INTEGER, action TEXT, subject_type TEXT, subject_id INTEGER, before TEXT, after TEXT, ip_address TEXT, created_at TEXT)');
$db->statement('CREATE TABLE generated_documents (id INTEGER PRIMARY KEY, service_order_id INTEGER, type TEXT, revision INTEGER, path TEXT, sha256 TEXT, snapshot TEXT, issued_at TEXT, issued_by INTEGER, created_at TEXT, updated_at TEXT, UNIQUE(service_order_id,type,revision))');
$db->table('service_orders')->insert(['id' => 1, 'number' => '0000001']);
$db->table('users')->insert(['id' => 1, 'name' => 'Crash fixture']);
$disk = Storage::disk('local');
$path = 'documents/orders/1/final-r1.pdf';
$bytes = '%PDF historical crash fixture';
$disk->put($path, $bytes);
$db->table('generated_documents')->insert(['id' => 1, 'service_order_id' => 1, 'type' => 'final', 'revision' => 1, 'path' => $path, 'sha256' => hash('sha256', $bytes), 'snapshot' => '{}', 'issued_at' => now(), 'issued_by' => 1, 'created_at' => now(), 'updated_at' => now()]);
$wrapped = Mockery::mock($disk);
$wrapped->shouldReceive('delete')->with($path)->andReturnUsing(function () use ($disk, $path): never {
    if (! $disk->delete($path)) {
        exit(80);
    }
    // Real process interruption after deleting the old path, before DB commit.
    exit(79);
});
Storage::shouldReceive('disk')->with('local')->andReturn($wrapped);
$documents = new class extends DocumentService
{
    public function render(string $type, array $snapshot): string
    {
        return '%PDF lightweight crash record';
    }
};
(new ReplacedFinalDocumentService($documents))->replacePrevious(ServiceOrder::findOrFail(1), 1, 2, 1, null);
exit(81);
