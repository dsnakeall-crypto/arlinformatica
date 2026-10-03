<?php

use App\Http\Controllers\FinanceController;
use App\Models\ServiceOrder;
use App\Models\User;
use App\Services\Audit;
use App\Services\ExpenseControl;
use App\Services\InventoryService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (! app()->environment('testing') || DB::connection()->getDriverName() !== 'mysql' || ! preg_match('/^arl_test_races_[0-9_]+$/', DB::connection()->getDatabaseName())) {
    throw new RuntimeException('Concurrent tests require the dedicated disposable database.');
}
$input = json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR);
$worker = (int) $argv[2];
$request = Request::create('/simulation', 'POST', $input['payload'] ?? []);
$user = User::findOrFail($input['user']);
$request->setUserResolver(fn () => $user);
app()->instance('request', $request);
Auth::setUser($user);
$request->setUserResolver(fn () => $user);
file_put_contents($argv[1].'.ready-'.$worker, 'ready');
$deadline = microtime(true) + 20;
while (! is_file($argv[1].'.go')) {
    if (microtime(true) > $deadline) {
        throw new RuntimeException('Barrier timed out.');
    }
    usleep(10000);
}
try {
    if ($input['case'] === 'gift') {
        app(InventoryService::class)->addStock($input['product'], 3, 'Concurrent gift', $user->id, $input['payload']);
        $status = 200;
    } elseif ($input['case'] === 'sale') {
        DB::transaction(function () use ($input, $worker, $user) {
            $order = ServiceOrder::whereKey($input['orders'][$worker])->lockForUpdate()->firstOrFail();
            $items = app(InventoryService::class)->syncActiveOrderItems($order, [['catalog_id' => $input['product'], 'quantity' => 1]], $user->id, 'Concurrent sale');
            $order->items()->createMany($items);
        });
        $status = 201;
    } elseif ($input['case'] === 'expense') {
        $payload = $input['payload'];
        $payload['request_key'] = $input['keys'][$worker];
        app(ExpenseControl::class)->record($request, $payload, app(Audit::class));
        $status = 201;
    } else {
        $order = ServiceOrder::findOrFail($input['orders'][$worker] ?? $input['order']);
        $response = app(FinanceController::class)->pay($request, $order);
        $status = $response->getStatusCode();
    }
    echo json_encode(['status' => $status, 'success' => true], JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    $status = $error instanceof ValidationException ? 422 : ($error instanceof HttpException ? $error->getStatusCode() : 500);
    echo json_encode(['status' => $status, 'success' => false, 'error_class' => get_class($error), 'message' => $error->getMessage(), 'file' => basename($error->getFile()), 'line' => $error->getLine()], JSON_THROW_ON_ERROR);
}
