<?php

declare(strict_types=1);

// Directory relocation only: no Laravel bootstrap, SQL, or public web directory.
$home = '/home/arlinfocg';
$source = $home.'/arl-private/storage/app/private/backups';
$destination = $home.'/BACKUPARL';
$lock = null;
try {
    $expected = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
    if (! is_array($expected) || count($expected) !== 4) {
        throw new RuntimeException('FOUR_VERIFIED_BACKUPS_REQUIRED');
    }
    if (realpath(dirname($source)) !== dirname($source) || is_link($destination)) {
        throw new RuntimeException('UNSAFE_DIRECTORY');
    }
    $lock = fopen($home.'/arl-private/deployment.lock', 'c');
    if (! $lock || ! flock($lock, LOCK_EX)) {
        throw new RuntimeException('LOCK_FAILED');
    }
    $already = is_link($source) && readlink($source) === $destination;
    if ((! $already && (is_link($source) || file_exists($destination))) || ! is_dir($already ? $destination : $source)) {
        throw new RuntimeException('DIRECTORY_STATE_CHANGED');
    }
    $directory = $already ? $destination : $source;
    $names = array_values(array_diff(scandir($directory), ['.', '..']));
    sort($names);
    $wanted = array_keys($expected);
    sort($wanted);
    if ($names !== $wanted) {
        throw new RuntimeException('BACKUP_SET_CHANGED');
    }
    foreach ($expected as $name => $sha) {
        if (! preg_match('/^backup-arl-[0-9]{8}-[0-9]{6}-[0-9]+\.zip$/D', $name)
            || ! preg_match('/^[a-f0-9]{64}$/D', $sha)
            || is_link($directory.'/'.$name)
            || ! is_file($directory.'/'.$name)
            || ! hash_equals($sha, hash_file('sha256', $directory.'/'.$name))) {
            throw new RuntimeException('BACKUP_HASH_CHANGED');
        }
    }
    if (! $already) {
        if (! rename($source, $destination)) {
            throw new RuntimeException('RELOCATION_FAILED');
        }
        if (! symlink($destination, $source)) {
            if (! rename($destination, $source)) {
                throw new RuntimeException('RECOVERY_REQUIRED');
            }
            throw new RuntimeException('LINK_FAILED_RECOVERED');
        }
    }
    if (! chmod($destination, 0700) || realpath($source) !== $destination) {
        throw new RuntimeException('FINAL_DIRECTORY_CHECK_FAILED');
    }
    echo json_encode(['status' => 'BACKUPARL_READY', 'directory' => $destination, 'count' => 4, 'database' => 'UNCHANGED', 'hashes' => $expected], JSON_THROW_ON_ERROR).PHP_EOL;
} catch (Throwable $error) {
    echo json_encode(['status' => 'BLOCKED', 'reason' => $error->getMessage()], JSON_THROW_ON_ERROR).PHP_EOL;
    exit(1);
} finally {
    if (is_resource($lock)) {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}
