<?php

// Full code-only publication in an owned disposable filesystem. All HTTP is mocked; no database or SSH.
declare(strict_types=1);
define('ARL_DEPLOY_LIBRARY_ONLY', true);
require __DIR__.'/publish-laragon-final.php';

function runFixture(string $runner, array $config, string $input, bool $fail = false): array
{
    $environment = getenv();
    $environment['ARL_EIGHT_CONFIG'] = base64_encode(json_encode($config, JSON_THROW_ON_ERROR));
    $environment['ARL_FIXTURE_FAIL'] = $fail ? '1' : '0';
    $process = proc_open([PHP_BINARY, $runner], [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']], $pipes, null, $environment);
    arlCheck(is_resource($process), 'FIXTURE_PROCESS_FAILED');
    fwrite($pipes[0], $input);
    fclose($pipes[0]);
    $output = stream_get_contents($pipes[1]);
    $error = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exit = proc_close($process);
    arlCheck($error === '', 'FIXTURE_STDERR');
    $events = array_map(fn ($line) => json_decode($line, true, 512, JSON_THROW_ON_ERROR), array_filter(explode("\n", trim($output))));

    return [$exit, $events];
}

foreach ([false, true] as $fail) {
    $root = sys_get_temp_dir().'/arl-publication-integration-'.bin2hex(random_bytes(6));
    arlCheck(mkdir($root, 0700, true), 'FIXTURE_DIRECTORY_FAILED');
    $root = realpath($root);
    $prior = '5c8885f6cf50757255938a39e1325bb9e91037cc';
    $release = str_repeat('b', 40);
    $e90 = $root.'/arl-informatica-stage-e90f11f-20261011/ARL-e90f11f';
    $old = $root.'/arl-oito-'.$prior.'/ARL-'.$prior;
    $new = $root.'/arl-oito-'.$release.'/ARL-'.$release;
    $former = $root.'/arl-informatica-9702fa1dd0e86889a11db8e6136b327969083f95';
    $www = $root.'/www';
    $pointer = $root.'/arl-current-e90f11f';
    $lock = $root.'/arl-private/deployment.lock';
    foreach ([$old.'/database/migrations', dirname($lock), $www.'/build', $root.'/arl-private/storage'] as $directory) {
        arlCheck(mkdir($directory, 0700, true), 'FIXTURE_DIRECTORY_FAILED');
    }
    file_put_contents($lock, '');
    file_put_contents($root.'/arl-private/.env', 'PRIVATE_FIXTURE_ENV');
    arlCheck(symlink($root.'/arl-private/.env', $old.'/.env'), 'FIXTURE_ENV_LINK');
    file_put_contents($root.'/arl-private/storage/upload.txt', 'PRIVATE_UPLOAD_SENTINEL');
    arlCheck(symlink($root.'/arl-private/storage', $old.'/storage'), 'FIXTURE_STORAGE_LINK');
    arlPointer($pointer, $old);
    $shared = arlSharedVersions($pointer, [$old => $prior]);
    $lockCode = '$arlLock=fopen('.var_export($lock, true).',"rb");if(!$arlLock||!flock($arlLock,LOCK_SH)){http_response_code(503);exit;}'."\n";
    $aliases = ['index.php' => "<?php\n".$lockCode.$shared, 'cron-scheduler.php' => "<?php\n".'if(empty($_SERVER["HTTP_X_CRON_AUTH"])){http_response_code(403);exit;}'."\n".$lockCode.$shared, 'sw.js' => 'PREVIOUS_SW', 'build/manifest.json' => '{}'];
    $baseline = ['release' => $prior, 'root' => $old, 'lock' => $lock, 'aliases' => []];
    foreach ($aliases as $name => $bytes) {
        file_put_contents($www.'/'.$name, $bytes);
        $baseline['aliases'][$name] = ['sha256' => hash('sha256', $bytes), 'data' => base64_encode($bytes)];
    }
    $files = ['vendor/autoload.php' => '<?php', 'bootstrap/app.php' => '<?php', 'public/index.php' => '<?php', 'public/sw.js' => 'NEW_SW', 'public/build/assets/main-fixture.js' => 'NEW_MAIN', 'public/build/assets/expense-fixture.js' => 'NEW_EXPENSE', 'public/build/assets/appearance-fixture.js' => 'NEW_APPEARANCE', 'database/migrations/fixture.php' => '<?php // no SQL'];
    file_put_contents($old.'/database/migrations/fixture.php', $files['database/migrations/fixture.php']);
    $files['public/build/manifest.json'] = json_encode(['resources/js/main.tsx' => ['file' => 'assets/main-fixture.js'], 'resources/js/appearance.ts' => ['file' => 'assets/appearance-fixture.js'], '_expense-fixture.js' => ['file' => 'assets/expense-fixture.js', 'name' => 'expense-control-page', 'isDynamicEntry' => true]], JSON_THROW_ON_ERROR);
    $files['.release.json'] = json_encode(['release' => $release, 'schema_changes' => false, 'files' => array_map(fn ($bytes) => hash('sha256', $bytes), $files)], JSON_THROW_ON_ERROR);
    $zipPath = $root.'/fixture-package.zip';
    $zip = new ZipArchive;
    arlCheck($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::EXCL) === true, 'FIXTURE_ZIP_FAILED');
    foreach ($files as $name => $bytes) {
        $zip->addFromString('ARL-'.$release.'/'.$name, $bytes);
    }
    $zip->close();
    $source = file_get_contents(__DIR__.'/publish-laragon-final.php');
    $start = strpos($source, 'function arlHttp(');
    $end = strpos($source, "if (defined('ARL_DEPLOY_LIBRARY_ONLY'))");
    arlCheck(is_int($start) && is_int($end) && $end > $start, 'FIXTURE_HTTP_SCOPE');
    $mock = <<<'PHP'
function arlHttp(string $path, array $headers = []): array {
    $root = realpath($GLOBALS['pointer']);
    $release = $root === $GLOBALS['new'] ? $GLOBALS['release'] : $GLOBALS['previousRelease'];
    $response = ['status'=>200,'headers'=>['x-arl-release'=>$release],'body'=>''];
    if ($headers && str_starts_with($headers[0], 'X-ARL-Deploy-Probe: ')) {
        $response['body'] = json_encode(['release'=>$root,'php'=>PHP_VERSION_ID]);
    } elseif ($path === 'login') {
        $response['status'] = getenv('ARL_FIXTURE_FAIL') === '1' ? 500 : 200;
        $response['body'] = '<form id="login-form"></form><script src="appearance-fixture.js"></script>';
    } elseif (str_starts_with($path, 'api/')) {
        $response['status'] = 401;
    } elseif ($path === 'cron-scheduler.php') {
        $response['status'] = 403;
    } elseif (str_starts_with($path, 'build/')) {
        $response['body'] = file_get_contents($GLOBALS['www'].'/'.$path);
    }
    return $response;
}
PHP;
    $source = substr($source, 0, $start).$mock."\n".substr($source, $end);
    $source = str_replace('/home/arlinfocg', $root, $source);
    $runner = $root.'/runner.php';
    file_put_contents($runner, $source);
    $config = ['owner_authorized' => true, 'release' => $release, 'previous_release' => $prior, 'baseline' => $baseline, 'bytes' => filesize($zipPath), 'sha256' => hash_file('sha256', $zipPath), 'mode' => 'publish'];
    [$exit, $events] = runFixture($runner, $config, base64_encode(file_get_contents($zipPath))."\nEND_PACKAGE\nBASELINE_VERIFIED\n", $fail);
    $names = array_column($events, 'event');
    arlCheck($exit === ($fail ? 20 : 0), 'FIXTURE_EXIT_FAILED');
    arlCheck(in_array($fail ? 'RECOVERED_PREVIOUS' : 'PUBLISHED', $names, true), 'FIXTURE_RESULT_FAILED');
    clearstatcache(true, $pointer);
    if (! $fail) {
        arlCheck(realpath($pointer) === $new, 'FIXTURE_PUBLISH_POINTER');
        $record = array_values(array_filter($events, fn ($event) => $event['event'] === 'ROLLBACK_BASELINE'))[0]['baseline'];
        $record['aliases'] = $baseline['aliases'];
        [$exit, $rollback] = runFixture($runner, [...$config, 'mode' => 'rollback', 'backup' => $record], '');
        arlCheck($exit === 0 && $rollback[0]['event'] === 'REVERTED_PREVIOUS', 'FIXTURE_MANUAL_ROLLBACK_FAILED');
    }
    clearstatcache(true, $pointer);
    arlCheck(realpath($pointer) === $old, 'FIXTURE_PREVIOUS_POINTER');
    foreach ($aliases as $name => $bytes) {
        arlCheck(file_get_contents($www.'/'.$name) === $bytes, 'FIXTURE_PREVIOUS_ALIAS');
    }
    arlCheck(file_get_contents($old.'/.env') === 'PRIVATE_FIXTURE_ENV' && file_get_contents($root.'/arl-private/storage/upload.txt') === 'PRIVATE_UPLOAD_SENTINEL', 'FIXTURE_PRIVATE_CHANGED');
}
echo "PASS: full isolated publication, manual rollback to 5c, failed smoke recovery, aliases/private files preserved; no SSH/HTTP/SQL.\n";
