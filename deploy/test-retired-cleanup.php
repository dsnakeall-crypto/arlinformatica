<?php

declare(strict_types=1);

define('ARL_CLEAN_LIBRARY_ONLY', true);
require __DIR__.'/clean-retired-arl-release.php';

foreach ([false, true] as $tamper) {
    $root = sys_get_temp_dir().'/arl-cleanup-test-'.bin2hex(random_bytes(6));
    $previous = '5c8885f6cf50757255938a39e1325bb9e91037cc';
    $release = str_repeat('c', 40);
    $relative = 'arl-oito-'.$previous;
    $base = $root.'/'.$relative;
    $current = $root.'/arl-oito-'.$release.'/ARL-'.$release;
    foreach ([$base.'/runtime', $current, $root.'/arl-private/storage', $root.'/terraplan'] as $directory) {
        cleanCheck(mkdir($directory, 0700, true), 'FIXTURE_CREATE_FAILED');
    }
    file_put_contents($root.'/arl-private/.env', 'PRIVATE_ENV_SENTINEL');
    file_put_contents($root.'/arl-private/deployment.lock', '');
    file_put_contents($root.'/arl-private/storage/upload.pdf', 'PRIVATE_UPLOAD_SENTINEL');
    file_put_contents($root.'/terraplan/sentinel', 'TERRAPLAN_UNTOUCHED');
    for ($i = 0; $i < 110; $i++) {
        file_put_contents($base.'/runtime/file-'.$i, 'old-code-'.$i);
    }
    foreach ([$base, $current] as $directory) {
        cleanCheck(symlink($root.'/arl-private/.env', $directory.'/.env') && symlink($root.'/arl-private/storage', $directory.'/storage'), 'FIXTURE_PRIVATE_LINK_FAILED');
    }
    cleanCheck(symlink($current, $root.'/arl-current-e90f11f'), 'FIXTURE_POINTER_FAILED');
    $entries = retiredManifest($base, $relative);
    if ($tamper) {
        $entries[$relative.'/runtime/file-0']['sha256'] = str_repeat('0', 64);
    }
    $config = ['owner_authorized' => true, 'local_archive_verified' => true, 'archive_sha256' => str_repeat('a', 64),
        'current_release' => $release, 'entries' => $entries];
    $source = str_replace('/home/arlinfocg', $root, file_get_contents(__DIR__.'/clean-retired-arl-release.php'));
    file_put_contents($root.'/runner.php', $source);
    $environment = getenv();
    $environment['ARL_CLEAN_CONFIG'] = base64_encode(json_encode($config, JSON_THROW_ON_ERROR));
    $process = proc_open([PHP_BINARY, $root.'/runner.php'], [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']], $pipes, null, $environment);
    cleanCheck(is_resource($process), 'FIXTURE_PROCESS_FAILED');
    fclose($pipes[0]);
    $output = stream_get_contents($pipes[1]);
    $error = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exit = proc_close($process);
    cleanCheck($error === '', 'FIXTURE_STDERR');
    $event = json_decode($output, true, 512, JSON_THROW_ON_ERROR);
    cleanCheck($exit === ($tamper ? 30 : 0) && $event['event'] === ($tamper ? 'CLEANUP_BLOCKED' : 'RETIRED_RELEASE_REMOVED'), 'FIXTURE_CLEANUP_FAILED');
    clearstatcache();
    cleanCheck(is_dir($base) === $tamper && is_dir($current), 'FIXTURE_DELETE_SCOPE_FAILED');
    cleanCheck(file_get_contents($root.'/arl-private/.env') === 'PRIVATE_ENV_SENTINEL'
        && file_get_contents($root.'/arl-private/storage/upload.pdf') === 'PRIVATE_UPLOAD_SENTINEL'
        && file_get_contents($root.'/terraplan/sentinel') === 'TERRAPLAN_UNTOUCHED', 'FIXTURE_PRIVATE_OR_TERRAPLAN_CHANGED');
}
echo "PASS: retired-only cleanup, changed-backup rejection, symlinks not followed, active/private/TERRAPLAN preserved; no SSH/SQL.\n";
