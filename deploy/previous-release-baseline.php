<?php

declare(strict_types=1);

if (! function_exists('arlShared')) {
    define('ARL_DEPLOY_LIBRARY_ONLY', true);
    require __DIR__.'/publish-eight-improvements.php';
}

/** Reconstruct the published public aliases from already verified local artifacts, without saving another backup. */
function arlPreviousBaseline(string $package, string $aliases): array
{
    $release = '9a90223304d404de1dfb867cc109952ca0b99ca5';
    arlCheck(hash_file('sha256', $package) === '6c824132b1dc808ddd3ac2999c052108fb4f3f3a5d70c306ab53efc93b4dc676', 'PREVIOUS_PACKAGE_HASH_FAILED');
    arlCheck(hash_file('sha256', $aliases) === 'e02e450d0ee5d5104530d591a9b2663082025ac45a47551adb0579707f59e69d', 'PREVIOUS_ALIAS_SOURCE_HASH_FAILED');
    $saved = json_decode(file_get_contents($aliases), true, 512, JSON_THROW_ON_ERROR);
    arlCheck($saved['release'] === $release, 'PREVIOUS_ALIAS_RELEASE_INVALID');
    $old = '/home/arlinfocg/arl-informatica-stage-e90f11f-20261011/ARL-e90f11f';
    $current = '/home/arlinfocg/arl-oito-'.$release.'/ARL-'.$release;
    $former = '/home/arlinfocg/arl-informatica-9702fa1dd0e86889a11db8e6136b327969083f95';
    $pointer = '/home/arlinfocg/arl-current-e90f11f';
    $before = arlShared($pointer, [$former, $old], $old, 'e90f11fea20839e573df7a40d67489301dbcaad7', $old);
    $after = arlShared($pointer, [$former, $old, $current], $current, $release, $old);
    $zip = new ZipArchive;
    arlCheck($zip->open($package, ZipArchive::CHECKCONS) === true, 'PREVIOUS_ZIP_INVALID');
    $result = ['release' => $release, 'root' => $current, 'lock' => $saved['lock'], 'aliases' => []];
    foreach (['index.php', 'cron-scheduler.php', 'sw.js', 'build/manifest.json'] as $name) {
        if (in_array($name, ['index.php', 'cron-scheduler.php'], true)) {
            $bytes = base64_decode($saved['aliases'][$name]['data'], true);
            arlCheck(is_string($bytes) && hash('sha256', $bytes) === $saved['aliases'][$name]['sha256'] && substr_count($bytes, $before) === 1, 'PREVIOUS_LAUNCHER_INVALID');
            $bytes = str_replace($before, $after, $bytes);
            if ($name === 'cron-scheduler.php') {
                // The removed temporary probe left this newline after the PHP opening tag.
                $bytes = substr_replace($bytes, "\n", 5, 0);
            }
            token_get_all($bytes, TOKEN_PARSE);
        } else {
            $bytes = $zip->getFromName('ARL-'.$release.'/public/'.$name);
            arlCheck(is_string($bytes), 'PREVIOUS_STATIC_MISSING');
        }
        $hash = hash('sha256', $bytes);
        $accepted = $saved['accepted'][$name];
        arlCheck($hash === $accepted[count($accepted) - 1], 'PREVIOUS_FINAL_HASH_FAILED');
        $result['aliases'][$name] = ['sha256' => $hash, 'data' => base64_encode($bytes)];
    }
    $zip->close();

    return $result;
}

if (! defined('ARL_BASELINE_LIBRARY_ONLY')) {
    echo json_encode(arlPreviousBaseline($argv[1], $argv[2]), JSON_THROW_ON_ERROR);
}
