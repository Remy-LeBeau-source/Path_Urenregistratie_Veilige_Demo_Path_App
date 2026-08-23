<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';

header('Content-Type: application/json; charset=utf-8');
auth_apply_cors_headers(auth_try_load_raw_config(), 'GET, OPTIONS', 'Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function api_send_json(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function api_require_get_only(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        api_send_json([
            'ok' => false,
            'error' => 'method-not-allowed',
            'message' => 'Only GET is allowed on this endpoint.'
        ], 405);
    }
}

function api_env_value(array $keys): ?string
{
    foreach ($keys as $key) {
        $value = getenv($key);
        if ($value !== false && trim((string)$value) !== '') {
            return trim((string)$value);
        }
    }

    $dotenvPaths = [
        dirname(__DIR__) . '/.env.local',
        dirname(__DIR__) . '/.env',
    ];
    $stage = strtolower(trim((string)getenv('PLAYWRIGHT_STAGE')));
    if ($stage !== '' && in_array($stage, ['dev', 'test', 'acc', 'prod'], true)) {
        $dotenvPaths[] = dirname(__DIR__) . '/environments/' . $stage . '.env';
    }

    foreach ($dotenvPaths as $path) {
        if (!is_file($path)) {
            continue;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            continue;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            $parts = explode('=', $line, 2);
            if (count($parts) !== 2) {
                continue;
            }

            $name = trim($parts[0]);
            $value = trim($parts[1], "\"'");
            if (in_array($name, $keys, true) && $value !== '') {
                return $value;
            }
        }
    }

    return null;
}

function api_load_config(): array
{
    $localConfigPath = dirname(__DIR__) . '/config.local.php';
    if (!file_exists($localConfigPath)) {
        api_send_json([
            'ok' => false,
            'error' => 'missing-config-local',
            'message' => 'Missing server/config.local.php. Copy server/config.example.php to server/config.local.php and fill in credentials.'
        ], 500);
    }

    $config = include $localConfigPath;
    if (!is_array($config)) {
        api_send_json([
            'ok' => false,
            'error' => 'invalid-config',
            'message' => 'server/config.local.php moet een array teruggeven.'
        ], 500);
    }

    $db = [];
    if (isset($config['database']) && is_array($config['database'])) {
        $db = [
            'host' => (string)($config['database']['host'] ?? ''),
            'port' => (int)($config['database']['port'] ?? 3306),
            'name' => (string)($config['database']['name'] ?? ''),
            'user' => (string)($config['database']['user'] ?? ''),
            'password' => (string)($config['database']['password'] ?? ''),
            'charset' => (string)($config['database']['charset'] ?? 'utf8mb4'),
        ];
    } else {
        $db = [
            'host' => (string)($config['host'] ?? ''),
            'port' => (int)($config['port'] ?? 3306),
            'name' => (string)($config['database'] ?? ($config['name'] ?? '')),
            'user' => (string)($config['username'] ?? ($config['user'] ?? '')),
            'password' => (string)($config['password'] ?? ''),
            'charset' => (string)($config['charset'] ?? 'utf8mb4'),
        ];
    }

    $db['host'] = api_env_value(['PATH_APP_DB_HOST', 'PLAYWRIGHT_DB_HOST', 'DB_HOST']) ?? $db['host'];
    $db['port'] = (int)(api_env_value(['PATH_APP_DB_PORT', 'PLAYWRIGHT_DB_PORT', 'DB_PORT']) ?? (string)$db['port']);
    $db['name'] = api_env_value(['PATH_APP_DB_NAME', 'PLAYWRIGHT_DB_NAME', 'DB_NAME']) ?? $db['name'];
    $db['user'] = api_env_value(['PATH_APP_DB_USER', 'PLAYWRIGHT_DB_USER', 'DB_USER']) ?? $db['user'];
    $db['password'] = api_env_value(['PATH_APP_DB_PASSWORD', 'PLAYWRIGHT_DB_PASSWORD', 'DB_PASSWORD']) ?? $db['password'];
    $db['charset'] = api_env_value(['PATH_APP_DB_CHARSET', 'PLAYWRIGHT_DB_CHARSET', 'DB_CHARSET']) ?? $db['charset'];

    return $db;
}

function api_pdo(): PDO
{
    $db = api_load_config();
    if ($db['host'] === '' || $db['name'] === '') {
        api_send_json([
            'ok' => false,
            'error' => 'no-database-config',
            'message' => 'Database configuration in server/config.local.php is incomplete.'
        ], 500);
    }

    try {
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $db['host'],
            $db['port'],
            $db['name'],
            $db['charset']
        );
        return new PDO($dsn, $db['user'], $db['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (Throwable $e) {
        api_send_json([
            'ok' => false,
            'error' => 'db-connection',
            'message' => $e->getMessage()
        ], 500);
    }
}

function api_auth_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = auth_load_raw_config();
    auth_start_session_secure($config);
    $pdo = auth_pdo($config);

    return $pdo;
}

function api_require_authenticated_read_user(PDO $pdo): array
{
    $currentUser = auth_current_user($pdo);
    auth_require_role(['administrator', 'employee'], $currentUser);

    return $currentUser;
}

function api_require_employee_context(PDO $pdo, array $currentUser): array
{
    $stmt = $pdo->prepare(
        'SELECT id, company_id, user_id, full_name, active FROM employees WHERE company_id = :company_id AND user_id = :user_id LIMIT 1'
    );
    $stmt->execute([
        ':company_id' => (int)$currentUser['company_id'],
        ':user_id' => (int)$currentUser['id'],
    ]);

    $employee = $stmt->fetch();
    if (!$employee) {
        api_send_json([
            'ok' => false,
            'error' => 'employee-profile-missing',
            'message' => 'Employee account is not linked to an employee record.',
        ], 403);
    }

    return [
        'id' => (int)$employee['id'],
        'company_id' => (int)$employee['company_id'],
        'user_id' => (int)$employee['user_id'],
        'full_name' => (string)$employee['full_name'],
        'active' => (int)$employee['active'] === 1,
    ];
}

function api_forbidden_company_scope(?int $requestedCompanyId, array $currentUser): void
{
    if ($requestedCompanyId !== null && $requestedCompanyId !== (int)$currentUser['company_id']) {
        api_send_json([
            'ok' => false,
            'error' => 'forbidden-company-scope',
            'message' => 'Requested company scope is not allowed for this session.',
        ], 403);
    }
}
