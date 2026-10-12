<?php

use App\Models\User;
use App\Services\Audit;
use App\Services\ExpenseControl;
use App\Services\ExpenseNotifications;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (DB::connection()->getDriverName() !== 'mysql' || ! preg_match('/(?:^|_)test(?:_|$)/i', DB::connection()->getDatabaseName())) {
    throw new RuntimeException('Worker exige MySQL de teste.');
}
$fixture = json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR);
// Ledger-only mode removes incidental notification FK locks to validate payment serialization itself.
if ($fixture['ledger_only'] ?? false) {
    $app->instance(ExpenseNotifications::class, new class extends ExpenseNotifications
    {
        public function operation(Request $request, int $id): void {}
    });
}
$request = Request::create('/fixture', 'POST');
$user = User::findOrFail($fixture['user_id']);
$request->setUserResolver(fn () => $user);
DB::listen(function ($query) {
    if (str_contains($query->sql, 'cg_operations') && str_starts_with($query->sql, 'select')) {
        echo "READY\n";
        flush();
    }
});
echo "START\n";
flush();
try {
    $result = app(ExpenseControl::class)->record($request, $fixture['payment'], app(Audit::class));
    echo json_encode(['status' => 201, 'result' => $result])."\n";
} catch (HttpExceptionInterface $error) {
    echo json_encode(['status' => $error->getStatusCode(), 'message' => $error->getMessage()])."\n";
} catch (Throwable $error) {
    fwrite(STDERR, (string) $error);
    exit(1);
}
