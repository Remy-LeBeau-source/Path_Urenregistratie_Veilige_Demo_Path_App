<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

function migrate_environment(array $config): string
{
    $raw = $config['environment'] ?? ($config['app']['environment'] ?? 'production');
    $environment = strtolower(trim((string)$raw));
    return $environment !== '' ? $environment : 'production';
}

function migrate_allow_demo_migrations(array $config): bool
{
    if (array_key_exists('allow_demo_migrations', $config)) {
        return (bool)$config['allow_demo_migrations'];
    }
    if (isset($config['app']) && is_array($config['app']) && array_key_exists('allow_demo_migrations', $config['app'])) {
        return (bool)$config['app']['allow_demo_migrations'];
    }
    return false;
}

$localConfigPath = __DIR__ . '/config.local.php';
if (!file_exists($localConfigPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Missing server/config.local.php']);
    exit;
}

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
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Database configuration incomplete in server/config.local.php']);
    exit;
}

$environment = migrate_environment($config);
$allowDemoMigrations = migrate_allow_demo_migrations($config) && $environment !== 'production';

try {
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $db['host'], $db['port'] ?? 3306, $db['name'], $db['charset'] ?? 'utf8mb4');
    $pdo = new PDO($dsn, $db['user'] ?? '', $db['password'] ?? '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'DB connection failed']);
    exit;
}

$migrationDir = __DIR__ . '/migrations';
$migrations = [];
foreach (glob($migrationDir . '/*.sql') as $f) {
    $migrations[] = basename($f);
}
sort($migrations);

// ensure schema_migrations table
$pdo->exec("CREATE TABLE IF NOT EXISTS schema_migrations (id INT AUTO_INCREMENT PRIMARY KEY, migration VARCHAR(255) NOT NULL UNIQUE, executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

$executed = [];
$skipped = [];
$demoSkipped = [];

foreach ($migrations as $mig) {
    $stmt = $pdo->prepare('SELECT migration FROM schema_migrations WHERE migration = :m LIMIT 1');
    $stmt->execute([':m' => $mig]);
    if ($stmt->fetch()) {
        $skipped[] = $mig;
        continue;
    }

    $isDemoMigration = stripos($mig, '_demo_') !== false;
    if ($isDemoMigration && !$allowDemoMigrations) {
        $demoSkipped[] = $mig;
        continue;
    }

    $sql = file_get_contents($migrationDir . '/' . $mig);
    // naive split by semicolon; ok for these migrations
    $parts = array_filter(array_map('trim', explode(';', $sql)));
    try {
        foreach ($parts as $part) {
            if ($part === '') continue;
            try {
                $pdo->exec($part);
            } catch (Throwable $inner) {
                throw new Exception('Failed to execute migration statement.', 0, $inner);
            }
        }
        $ins = $pdo->prepare('INSERT INTO schema_migrations (migration) VALUES (:m)');
        $ins->execute([':m' => $mig]);
        $executed[] = $mig;
    } catch (Throwable $e) {
        error_log('Migration failed for ' . $mig . ': ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Migration failed', 'migration' => $mig]);
        exit;
    }
}

echo json_encode([
    'ok' => true,
    'executed' => $executed,
    'skipped' => $skipped,
    'demo_skipped' => $demoSkipped,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
