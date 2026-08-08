<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$result = [
    'php_version' => PHP_VERSION,
    'checks' => [],
];

// check pdo_mysql
$pdoMysqlLoaded = extension_loaded('pdo_mysql');
$result['checks']['pdo_mysql'] = $pdoMysqlLoaded ? ['ok' => true] : ['ok' => false, 'message' => 'pdo_mysql extension not enabled'];

// check config.local.php exists
$localConfigPath = __DIR__ . '/config.local.php';
if (!file_exists($localConfigPath)) {
    $result['checks']['config.local.php'] = ['ok' => false, 'message' => 'Missing server/config.local.php'];
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}
$result['checks']['config.local.php'] = ['ok' => true];

// load config but never reveal credentials
$config = include $localConfigPath;
$db = null;
if (isset($config['database']) && is_array($config['database'])) {
    $db = $config['database'];
} elseif (isset($config['host']) && (isset($config['database']) || isset($config['name']))) {
    $db = [
        'host' => $config['host'],
        'port' => isset($config['port']) ? (int)$config['port'] : 3306,
        'name' => $config['database'] ?? ($config['name'] ?? ''),
        'user' => $config['username'] ?? ($config['user'] ?? ''),
        'password' => $config['password'] ?? '',
        'charset' => $config['charset'] ?? 'utf8mb4',
    ];
}

if (!$db || !isset($db['host']) || !isset($db['name'])) {
    $result['checks']['database_config'] = ['ok' => false, 'message' => 'Database configuration incomplete in server/config.local.php'];
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// test database connection (do not echo password)
try {
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $db['host'], $db['port'] ?? 3306, $db['name'], $db['charset'] ?? 'utf8mb4');
    $pdo = new PDO($dsn, $db['user'] ?? '', $db['password'] ?? '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    // small query
    $stmt = $pdo->query('SELECT 1');
    $ok = (bool)$stmt->fetch();
    $result['checks']['database_connection'] = ['ok' => $ok, 'host' => $db['host'], 'database' => $db['name']];
} catch (Throwable $e) {
    $result['checks']['database_connection'] = ['ok' => false, 'message' => 'DB connection failed'];
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
