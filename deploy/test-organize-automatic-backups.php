<?php

declare(strict_types=1);

foreach (['valid', 'tampered', 'extra', 'existing'] as $scenario) {
    $home = sys_get_temp_dir().'/arl-backup-test-'.bin2hex(random_bytes(6));
    $directory = $home.'/arl-private/storage/app/private/backups';
    if (! mkdir($directory, 0700, true) || ! mkdir($home.'/terraplan', 0700)) {
        throw new RuntimeException('FIXTURE_FAILED');
    }
    file_put_contents($home.'/terraplan/sentinel', 'TERRAPLAN');
    file_put_contents($home.'/arl-private/.env', 'PRIVATE');
    file_put_contents($home.'/arl-private/deployment.lock', '');
    $expected = [];
    foreach ([1, 2, 3, 4] as $number) {
        $name = 'backup-arl-20261008-171017-'.$number.'.zip';
        file_put_contents($directory.'/'.$name, 'backup-'.$number);
        $expected[$name] = hash_file('sha256', $directory.'/'.$name);
    }
    if ($scenario === 'tampered') {
        $expected[array_key_first($expected)] = str_repeat('0', 64);
    } elseif ($scenario === 'extra') {
        file_put_contents($directory.'/unexpected.zip', 'PRESERVE');
    } elseif ($scenario === 'existing') {
        mkdir($home.'/BACKUPARL', 0700);
    }
    $runner = $home.'/runner.php';
    file_put_contents($runner, str_replace('/home/arlinfocg', $home, file_get_contents(__DIR__.'/organize-automatic-backups.php')));
    for ($attempt = 0; $attempt < ($scenario === 'valid' ? 2 : 1); $attempt++) {
        $process = proc_open([PHP_BINARY, $runner], [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']], $pipes);
        fwrite($pipes[0], json_encode($expected, JSON_THROW_ON_ERROR));
        fclose($pipes[0]);
        $result = json_decode(stream_get_contents($pipes[1]), true, 512, JSON_THROW_ON_ERROR);
        fclose($pipes[1]);
        $error = stream_get_contents($pipes[2]);
        fclose($pipes[2]);
        $exit = proc_close($process);
        if ($error !== '' || ($scenario === 'valid' ? $exit !== 0 || $result['status'] !== 'BACKUPARL_READY' : $exit !== 1 || $result['status'] !== 'BLOCKED')) {
            throw new RuntimeException('RESULT_FAILED: '.$scenario);
        }
        if ($scenario === 'valid' && (! is_link($directory) || readlink($directory) !== $home.'/BACKUPARL' || (fileperms($home.'/BACKUPARL') & 0777) !== 0700)) {
            throw new RuntimeException('LINK_OR_PRIVACY_FAILED');
        }
        foreach ($expected as $name => $sha) {
            if (file_get_contents($directory.'/'.$name) !== 'backup-'.substr($name, -5, 1)) {
                throw new RuntimeException('BACKUP_CHANGED');
            }
        }
        if (file_get_contents($home.'/terraplan/sentinel') !== 'TERRAPLAN' || file_get_contents($home.'/arl-private/.env') !== 'PRIVATE') {
            throw new RuntimeException('PROTECTED_CHANGED');
        }
    }
    echo 'PASS '.$scenario.PHP_EOL;
}
