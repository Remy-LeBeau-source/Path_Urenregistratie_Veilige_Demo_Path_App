<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

function migrate_env_value(array $keys): ?string
{
    foreach ($keys as $key) {
        $value = getenv($key);
        if ($value === false) {
            continue;
        }
        $value = trim((string)$value);
        if ($value !== '') {
            return $value;
        }
    }
    return null;
}

function migrate_environment(array $config): string
{
    $envValue = migrate_env_value(['PATH_APP_ENVIRONMENT', 'PLAYWRIGHT_STAGE', 'PLAYWRIGHT_ENVIRONMENT', 'DB_ENVIRONMENT', 'APP_ENV']);
    if ($envValue !== null) {
        $environment = strtolower(trim($envValue));
        return $environment !== '' ? $environment : 'production';
    }

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

    $envValue = migrate_env_value(['PATH_APP_ALLOW_DEMO_MIGRATIONS', 'PLAYWRIGHT_ALLOW_DEMO_MIGRATIONS', 'DB_ALLOW_DEMO_MIGRATIONS']);
    if ($envValue !== null) {
        $normalized = strtolower(trim($envValue));
        return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
    }

    return false;
}

function migration_plan(bool $allowDemoMigrations): array
{
    $plan = [
        [
            'id' => '001_database_schema.sql',
            'path' => dirname(__DIR__) . '/database/schema.sql',
            'legacy_ids' => ['001_core_schema.sql'],
        ],
        [
            'id' => '003_auth_schema.sql',
            'path' => __DIR__ . '/migrations/003_auth_schema.sql',
        ],
        [
            'id' => '006_email_queue_dry_run.sql',
            'path' => __DIR__ . '/migrations/006_email_queue_dry_run.sql',
        ],
        [
            'id' => '007_password_reset.sql',
            'path' => __DIR__ . '/migrations/007_password_reset.sql',
        ],
    ];

    if ($allowDemoMigrations) {
        $plan[] = [
            'id' => '002_database_seed.sql',
            'path' => dirname(__DIR__) . '/database/seed-demo-data.sql',
            'legacy_ids' => ['002_demo_seed.sql'],
        ];
        $plan[] = [
            'id' => '004_demo_employee_auth_seed.sql',
            'path' => __DIR__ . '/migrations/004_demo_employee_auth_seed.sql',
        ];
        $plan[] = [
            'id' => '005_demo_auth_hashes_for_existing_seed_users.sql',
            'path' => __DIR__ . '/migrations/005_demo_auth_hashes_for_existing_seed_users.sql',
        ];
    }

    return $plan;
}

function normalize_sql_script(string $sql): string
{
    $sql = preg_replace('/^\s*CREATE DATABASE\b.*?;\s*/ims', '', $sql) ?? $sql;
    $sql = preg_replace('/^\s*USE\s+[^;]+;\s*/ims', '', $sql) ?? $sql;
    $sql = preg_replace('/\bTRUNCATE\s+TABLE\s+(`?[a-zA-Z0-9_]+`?)\s*;/i', 'DELETE FROM $1;', $sql) ?? $sql;
    return trim($sql);
}

function make_schema_script_idempotent(string $sql, string $scriptPath): string
{
    if (basename($scriptPath) !== 'schema.sql') {
        return $sql;
    }

    $sql = preg_replace('/\bCREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS\b)/i', 'CREATE TABLE IF NOT EXISTS ', $sql) ?? $sql;
    return $sql;
}

