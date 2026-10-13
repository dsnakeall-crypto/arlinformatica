<?php

// Remove only the known, retired ARL release, after a fully verified local backup.
declare(strict_types=1);

function cleanCheck(bool $condition, string $code): void
{
    if (! $condition) {
        throw new RuntimeException($code);
    }
}

function retiredManifest(string $base, string $relative): array
{
    $result = [];
    $walk = function (string $path, string $name) use (&$walk, &$result): void {
        if (is_link($path)) {
            $result[$name] = ['type' => 'link', 'target' => readlink($path)];
        } elseif (is_dir($path)) {
            foreach (scandir($path) as $item) {
                if ($item !== '.' && $item !== '..') {
                    $walk($path.'/'.$item, $name.'/'.$item);
                }
            }
        } else {
            cleanCheck(is_file($path), 'RETIRED_FILE_INVALID');
            $result[$name] = ['type' => 'file', 'size' => filesize($path), 'sha256' => hash_file('sha256', $path)];
        }
    };
    $walk($base, $relative);
    ksort($result);

    return $result;
}

function removeRetiredTree(string $path, string $base): void
{
    cleanCheck($path === $base || str_starts_with($path, $base.'/'), 'DELETE_OUTSIDE_RETIRED_BASE');
    // Symlinks are unlinked, never traversed: .env and storage remain in arl-private.
    if (is_link($path)) {
        cleanCheck(unlink($path), 'LINK_DELETE_FAILED');
    } elseif (is_dir($path)) {
        cleanCheck(realpath($path) === $path, 'DELETE_DIRECTORY_CHANGED');
        foreach (scandir($path) as $name) {
            if ($name !== '.' && $name !== '..') {
                removeRetiredTree($path.'/'.$name, $base);
            }
        }
        cleanCheck(rmdir($path), 'DIRECTORY_DELETE_FAILED');
    } else {
        cleanCheck(is_file($path) && unlink($path), 'FILE_DELETE_FAILED');
    }
}

if (defined('ARL_CLEAN_LIBRARY_ONLY')) {
    return;
}

try {
    $cfg = json_decode(base64_decode(getenv('ARL_CLEAN_CONFIG'), true), true, 512, JSON_THROW_ON_ERROR);
    cleanCheck(($cfg['owner_authorized'] ?? false) === true && ($cfg['local_archive_verified'] ?? false) === true
        && preg_match('/^[a-f0-9]{64}$/', $cfg['archive_sha256'] ?? '') === 1, 'LOCAL_VERIFIED_BACKUP_REQUIRED');
    $previous = '5c8885f6cf50757255938a39e1325bb9e91037cc';
    $home = '/home/arlinfocg';
    $relative = 'arl-oito-'.$previous;
    $base = $home.'/'.$relative;
    $release = $cfg['current_release'];
    cleanCheck(preg_match('/^[a-f0-9]{40}$/', $release) === 1 && $release !== $previous, 'CURRENT_RELEASE_INVALID');
    $active = $home.'/arl-oito-'.$release.'/ARL-'.$release;
    $pointer = $home.'/arl-current-e90f11f';
    cleanCheck(is_link($pointer) && realpath($pointer) === $active && realpath($base) === $base && ! is_link($base), 'ACTIVE_OR_RETIRED_PATH_CHANGED');
    $env = $home.'/arl-private/.env';
    $storage = $home.'/arl-private/storage';
    cleanCheck(realpath($active.'/.env') === $env && realpath($active.'/storage') === $storage, 'PRIVATE_PATH_CHANGED');
    $envHash = hash_file('sha256', $env);
    $storageInode = stat($storage)['ino'];
    $expected = $cfg['entries'];
    cleanCheck(is_array($expected) && count($expected) > 100, 'RETIRED_MANIFEST_INVALID');
    $observed = retiredManifest($base, $relative);
    ksort($expected);
    cleanCheck($observed === $expected, 'RETIRED_FILES_CHANGED_SINCE_BACKUP');
    $lock = fopen($home.'/arl-private/deployment.lock', 'rb');
    cleanCheck(is_resource($lock) && flock($lock, LOCK_EX), 'DEPLOYMENT_LOCK_FAILED');
    cleanCheck(realpath($pointer) === $active, 'POINTER_CHANGED_BEFORE_CLEANUP');
    removeRetiredTree($base, $base);
    cleanCheck(! file_exists($base) && hash_file('sha256', $env) === $envHash && stat($storage)['ino'] === $storageInode, 'CLEANUP_PRIVATE_VERIFICATION_FAILED');
    flock($lock, LOCK_UN);
    fclose($lock);
    echo json_encode(['event' => 'RETIRED_RELEASE_REMOVED', 'path' => $base, 'current_release' => $release,
        'verified_local_archive_sha256' => $cfg['archive_sha256'], 'private_files' => 'UNCHANGED', 'database_actions' => 'NONE', 'terraplan_writes' => 'NONE'], JSON_THROW_ON_ERROR)."\n";
} catch (Throwable $error) {
    $message = $error->getMessage();
    echo json_encode(['event' => 'CLEANUP_BLOCKED', 'reason' => preg_match('/^[A-Z0-9_]+$/', $message) ? $message : 'INTERNAL_ERROR'], JSON_THROW_ON_ERROR)."\n";
    exit(30);
}
