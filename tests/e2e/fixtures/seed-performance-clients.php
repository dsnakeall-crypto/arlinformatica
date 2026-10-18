<?php

/** Performance fixture: MUST be used only with the disposable Playwright SQLite. */
declare(strict_types=1);
if (getenv('ARL_PERF_FIXTURE_ALLOWED') !== 'yes') {
    fwrite(STDERR, 'Denied');
    exit(2);
}
$path = realpath(__DIR__.'/../../../database/e2e.sqlite');
$dir = realpath(__DIR__.'/../../../database');
if (! $path || $path !== $dir.DIRECTORY_SEPARATOR.'e2e.sqlite' || filesize($path) < 1000) {
    fwrite(STDERR, 'Wrong test database');
    exit(3);
}
$n = (int) ($argv[1] ?? 2500);
if ($n < 1 || $n > 6000) {
    fwrite(STDERR, 'Invalid size');
    exit(4);
}
$db = new PDO('sqlite:'.$path, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$cols = array_column($db->query('PRAGMA table_info(clients)')->fetchAll(PDO::FETCH_ASSOC), 'name');
foreach (['name', 'document', 'phone', 'postal_code', 'street', 'number', 'district', 'city', 'state', 'created_at', 'updated_at'] as $col) {
    if (! in_array($col, $cols, true)) {
        fwrite(STDERR, 'Unexpected schema');
        exit(5);
    }
}
$stmt = $db->prepare('INSERT INTO clients(name,document,phone,postal_code,street,number,district,city,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
$now = date('Y-m-d H:i:s');
$db->beginTransaction();
for ($i = 0; $i < $n; $i++) {
    $stmt->execute([
        sprintf('ARL PERF Cliente %05d', $i), sprintf('%014d', 90000000000000 + $i),
        '3598888'.sprintf('%04d', $i % 10000), '37160000', 'Rua Teste', (string) ($i + 1), 'Centro', 'Campos Gerais', 'MG', $now, $now,
    ]);
}
$db->commit();
echo 'FIXTURE_OK='.$n.PHP_EOL;
