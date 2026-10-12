<?php

use App\Models\Role;
use App\Models\User;
use App\Services\ExpenseControl;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;

// Run explicitly against a dedicated, migrated local MySQL database; never included in SQLite suites.
require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (DB::connection()->getDriverName() !== 'mysql' || ! preg_match('/(?:^|_)test(?:_|$)/i', DB::connection()->getDatabaseName()) || config('database.connections.mysql.host') !== '127.0.0.1') {
    throw new RuntimeException('Explicit isolated local MySQL test required.');
}
$datadir = preg_replace('~/+~', '/', str_replace('\\', '/', DB::selectOne('SELECT @@datadir AS dir')->dir));
if (! str_contains($datadir, 'ARL-backups/missao-final-mysql-20261011/data')) {
    throw new RuntimeException('Unexpected MySQL datadir.');
}
$users = [];
for ($n = 0; $n < 2; $n++) {
    $users[] = User::create(['name' => 'Concurrency fixture', 'login' => Str::uuid(), 'password' => 'Fixture#123', 'active' => true, 'role_id' => Role::where('name', 'Master')->value('id')]);
}
$bank = DB::table('cg_institutions')->insertGetId(['name' => 'Concurrent '.Str::uuid(), 'due_day' => 10, 'active' => true, 'color' => '#123456', 'created_at' => now(), 'updated_at' => now()]);
$type = DB::table('cg_types')->insertGetId(['name' => 'Concurrent '.Str::uuid(), 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
$service = app(ExpenseControl::class);
$request = Request::create('/fixture', 'POST');
$request->setUserResolver(fn () => $users[0]);
$id = $service->createDebt($request, ['request_key' => (string) Str::uuid(), 'institution_id' => $bank, 'type_id' => $type, 'name' => 'Concurrent shared', 'recurrence' => 'once', 'responsibility' => 'shared', 'percent_one' => 70, 'amount_cents' => 10000, 'installment_count' => 1, 'first_number' => 1, 'start_month' => '2026-10', 'due_day' => 10, 'notes' => null]);
$planData = ['debt_id' => $id, 'target' => 'one', 'action' => 'partial', 'month' => '2026-10', 'amount_cents' => 5000];
$plan = $service->personDebtPlan($planData);
$dir = storage_path('framework/testing/concurrency-'.Str::uuid());
mkdir($dir, 0777, true);
$workers = [];
$replay = ($argv[1] ?? '') === 'replay';
$ledgerOnly = ($argv[1] ?? '') === 'ledger';
$sharedKey = (string) Str::uuid();
if ($replay) {
    $users = [$users[0], $users[0]];
}
DB::beginTransaction();
DB::table('cg_debts')->where('id', $id)->lockForUpdate()->first();
try {
    foreach ($users as $n => $user) {
        $payload = ['user_id' => $user->id, 'ledger_only' => $ledgerOnly, 'payment' => [...$planData, 'request_key' => $replay ? $sharedKey : (string) Str::uuid(), 'preview_hash' => $plan['preview_hash'], 'kind' => 'payment', 'paid_by' => 1, 'occurred_on' => '2026-10-12']];
        $path = $dir.'/worker-'.$n.'.json';
        file_put_contents($path, json_encode($payload));
        $worker = new Process([PHP_BINARY, __DIR__.'/expense-payment-worker.php', $path], dirname(__DIR__, 2));
        $worker->setTimeout(20);
        $worker->start();
        $workers[] = $worker;
    }
    $deadline = microtime(true) + 10;
    while (microtime(true) < $deadline && count(array_filter($workers, fn ($w) => str_contains($w->getOutput(), $replay ? 'START' : 'READY'))) < 2) {
        usleep(10000);
    }
    if (count(array_filter($workers, fn ($w) => str_contains($w->getOutput(), $replay ? 'START' : 'READY'))) !== 2) {
        throw new RuntimeException('Workers did not overlap: '.implode(';', array_map(fn ($w) => $w->getErrorOutput(), $workers)));
    }
    DB::commit();
    $statuses = [];
    foreach ($workers as $worker) {
        $worker->wait();
        echo $worker->getOutput();
        if (! $worker->isSuccessful()) {
            throw new RuntimeException($worker->getErrorOutput());
        }foreach (explode("\n", trim($worker->getOutput())) as $line) {
            if (str_starts_with($line, '{')) {
                $statuses[] = json_decode($line, true)['status'];
            }
        }
    }
    sort($statuses);
    $credit = (int) DB::table('cg_entries')->whereIn('installment_id', DB::table('cg_installments')->where('debt_id', $id)->pluck('id'))->sum('credit_one_cents');
    echo 'statuses='.json_encode($statuses).' credit_one='.$credit."\n";
    if (($replay ? $statuses !== [201, 201] : ! in_array($statuses, [[201, 409], [201, 422]], true)) || $credit !== 5000) {
        throw new RuntimeException('Concurrent stale preview overpayment detected');
    }
    echo $replay ? "PASS: overlapping same request replays, only one payment, no duplicate.\n" : "PASS: independent users overlap, one payment, stale preview rejected, no overpayment.\n";
} finally {
    if (DB::transactionLevel() > 0) {
        DB::rollBack();
    }foreach ($workers as $worker) {
        if ($worker->isRunning()) {
            $worker->stop();
        }
    }
}
