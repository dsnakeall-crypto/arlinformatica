<?php
require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Illuminate\Support\Facades\DB;
if (DB::connection()->getDriverName() !== 'mysql' || !preg_match('/(?:^|_)test(?:_|$)/i', DB::connection()->getDatabaseName())) {
    throw new RuntimeException('Worker exige MySQL de teste.');
}
$fixture = json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR);
// Ledger-only mode removes incidental notification FK locks to validate payment serialization itself.
if ($fixture['ledger_only'] ?? false) {
    $app->instance(App\Services\ExpenseNotifications::class, new class extends App\Services\ExpenseNotifications {
        public function operation(Illuminate\Http\Request $request, int $id): void {}
    });
}
$request = Illuminate\Http\Request::create('/fixture', 'POST');
$user = App\Models\User::findOrFail($fixture['user_id']);
$request->setUserResolver(fn () => $user);
DB::listen(function ($query) {
    if (str_contains($query->sql, 'cg_operations') && str_starts_with($query->sql, 'select')) { echo "READY\n"; flush(); }
});
echo "START\n"; flush();
try {
    $result = app(App\Services\ExpenseControl::class)->record($request, $fixture['payment'], app(App\Services\Audit::class));
    echo json_encode(['status' => 201, 'result' => $result])."\n";
} catch (Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $error) {
    echo json_encode(['status' => $error->getStatusCode(), 'message' => $error->getMessage()])."\n";
} catch (Throwable $error) { fwrite(STDERR, (string) $error); exit(1); }
