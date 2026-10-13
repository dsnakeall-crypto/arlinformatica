<?php

// Reviewed code-only update. No migration, SQL export/restore, seed, or deletion command.
declare(strict_types=1);
function arlCheck(bool $ok, string $message): void
{
    if (! $ok) {
        throw new RuntimeException($message);
    }
}
function arlEvent(string $event, array $data = []): void
{
    echo json_encode(['event' => $event] + $data, JSON_THROW_ON_ERROR),"\n";
    flush();
}
function arlAtomic(string $path, string $bytes): void
{
    arlCheck(! is_link($path) && realpath(dirname($path)) === dirname($path), 'UNSAFE_ALIAS');
    $temp = $path.'.arl-next-'.bin2hex(random_bytes(8));
    $h = fopen($temp, 'xb');
    arlCheck($h !== false, 'TEMP_FAILED');
    try {
        arlCheck(fwrite($h, $bytes) === strlen($bytes) && fflush($h), 'WRITE_FAILED');
        if (function_exists('fsync')) {
            arlCheck(fsync($h), 'SYNC_FAILED');
        }
    } finally {
        fclose($h);
    }
    arlCheck(chmod($temp, 0644) && hash_file('sha256', $temp) === hash('sha256', $bytes), 'HASH_FAILED');
    arlCheck(rename($temp, $path), 'RENAME_FAILED');
}
function arlPointer(string $pointer, string $root): void
{
    $temp = $pointer.'.next-'.bin2hex(random_bytes(8));
    arlCheck(symlink($root, $temp) && rename($temp, $pointer), 'POINTER_FAILED');
    clearstatcache(true, $pointer);
    arlCheck(realpath($pointer) === $root, 'POINTER_VERIFY_FAILED');
}
function arlStaticEquivalent(string $name, string $existing, string $candidate): bool
{
    if ($existing === $candidate) {
        return true;
    }

    return in_array($name, ['arl-assets/arl.svg', 'icons/arl.svg', 'arl-assets/expense-cards/catalog.json', 'manifest.webmanifest'], true)
        && str_replace("\r\n", "\n", $existing) === str_replace("\r\n", "\n", $candidate);
}
function arlCronProbe(string $source, string $probe, string $pointer): string
{
    arlCheck(str_starts_with($source, '<?php'), 'CRON_PHP_TAG_MISSING');
    $standalone = str_replace('"release"=>$arlRoot', '"release"=>realpath('.var_export($pointer, true).')', $probe);

    return substr_replace($source, "\n".$standalone, 5, 0);
}
function arlExpenseAsset(array $manifest): string
{
    $matches = array_filter($manifest, fn ($entry) => ($entry['name'] ?? '') === 'expense-control-page' && ($entry['isDynamicEntry'] ?? false) === true && str_ends_with($entry['file'] ?? '', '.js'));
    arlCheck(count($matches) === 1, 'EXPENSE_MANIFEST_ENTRY_INVALID');

    return array_values($matches)[0]['file'];
}
function arlShared(string $pointer, array $roots, string $current, string $release, string $e90): string
{
    $allowed = implode(',', array_map(fn ($value) => var_export($value, true), $roots));

    return '$arlPointer='.var_export($pointer, true).'; clearstatcache(true,$arlPointer); $arlRoot=realpath($arlPointer); if(!in_array($arlRoot,['.$allowed.'],true)){http_response_code(503);exit;} header("X-ARL-Release: ".($arlRoot==='.var_export($current, true).'?'.var_export($release, true).':'.($current === $e90 ? '"9702fa1"' : '($arlRoot==='.var_export($e90, true).'?"e90f11fea20839e573df7a40d67489301dbcaad7":"9702fa1")').'));'."\n";
}
function arlSharedVersions(string $pointer, array $versions): string
{
    return '$arlPointer='.var_export($pointer, true).'; clearstatcache(true,$arlPointer); $arlRoot=realpath($arlPointer); $arlVersions='.var_export($versions, true).'; if(!isset($arlVersions[$arlRoot])){http_response_code(503);exit;} header("X-ARL-Release: ".$arlVersions[$arlRoot]);'."\n";
}
function arlHttp(string $path, array $headers = []): array
{
    $h = curl_init('https://arlinfocg.kinghost.net/'.$path);
    $received = [];
    curl_setopt_array($h, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 25, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_HTTPHEADER => $headers, CURLOPT_HEADERFUNCTION => function ($h, $line) use (&$received) {
        if (str_contains($line, ':')) {
            [$key,$value] = explode(':', $line, 2);
            $received[strtolower(trim($key))] = trim($value);
        }

        return strlen($line);
    }]);
    $body = curl_exec($h);
    $status = curl_getinfo($h, CURLINFO_HTTP_CODE);
    curl_close($h);
    arlCheck(is_string($body), 'HTTPS_FAILED');

    return ['body' => $body, 'status' => $status, 'headers' => $received];
}
if (defined('ARL_DEPLOY_LIBRARY_ONLY')) {
    return;
}
$e90 = '/home/arlinfocg/arl-informatica-stage-e90f11f-20261011/ARL-e90f11f';
$previousRelease = '5c8885f6cf50757255938a39e1325bb9e91037cc';
$old = '/home/arlinfocg/arl-oito-'.$previousRelease.'/ARL-'.$previousRelease;
$former = '/home/arlinfocg/arl-informatica-9702fa1dd0e86889a11db8e6136b327969083f95';
$pointer = '/home/arlinfocg/arl-current-e90f11f';
$www = '/home/arlinfocg/www';
$phase = 'VALIDATE_INPUT';
$changed = false;
$success = false;
$exclusive = null;
$aliases = [];
$lockPath = null;
register_shutdown_function(function () use (&$changed, &$success, &$exclusive, &$aliases, &$lockPath, $pointer, $old) {
    if ($changed && ! $success) {
        try {
            if (! is_resource($exclusive)) {
                $exclusive = fopen($lockPath, 'rb');
                arlCheck($exclusive !== false && flock($exclusive, LOCK_EX), 'RECOVERY_LOCK_FAILED');
            }
            arlPointer($pointer, $old);
            foreach ($aliases as $path => $bytes) {
                arlAtomic($path, $bytes);
            }
            arlEvent('RECOVERED_PREVIOUS', ['database' => 'UNCHANGED', 'private_files' => 'UNCHANGED']);
        } catch (Throwable) {
            arlEvent('RECOVERY_REQUIRES_OPERATOR');
        }
    }
    if (is_resource($exclusive)) {
        flock($exclusive, LOCK_UN);
        fclose($exclusive);
    }
});
try {
    $cfg = json_decode(base64_decode(getenv('ARL_EIGHT_CONFIG'), true), true, 512, JSON_THROW_ON_ERROR);
    arlCheck(($cfg['owner_authorized'] ?? false) === true, 'OWNER_AUTHORIZATION_REQUIRED');
    arlCheck(($cfg['previous_release'] ?? '') === $previousRelease && ($cfg['baseline']['release'] ?? '') === $previousRelease && ($cfg['baseline']['root'] ?? '') === $old, 'PREVIOUS_RELEASE_INVALID');
    $release = $cfg['release'];
    arlCheck(preg_match('/^[a-f0-9]{40}$/', $release) === 1, 'RELEASE_INVALID');
    $base = '/home/arlinfocg/arl-oito-'.$release;
    $new = $base.'/ARL-'.$release;
    arlCheck(PHP_VERSION_ID >= 80200 && extension_loaded('curl') && extension_loaded('zip'), 'PHP82_CURL_ZIP_REQUIRED');
    arlCheck(realpath($www) === $www && realpath($old) === $old && is_link($pointer), 'OFFICIAL_PATH_CHANGED');
    arlCheck(in_array(realpath($pointer), ($cfg['mode'] ?? '') === 'rollback' ? [$old, $new] : [$old], true), 'ACTIVE_RELEASE_CHANGED');
    $index = file_get_contents($www.'/index.php');
    arlCheck(preg_match('~\$arlLock=fopen\(\'([^\']+)\',"rb"\);~', $index, $match) === 1, 'EXISTING_LOCK_NOT_FOUND');
    $lockPath = $match[1];
    arlCheck($lockPath === '/home/arlinfocg/arl-private/deployment.lock' && realpath($lockPath) === $lockPath, 'LOCK_SCOPE_CHANGED');
    if (($cfg['mode'] ?? '') === 'rollback') {
        $exclusive = fopen($lockPath, 'rb');
        arlCheck($exclusive !== false && flock($exclusive, LOCK_EX), 'LOCK_FAILED');
        foreach (['index.php', 'cron-scheduler.php', 'sw.js', 'build/manifest.json'] as $name) {
            $bytes = base64_decode($cfg['backup']['aliases'][$name]['data'], true);
            arlCheck(is_string($bytes) && hash('sha256', $bytes) === $cfg['backup']['aliases'][$name]['sha256'], 'BACKUP_INVALID');
            arlCheck(in_array(hash_file('sha256', $www.'/'.$name), $cfg['backup']['accepted'][$name], true), 'ALIAS_CHANGED_AFTER_RELEASE');
            $aliases[$www.'/'.$name] = $bytes;
        }
        $changed = true;
        arlPointer($pointer, $old);
        foreach ($aliases as $path => $bytes) {
            arlAtomic($path, $bytes);
        }$success = true;
        arlEvent('REVERTED_PREVIOUS', ['database' => 'UNCHANGED', 'private_files' => 'UNCHANGED']);
        exit;
    }
    $phase = 'PACKAGE_UPLOAD';
    $reuseStage = is_dir($base);
    arlCheck(! is_link($base) && (! file_exists($base) || realpath($base) === $base), 'STAGE_EXISTS_DO_NOT_OVERWRITE');
    $zipPath = $base.'/package.zip';
    if ($reuseStage) {
        arlCheck(is_file($zipPath) && ! is_link($zipPath) && filesize($zipPath) === $cfg['bytes'] && hash_file('sha256', $zipPath) === $cfg['sha256'] && realpath($new) === $new, 'STAGE_REUSE_INVALID');
        arlEvent('STAGE_REUSED_VERIFIED');
    } else {
        arlCheck(mkdir($base, 0750), 'STAGE_CREATE_FAILED');
        arlEvent('READY_UPLOAD');
        $upload = fopen($zipPath, 'xb');
        arlCheck($upload !== false, 'UPLOAD_OPEN_FAILED');
        $size = 0;
        try {
            while (($line = fgets(STDIN)) !== false) {
                $line = trim($line);
                if ($line === 'END_PACKAGE') {
                    break;
                }$bytes = base64_decode($line, true);
                arlCheck(is_string($bytes), 'UPLOAD_ENCODING_FAILED');
                $size += strlen($bytes);
                arlCheck($size <= $cfg['bytes'], 'UPLOAD_SIZE_EXCEEDED');
                arlCheck(fwrite($upload, $bytes) === strlen($bytes), 'UPLOAD_WRITE_FAILED');
            }arlCheck(fflush($upload), 'UPLOAD_FLUSH_FAILED');
            if (function_exists('fsync')) {
                arlCheck(fsync($upload), 'UPLOAD_SYNC_FAILED');
            }
        } finally {
            fclose($upload);
        }
        arlCheck($size === $cfg['bytes'] && hash_file('sha256', $zipPath) === $cfg['sha256'], 'UPLOAD_HASH_FAILED');
    }
    $phase = 'PACKAGE_VERIFY';
    $zip = new ZipArchive;
    arlCheck($zip->open($zipPath, ZipArchive::CHECKCONS) === true, 'ZIP_FAILED');
    $prefix = 'ARL-'.$release.'/';
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        arlCheck(str_starts_with($name, $prefix) && ! str_contains($name, '\\') && ! in_array('..', explode('/', $name), true), 'ZIP_PATH_UNSAFE');
        $relative = substr($name, strlen($prefix));
        arlCheck(! preg_match('~(^|/)(\.env[^/]*|storage|\.git|node_modules)(/|$)~', $relative) && ! str_starts_with($relative, 'bootstrap/cache/'), 'ZIP_PRIVATE_DATA');
        $zip->getExternalAttributesIndex($i, $opsys, $attributes);
        arlCheck((($attributes >> 16) & 0170000) !== 0120000, 'ZIP_SYMLINK');
    }
    if (! $reuseStage) {
        arlCheck($zip->extractTo($base), 'EXTRACT_FAILED');
    }
    arlCheck(file_get_contents($new.'/.release.json') === $zip->getFromName($prefix.'.release.json'), 'STAGE_METADATA_CHANGED');
    $zip->close();
    arlCheck(realpath($new) === $new, 'STAGE_PATH_CHANGED');
    $metadata = json_decode(file_get_contents($new.'/.release.json'), true, 512, JSON_THROW_ON_ERROR);
    arlCheck($metadata['release'] === $release && $metadata['schema_changes'] === false, 'METADATA_INVALID');
    foreach ($metadata['files'] as $name => $hash) {
        arlCheck(is_file($new.'/'.$name) && ! is_link($new.'/'.$name) && hash_file('sha256', $new.'/'.$name) === $hash, 'STAGE_FILE_HASH_FAILED');
    }
    $migrationHashes = fn ($root) => array_combine(array_map('basename', glob($root.'/database/migrations/*.php')), array_map(fn ($p) => hash_file('sha256', $p), glob($root.'/database/migrations/*.php')));
    arlCheck($migrationHashes($old) === $migrationHashes($new), 'SCHEMA_CHANGE_NOT_AUTHORIZED');
    $phase = 'PRIVATE_LINKS';
    $envHash = hash_file('sha256', $old.'/.env');
    $storage = realpath($old.'/storage');
    arlCheck(is_string($storage) && str_starts_with($storage, '/home/arlinfocg/'), 'SHARED_STORAGE_INVALID');
    arlCheck(realpath($old.'/.env') === '/home/arlinfocg/arl-private/.env' && $storage === '/home/arlinfocg/arl-private/storage', 'PERMANENT_PRIVATE_PATH_CHANGED');
    foreach (['.env' => '/home/arlinfocg/arl-private/.env', 'storage' => $storage] as $name => $target) {
        $link = $new.'/'.$name;
        if (! file_exists($link) && ! is_link($link)) {
            arlCheck(symlink($target, $link), 'PRIVATE_LINK_FAILED');
        }
        arlCheck(is_link($link) && realpath($link) === realpath($target), 'PRIVATE_LINK_CHANGED');
    }
    if (! is_dir($new.'/bootstrap/cache')) {
        arlCheck(mkdir($new.'/bootstrap/cache', 0750), 'CACHE_CREATE_FAILED');
    }
    arlCheck(! is_link($new.'/bootstrap/cache') && realpath($new.'/bootstrap/cache') === $new.'/bootstrap/cache', 'CACHE_PATH_CHANGED');
    foreach (['vendor/autoload.php', 'bootstrap/app.php', 'public/build/manifest.json'] as $path) {
        arlCheck(is_file($new.'/'.$path), 'RUNTIME_MISSING');
    }
    $manifest = json_decode(file_get_contents($new.'/public/build/manifest.json'), true, 512, JSON_THROW_ON_ERROR);
    $previousShared = arlSharedVersions($pointer, [$old => $previousRelease]);
    $nextShared = arlSharedVersions($pointer, [$old => $previousRelease, $new => $release]);
    $token = bin2hex(random_bytes(32));
    $tokenFile = $base.'/probe-token';
    arlCheck(file_put_contents($tokenFile, $token) === 64 && chmod($tokenFile, 0600), 'PROBE_TOKEN_FAILED');
    $probe = 'if(isset($_SERVER["HTTP_X_ARL_DEPLOY_PROBE"])){if(!hash_equals(trim((string)file_get_contents('.var_export($tokenFile, true).')),(string)$_SERVER["HTTP_X_ARL_DEPLOY_PROBE"])){http_response_code(403);exit;}header("Content-Type: application/json");echo json_encode(["release"=>$arlRoot,"php"=>PHP_VERSION_ID]);exit;}'."\n";
    $next = [];
    $probes = [];
    $backup = ['release' => $release, 'previous_release' => $previousRelease, 'old' => $old, 'new' => $new, 'lock' => $lockPath, 'accepted' => []];
    foreach (['index.php', 'cron-scheduler.php', 'sw.js', 'build/manifest.json'] as $name) {
        $path = $www.'/'.$name;
        arlCheck(is_file($path) && ! is_link($path), 'ALIAS_UNSAFE');
        $aliases[$path] = file_get_contents($path);
        $known = $cfg['baseline']['aliases'][$name];
        arlCheck(hash('sha256', $aliases[$path]) === $known['sha256'] && $aliases[$path] === base64_decode($known['data'], true), 'EXISTING_ROLLBACK_BASELINE_CHANGED');
        if (in_array($name, ['index.php', 'cron-scheduler.php'], true)) {
            arlCheck(substr_count($aliases[$path], $previousShared) === 1, 'LAUNCHER_SHAPE_CHANGED');
            $probes[$name] = $probe;
            $next[$name] = str_replace($previousShared, $nextShared, $aliases[$path]);
            if ($name === 'cron-scheduler.php') {
                $probes[$name] = str_replace('"release"=>$arlRoot', '"release"=>realpath('.var_export($pointer, true).')', $probe);
                $next[$name] = arlCronProbe($next[$name], $probe, $pointer);
            } else {
                $next[$name] = str_replace($nextShared, $nextShared.$probe, $next[$name]);
            }
            token_get_all($next[$name], TOKEN_PARSE);
            $final = str_replace($probes[$name], '', $next[$name]);
        } else {
            $next[$name] = file_get_contents($new.'/public/'.$name);
            $final = $next[$name];
        }
        $backup['accepted'][$name] = array_values(array_unique([hash('sha256', $aliases[$path]), hash('sha256', $next[$name]), hash('sha256', $final)]));
    }
    $phase = 'ALIAS_BACKUP';
    arlEvent('ROLLBACK_BASELINE', ['baseline' => $backup]);
    arlCheck(trim((string) fgets(STDIN)) === 'BASELINE_VERIFIED', 'BASELINE_NOT_ACKNOWLEDGED');
    // Add hash-addressed assets; existing assets must match. No file removal or replacement outside the four aliases.
    $phase = 'STATIC_PREPARE';
    $static = [];
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($new.'/public', FilesystemIterator::SKIP_DOTS)) as $file) {
        if (! $file->isFile()) {
            continue;
        }arlCheck(! $file->isLink(), 'STATIC_SYMLINK');
        $name = substr($file->getPathname(), strlen($new.'/public/'));
        if ($name === 'index.php' || $name === '.htaccess' || $name === 'robots.txt') {
            continue;
        }arlCheck(preg_match('~^(build/|arl-assets/|icons/|sw\.js$|manifest\.webmanifest$)~', $name) === 1, 'STATIC_SCOPE');
        $target = $www.'/'.$name;
        $static[$name] = hash_file('sha256', $file->getPathname());
        if (file_exists($target)) {
            arlCheck(! is_link($target), 'STATIC_TARGET_SYMLINK');
            arlCheck(isset($next[$name]) || arlStaticEquivalent($name, file_get_contents($target), file_get_contents($file->getPathname())), 'STATIC_COLLISION');

            continue;
        }$parent = dirname($target);
        if (! is_dir($parent)) {
            arlCheck(mkdir($parent, 0755, true), 'STATIC_DIRECTORY_FAILED');
        }arlCheck(realpath($parent) === $parent, 'STATIC_PARENT_UNSAFE');
        $bytes = file_get_contents($file->getPathname());
        $output = fopen($target, 'xb');
        arlCheck($output !== false, 'STATIC_EXCLUSIVE_CREATE_FAILED');
        try {
            arlCheck(fwrite($output, $bytes) === strlen($bytes) && fflush($output), 'STATIC_WRITE_FAILED');
            if (function_exists('fsync')) {
                arlCheck(fsync($output), 'STATIC_SYNC_FAILED');
            }
        } finally {
            fclose($output);
        }arlCheck(chmod($target, 0644) && hash_file('sha256', $target) === $static[$name], 'STATIC_HASH_FAILED');
    }
    $exclusive = fopen($lockPath, 'rb');
    arlCheck($exclusive !== false && flock($exclusive, LOCK_EX), 'LOCK_FAILED');
    foreach ($aliases as $path => $bytes) {
        arlCheck(hash_file('sha256', $path) === hash('sha256', $bytes), 'ALIAS_CHANGED_BEFORE_ACTIVATION');
    }
    $phase = 'LAUNCHERS';
    $changed = true;
    foreach (['index.php', 'cron-scheduler.php'] as $name) {
        arlAtomic($www.'/'.$name, $next[$name]);
    }flock($exclusive, LOCK_UN);
    fclose($exclusive);
    $exclusive = null;
    // Confirm both FPM launchers see the updated allowlist while still serving e90. Never reset global OPcache.
    $phase = 'FPM_CONFIRM';
    for ($attempt = 0; $attempt < 20; $attempt++) {
        $ready = true;
        foreach (['index.php', 'cron-scheduler.php'] as $path) {
            $r = arlHttp($path, ['X-ARL-Deploy-Probe: '.$token]);
            $data = json_decode($r['body'], true);
            if ($r['status'] !== 200 || ($data['release'] ?? '') !== $old || ($data['php'] ?? 0) < 80200) {
                $ready = false;
            }
        }if ($ready) {
            break;
        }sleep(1);
    }arlCheck($ready, 'FPM_LAUNCHERS_NOT_READY');
    $exclusive = fopen($lockPath, 'rb');
    arlCheck($exclusive !== false && flock($exclusive, LOCK_EX), 'ACTIVATION_LOCK_FAILED');
    $phase = 'ACTIVATE';
    arlCheck(realpath($pointer) === $old && hash_file('sha256', $old.'/.env') === $envHash && realpath($new.'/storage') === $storage, 'PRIVATE_REFERENCES_CHANGED');
    foreach (['sw.js', 'build/manifest.json'] as $name) {
        arlAtomic($www.'/'.$name, $next[$name]);
    }arlPointer($pointer, $new);
    flock($exclusive, LOCK_UN);
    fclose($exclusive);
    $exclusive = null;
    $phase = 'SMOKE';
    $login = arlHttp('login');
    $loginAsset = $manifest['resources/js/appearance.ts']['file'];
    arlCheck($login['status'] === 200 && ($login['headers']['x-arl-release'] ?? '') === $release && str_contains($login['body'], 'id="login-form"') && str_contains($login['body'], basename($loginAsset)), 'LOGIN_SMOKE_FAILED');
    foreach (['api/me', 'api/expense-control/configuration'] as $path) {
        arlCheck(arlHttp($path, ['Accept: application/json'])['status'] === 401, 'PRIVATE_API_NOT_PROTECTED');
    }
    arlCheck(arlHttp('cron-scheduler.php')['status'] === 403, 'CRON_AUTH_FAILED');
    foreach ([$manifest['resources/js/main.tsx']['file'], arlExpenseAsset($manifest)] as $file) {
        $asset = 'build/'.$file;
        $r = arlHttp($asset);
        arlCheck($r['status'] === 200 && hash('sha256', $r['body']) === $static[$asset], 'ASSET_HTTP_HASH_FAILED');
    }
    foreach (['index.php', 'cron-scheduler.php'] as $name) {
        arlAtomic($www.'/'.$name, str_replace($probes[$name], '', $next[$name]));
    }
    $home = arlHttp('');
    arlCheck($home['status'] === 200 && ($home['headers']['x-arl-release'] ?? '') === $release, 'FINAL_RELEASE_FAILED');
    arlCheck(hash_file('sha256', $old.'/.env') === $envHash && realpath($new.'/storage') === $storage, 'FINAL_PRIVATE_REFERENCES_CHANGED');
    arlCheck(unlink($zipPath) && unlink($tokenFile), 'OWN_TRANSIENT_CLEANUP_FAILED');
    $success = true;
    arlEvent('PUBLISHED', ['release' => $release, 'old' => $old, 'new' => $new, 'database' => 'UNCHANGED_NO_MIGRATION', 'private_files' => 'SHARED_UNCHANGED', 'authenticated_smoke' => 'OWNER_SESSION_REQUIRED']);
} catch (Throwable $error) {
    arlEvent('BLOCKED', ['phase' => $phase, 'reason' => $error instanceof RuntimeException && preg_match('/^[A-Z0-9_]+$/', $error->getMessage()) ? $error->getMessage() : 'INTERNAL_ERROR_REQUIRES_REVIEW', 'database' => 'UNCHANGED_NO_SQL_RESTORE_NO_MIGRATION']);
    exit(20);
}
