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

// check app_state table exists
try {
    $tbl = $pdo->prepare("SELECT COUNT(*) as cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'app_state'");
    $tbl->execute([':db' => $db['name']]);
    $row = $tbl->fetch();
    $result['checks']['app_state'] = ['ok' => ($row && $row['cnt'] > 0) ? true : false];
} catch (Throwable $e) {
    $result['checks']['app_state'] = ['ok' => false, 'message' => 'Could not verify app_state'];
}

// check schema_migrations exists
try {
    $tbl2 = $pdo->prepare("SELECT COUNT(*) as cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'schema_migrations'");
    $tbl2->execute([':db' => $db['name']]);
    $row2 = $tbl2->fetch();
    $result['checks']['schema_migrations'] = ['ok' => ($row2 && $row2['cnt'] > 0) ? true : false];
} catch (Throwable $e) {
    $result['checks']['schema_migrations'] = ['ok' => false, 'message' => 'Could not verify schema_migrations'];
}

// check core tables exist (sample)
$coreTables = ['companies','users','employees','timesheets'];
$coreStatus = [];
foreach ($coreTables as $t) {
    try {
        $q = $pdo->prepare("SELECT COUNT(*) as cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :tbl");
        $q->execute([':db' => $db['name'], ':tbl' => $t]);
        $r = $q->fetch();
        $coreStatus[$t] = ($r && $r['cnt'] > 0) ? true : false;
    } catch (Throwable $e) {
        $coreStatus[$t] = false;
    }
}
$result['checks']['core_tables'] = $coreStatus;

// auth schema checks
try {
    $authTableStmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'auth_login_audit'");
    $authTableStmt->execute([':db' => $db['name']]);
    $authTableRow = $authTableStmt->fetch();
    $result['checks']['auth_login_audit_table'] = ['ok' => ($authTableRow && $authTableRow['cnt'] > 0) ? true : false];
} catch (Throwable $e) {
    $result['checks']['auth_login_audit_table'] = ['ok' => false, 'message' => 'Could not verify auth_login_audit table'];
}

try {
    $authColumnStmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash'");
    $authColumnStmt->execute([':db' => $db['name']]);
    $authColumnRow = $authColumnStmt->fetch();
    $result['checks']['users_password_hash_column'] = ['ok' => ($authColumnRow && $authColumnRow['cnt'] > 0) ? true : false];
} catch (Throwable $e) {
    $result['checks']['users_password_hash_column'] = ['ok' => false, 'message' => 'Could not verify users.password_hash'];
}

try {
    $authUsersStmt = $pdo->query("SELECT COUNT(*) as cnt FROM users WHERE role IN ('administrator', 'employee') AND password_hash IS NOT NULL AND password_hash <> ''");
    $authUsersRow = $authUsersStmt->fetch();
    $result['checks']['auth_demo_users'] = [
        'ok' => ($authUsersRow && (int)$authUsersRow['cnt'] > 0),
        'count' => $authUsersRow ? (int)$authUsersRow['cnt'] : 0,
    ];
} catch (Throwable $e) {
    $result['checks']['auth_demo_users'] = ['ok' => false, 'message' => 'Could not verify auth demo users'];
}

// demo seed counts: ensure demo seed added minimal data
try {
    $demoCounts = [];
    $tablesToCheck = ['companies','users','employees','periods','timesheets','invoices'];
    foreach ($tablesToCheck as $tbl) {
        $q = $pdo->prepare("SELECT COUNT(*) as cnt FROM `" . $tbl . "` WHERE 1");
        $q->execute();
        $r = $q->fetch();
        $demoCounts[$tbl] = isset($r['cnt']) ? (int)$r['cnt'] : 0;
    }
    $result['checks']['demo_counts'] = $demoCounts;
    $result['checks']['demo_seed_present'] = ['ok' => ($demoCounts['companies']>0 && $demoCounts['users']>0 && $demoCounts['employees']>0 && $demoCounts['periods']>0 && $demoCounts['timesheets']>0 && $demoCounts['invoices']>0)];
} catch (Throwable $e) {
    $result['checks']['demo_seed_present'] = ['ok' => false, 'message' => 'Could not run demo seed counts'];
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
