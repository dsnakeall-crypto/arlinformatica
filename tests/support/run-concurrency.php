<?php

use App\Models\Client;
use App\Models\Role;
use App\Models\ServiceOrder;
use App\Models\User;
use App\Services\ExpenseControl;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$original = DB::connection();
if ($original->getDatabaseName() !== 'arl_informatica' || ! in_array($original->getConfig('host'), ['127.0.0.1', 'localhost'], true)) {
    throw new RuntimeException('Unexpected local connection.');
}
$artifactDir = dirname(__DIR__, 2).'/output/homologacao-geral';
if (! is_dir($artifactDir)) {
    mkdir($artifactDir, 0755, true);
}
$name = 'arl_test_races_'.date('Ymd_His');
if (! preg_match('/^arl_test_races_[0-9_]+$/', $name)) {
    throw new RuntimeException('Invalid test database.');
}
if ($original->table('information_schema.SCHEMATA')->where('SCHEMA_NAME', $name)->exists()) {
    throw new RuntimeException('Test database exists.');
}
$original->statement('CREATE DATABASE `'.$name.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
try {
    config(['database.connections.sim_races' => [...config('database.connections.mysql'), 'database' => $name], 'database.default' => 'sim_races', 'filesystems.disks.local.root' => storage_path('framework/testing/races-private')]);
    Storage::forgetDisk('local');
    Artisan::call('migrate', ['--force' => true]);
    Artisan::call('db:seed', ['--force' => true, '--class' => DatabaseSeeder::class]);
    $db = DB::connection();
    $user = User::create(['name' => 'Race test', 'login' => 'race', 'password' => 'Fake#2026!', 'role_id' => Role::where('name', 'Master')->value('id'), 'active' => true]);
    $client = Client::create(['name' => 'Fictitious race client', 'document' => '52998224725', 'phone' => '35999999999', 'postal_code' => '37160000', 'street' => 'Fictitious', 'number' => '1', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG']);
    $orders = [];
    foreach ([1, 2, 3] as $i) {
        $orders[] = ServiceOrder::create(['number' => '000000'.$i, 'client_id' => $client->id, 'equipment_type_id' => $db->table('equipment_types')->value('id'), 'attendance_type' => 'bench', 'status' => 'analysis', 'reported_problem' => 'Concurrent test', 'received_at' => now(), 'created_by' => $user->id, 'total_cents' => 5000])->id;
    }
    $product = fn ($name, $stock) => $db->table('service_catalog')->insertGetId(['name' => $name, 'category' => 'product', 'price_cents' => 10000, 'stock_quantity' => $stock, 'active' => true, 'warranty_enabled' => false, 'created_at' => now(), 'updated_at' => now()]);
    $gift = $product('Gift race', 0);
    $sale = $product('Last unit race', 1);
    $bank = $db->table('cg_institutions')->insertGetId(['name' => 'Race bank', 'color' => '#123456', 'due_day' => 10, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
    $type = $db->table('cg_types')->insertGetId(['name' => 'Race type', 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
    $request = Request::create('/simulation', 'POST');
    $request->setUserResolver(fn () => $user);
    $debt = app(ExpenseControl::class)->createDebt($request, ['request_key' => (string) Str::uuid(), 'institution_id' => $bank, 'type_id' => $type, 'name' => 'Race debt', 'recurrence' => 'once', 'responsibility' => 'shared', 'percent_one' => 50, 'amount_cents' => 10000, 'installment_count' => 1, 'first_number' => 1, 'start_month' => '2026-10', 'due_day' => 10, 'notes' => null]);
    $installment = $db->table('cg_installments')->where('debt_id', $debt)->value('id');
    $common = ['user' => $user->id];
    $cases = [
        'gift' => [...$common, 'case' => 'gift', 'product' => $gift, 'payload' => ['request_key' => (string) Str::uuid(), 'origin' => 'gift', 'unit_cost_cents' => 0]],
        'sale' => [...$common, 'case' => 'sale', 'product' => $sale, 'orders' => [$orders[0], $orders[1]]],
        'expense' => [...$common, 'case' => 'expense', 'keys' => [(string) Str::uuid(), (string) Str::uuid()], 'payload' => ['installment_ids' => [$installment], 'kind' => 'payment', 'target' => 'both', 'paid_by' => 1, 'occurred_on' => '2026-10-03', 'amount_cents' => null, 'notes' => null]],
        'order_cross_key' => [...$common, 'case' => 'order_cross_key', 'orders' => [$orders[0], $orders[1]], 'payload' => ['idempotency_key' => 'cross-order-key', 'amount_cents' => 1000, 'method' => 'pix']],
        'order_payment' => [...$common, 'case' => 'order_payment', 'order' => $orders[2], 'payload' => ['idempotency_key' => 'concurrent-same-key', 'amount_cents' => 1000, 'method' => 'pix']],
    ];
    $env = getenv();
    foreach (['host' => 'DB_HOST', 'port' => 'DB_PORT', 'username' => 'DB_USERNAME', 'password' => 'DB_PASSWORD'] as $key => $var) {
        $env[$var] = (string) $original->getConfig($key);
    }
    $env['APP_ENV'] = 'testing';
    $env['DB_CONNECTION'] = 'mysql';
    $env['DB_DATABASE'] = $name;
    $env['APP_KEY'] = (string) config('app.key');
    $env['PRIVATE_STORAGE_PATH'] = storage_path('framework/testing/races-private');
    $env['CACHE_STORE'] = 'array';
    $env['SESSION_DRIVER'] = 'array';
    $env['MISTRAL_API_KEY'] = '';
    $env['MISTRAL_EXPENSE_PHOTO_ENABLED'] = 'false';
    $env['GEMINI_API_KEY'] = '';
    $env['GEMINI_EXPENSE_PHOTO_ENABLED'] = 'false';
    $results = [];
    foreach ($cases as $case => $input) {
        $path = $artifactDir.'/race-'.$case.'.json';
        file_put_contents($path, json_encode($input, JSON_THROW_ON_ERROR));
        if (is_file($path.'.go')) {
            unlink($path.'.go');
        }
        foreach ([0, 1] as $n) {
            if (is_file($path.'.ready-'.$n)) {
                unlink($path.'.ready-'.$n);
            }
        }
        $db->beginTransaction();
        if ($case === 'order_cross_key') {
            $db->table('service_orders')->whereIn('id', [$orders[0], $orders[1]])->orderBy('id')->lockForUpdate()->get();
        } elseif ($case === 'order_payment') {
            $db->table('service_orders')->where('id', $orders[2])->lockForUpdate()->first();
        } elseif (in_array($case, ['sale', 'gift'], true)) {
            $db->table('service_catalog')->where('id', $input['product'])->lockForUpdate()->first();
        } else {
            $db->table('cg_debts')->where('id', $debt)->lockForUpdate()->first();
        }
        $workers = [];
        foreach ([0, 1] as $n) {
            $proc = proc_open([PHP_BINARY, 'tests/support/concurrency-worker.php', $path, (string) $n], [0 => ['pipe', 'r'], 1 => ['file', $artifactDir.'/race-'.$case.'-'.$n.'.out', 'w'], 2 => ['file', $artifactDir.'/race-'.$case.'-'.$n.'.err', 'w']], $pipes, dirname(__DIR__, 2), $env);
            if (! is_resource($proc)) {
                throw new RuntimeException('Worker launch failed.');
            }
            fclose($pipes[0]);
            $workers[] = $proc;
        }
        $deadline = microtime(true) + 20;
        while (! is_file($path.'.ready-0') || ! is_file($path.'.ready-1')) {
            if (microtime(true) > $deadline) {
                throw new RuntimeException('Worker boot timed out.');
            }usleep(10000);
        }
        file_put_contents($path.'.go', 'go');
        usleep(750000);
        $db->commit();
        foreach ($workers as $proc) {
            if (proc_close($proc) !== 0) {
                throw new RuntimeException('Worker crashed.');
            }
        }
        $statuses = [];
        foreach ([0, 1] as $n) {
            $out = json_decode(trim(file_get_contents($artifactDir.'/race-'.$case.'-'.$n.'.out')), true, 512, JSON_THROW_ON_ERROR);
            $statuses[] = $out['status'];
        }
        sort($statuses);
        $pass = match ($case) {
            'gift' => $statuses === [200, 200] && (int) $db->table('service_catalog')->where('id', $gift)->value('stock_quantity') === 3 && $db->table('stock_movements')->where('product_id', $gift)->count() === 1,
            'sale' => $statuses === [201, 422] && (int) $db->table('service_catalog')->where('id', $sale)->value('stock_quantity') === 0,
            'expense' => $statuses === [201, 422] && (int) $db->table('cg_entries')->where('installment_id', $installment)->sum('amount_cents') === 10000,
            'order_cross_key' => $statuses === [201, 409] && $db->table('payments')->where('idempotency_key', 'cross-order-key')->count() === 1,
            default => $statuses === [200, 201] && $db->table('payments')->where('service_order_id', $orders[2])->count() === 1,
        };
        $results[$case] = ['statuses' => $statuses, 'passed' => $pass];
        echo $case.': '.json_encode($results[$case]).PHP_EOL;
    }
    file_put_contents($artifactDir.'/concurrency-results-fixed.json', json_encode($results, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
    $failed = count(array_filter($results, fn ($result) => ! $result['passed']));
} finally {
    if (isset($db) && $db->transactionLevel()) {
        $db->rollBack();
    }
    $original->statement('DROP DATABASE `'.$name.'`');
}

exit(($failed ?? 1) > 0 ? 1 : 0);
