<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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
            'message' => 'server/config.local.php must return an array.'
        ], 500);
    }

    if (isset($config['database']) && is_array($config['database'])) {
        return [
            'host' => (string)($config['database']['host'] ?? ''),
            'port' => (int)($config['database']['port'] ?? 3306),
            'name' => (string)($config['database']['name'] ?? ''),
            'user' => (string)($config['database']['user'] ?? ''),
            'password' => (string)($config['database']['password'] ?? ''),
            'charset' => (string)($config['database']['charset'] ?? 'utf8mb4'),
        ];
    }

    return [
        'host' => (string)($config['host'] ?? ''),
        'port' => (int)($config['port'] ?? 3306),
        'name' => (string)($config['database'] ?? ($config['name'] ?? '')),
        'user' => (string)($config['username'] ?? ($config['user'] ?? '')),
        'password' => (string)($config['password'] ?? ''),
        'charset' => (string)($config['charset'] ?? 'utf8mb4'),
    ];
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
