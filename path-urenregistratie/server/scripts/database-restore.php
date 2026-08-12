<?php

declare(strict_types=1);

require_once __DIR__ . '/cli-bootstrap.php';

$options = ops_options($argv);
try {
    $config = ops_load_config($options);
    $db = ops_database_config($config);
    $file = isset($options['file']) && is_string($options['file']) ? $options['file'] : '';
    if ($file === '' || !is_file($file) || !is_readable($file)) {
        throw new RuntimeException('A readable --file=/absolute/path/to/backup.sql is required.');
    }
    $checksumFile = $file . '.sha256';
    $checksumValid = null;
    if (is_file($checksumFile)) {
        $expected = strtolower(strtok(trim((string)file_get_contents($checksumFile)), " \t"));
        $checksumValid = hash_equals($expected, hash_file('sha256', $file));
        if (!$checksumValid) {
            throw new RuntimeException('Backup checksum validation failed.');
        }
    }
    if (($options['execute'] ?? false) !== true) {
        ops_print([
            'ok' => true,
            'mode' => 'check',
            'file' => realpath($file),
            'bytes' => filesize($file),
            'checksum_valid' => $checksumValid,
            'database_modified' => false,
            'message' => 'Restore requires --execute and --confirm=RESTORE_' . $db['name'] . '.',
        ]);
    }
    if (($options['confirm'] ?? '') !== 'RESTORE_' . $db['name']) {
        throw new RuntimeException('Restore confirmation does not match the configured database.');
    }
    $handle = fopen($file, 'rb');
    if ($handle === false) {
        throw new RuntimeException('Could not open backup file.');
    }
    $command = [
        (string)($options['mysql'] ?? 'mysql'), '--default-character-set=' . $db['charset'],
        '--host=' . $db['host'], '--port=' . (string)$db['port'], '--user=' . $db['user'], $db['name'],
    ];
    $result = ops_run_process($command, ['MYSQL_PWD' => $db['password']], $handle);
    fclose($handle);
    if ($result['exit_code'] !== 0) {
        throw new RuntimeException('Database restore failed.');
    }
    ops_print(['ok' => true, 'mode' => 'execute', 'database' => $db['name'], 'source' => realpath($file)]);
} catch (Throwable $error) {
    ops_print(['ok' => false, 'error' => $error->getMessage()], 1);
}