function migration_exists(PDO $pdo, array $migrationIds): bool
{
    $ids = array_values(array_unique(array_filter(array_map('strval', $migrationIds))));
    if ($ids === []) {
        return false;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("SELECT migration FROM schema_migrations WHERE migration IN ($placeholders) LIMIT 1");
    $stmt->execute($ids);

    return (bool)$stmt->fetchColumn();
}

function ensure_migration_id(PDO $pdo, string $migrationId): void
{
    if ($migrationId === '') {
        return;
    }

    $ins = $pdo->prepare('INSERT IGNORE INTO schema_migrations (migration) VALUES (:m)');
    $ins->execute([':m' => $migrationId]);
}

function execute_sql_script(PDO $pdo, string $scriptPath): void
{
    $sql = @file_get_contents($scriptPath);
    if ($sql === false) {
        throw new RuntimeException('Could not read migration script: ' . basename($scriptPath));
    }

    $sql = normalize_sql_script($sql);
    $sql = make_schema_script_idempotent($sql, $scriptPath);
    if ($sql === '') {
        return;
    }

    $parts = array_filter(array_map('trim', explode(';', $sql)));
    foreach ($parts as $part) {
        if ($part === '') {
            continue;
        }

        try {
            $pdo->exec($part);
        } catch (Throwable $inner) {
            $preview = preg_replace('/\s+/', ' ', trim($part)) ?? trim($part);
            if (strlen($preview) > 240) {
                $preview = substr($preview, 0, 240) . '...';
            }
            throw new RuntimeException('Failed migration SQL: ' . $inner->getMessage() . ' | statement: ' . $preview, 0, $inner);
        }
    }
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

if ($db !== null) {
    $envHost = migrate_env_value(['PATH_APP_DB_HOST', 'PLAYWRIGHT_DB_HOST', 'DB_HOST']);
    if ($envHost !== null) {
        $db['host'] = $envHost;
    }
    $envPort = migrate_env_value(['PATH_APP_DB_PORT', 'PLAYWRIGHT_DB_PORT', 'DB_PORT']);
    if ($envPort !== null) {
        $db['port'] = (int)$envPort;
    }
    $envName = migrate_env_value(['PATH_APP_DB_NAME', 'PLAYWRIGHT_DB_NAME', 'DB_NAME']);
    if ($envName !== null) {
        $db['name'] = $envName;
    }
    $envUser = migrate_env_value(['PATH_APP_DB_USER', 'PLAYWRIGHT_DB_USER', 'DB_USER']);
    if ($envUser !== null) {
        $db['user'] = $envUser;
    }
    $envPassword = migrate_env_value(['PATH_APP_DB_PASSWORD', 'PLAYWRIGHT_DB_PASSWORD', 'DB_PASSWORD']);
    if ($envPassword !== null) {
        $db['password'] = $envPassword;
    }
}

if (!$db || !isset($db['host']) || !isset($db['name'])) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Database configuration incomplete in server/config.local.php']);
    exit;
}

$environment = migrate_environment($config);
$allowDemoMigrations = migrate_allow_demo_migrations($config) && $environment !== 'production';

// Block HTTP access in production — migrations must be run from CLI.
if ($environment === 'production' && PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo json_encode(['ok' => false, 'message' => 'Migration endpoint is disabled for HTTP access in production. Run from CLI: php server/migrate.php']);
    exit;
}

try {
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $db['host'], $db['port'] ?? 3306, $db['name'], $db['charset'] ?? 'utf8mb4');
    $pdo = new PDO($dsn, $db['user'] ?? '', $db['password'] ?? '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'DB connection failed']);
    exit;
}

$migrations = migration_plan($allowDemoMigrations);

// ensure schema_migrations table
$pdo->exec("CREATE TABLE IF NOT EXISTS schema_migrations (id INT AUTO_INCREMENT PRIMARY KEY, migration VARCHAR(255) NOT NULL UNIQUE, executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

$executed = [];
$skipped = [];
$demoSkipped = [];

foreach ($migrations as $migration) {
    $migrationId = $migration['id'];
    $migrationPath = $migration['path'];

    $legacyIds = isset($migration['legacy_ids']) && is_array($migration['legacy_ids'])
        ? $migration['legacy_ids']
        : [];
    $knownIds = array_merge([$migrationId], $legacyIds);

    if (migration_exists($pdo, $knownIds)) {
        ensure_migration_id($pdo, $migrationId);
        $skipped[] = $migrationId;
        continue;
    }

    $isDemoMigration = stripos($migrationId, '_demo_') !== false || $migrationId === '002_database_seed.sql';
    if ($isDemoMigration && !$allowDemoMigrations) {
        $demoSkipped[] = $migrationId;
        continue;
    }

    try {
        execute_sql_script($pdo, $migrationPath);
        ensure_migration_id($pdo, $migrationId);
        $executed[] = $migrationId;
    } catch (Throwable $e) {
        error_log('Migration failed for ' . $migrationId . ': ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'ok' => false,
            'message' => 'Migration failed',
            'migration' => $migrationId,
            'error' => $e->getMessage(),
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }
}

echo json_encode([
    'ok' => true,
    'executed' => $executed,
    'skipped' => $skipped,
    'demo_skipped' => $demoSkipped,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
