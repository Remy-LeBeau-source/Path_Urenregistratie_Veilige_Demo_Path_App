<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$authCorsConfig = auth_try_load_raw_config();
auth_apply_cors_headers($authCorsConfig, 'GET, POST, OPTIONS', 'Content-Type, X-CSRF-Token');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function auth_try_load_raw_config(): ?array
{
    $localConfigPath = dirname(__DIR__) . '/config.local.php';
    if (!file_exists($localConfigPath)) {
        return null;
    }

    $config = include $localConfigPath;
    if (!is_array($config)) {
        return null;
    }

    return $config;
}

function auth_environment_from_config(array $config): string
{
    $raw = $config['environment'] ?? ($config['app']['environment'] ?? 'production');
    $environment = strtolower(trim((string)$raw));
    return $environment !== '' ? $environment : 'production';
}

function auth_app_origin_from_config(array $config): string
{
    $origin = trim((string)($config['app_origin'] ?? ($config['app']['app_origin'] ?? '')));
    if ($origin === '') {
        $baseUrl = trim((string)($config['app']['base_url'] ?? ''));
        if ($baseUrl !== '') {
            $parts = parse_url($baseUrl);
            if (is_array($parts) && isset($parts['scheme'], $parts['host'])) {
                $origin = $parts['scheme'] . '://' . $parts['host'];
                if (isset($parts['port'])) {
                    $origin .= ':' . (int)$parts['port'];
                }
            }
        }
    }

    return rtrim($origin, '/');
}

function auth_allowed_cors_origins(?array $config): array
{
    $cfg = is_array($config) ? $config : [];
    $environment = auth_environment_from_config($cfg);
    $appOrigin = auth_app_origin_from_config($cfg);

    $origins = [];
    if (in_array($environment, ['local', 'test', 'development', 'dev', 'demo'], true)) {
        $origins[] = 'http://localhost:8000';
        $origins[] = 'http://127.0.0.1:8000';
    }
    if ($appOrigin !== '') {
        $origins[] = $appOrigin;
    }

    return array_values(array_unique($origins));
}

function auth_apply_cors_headers(?array $config, string $methods, string $headers): void
{
    $origin = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
    $allowedOrigins = auth_allowed_cors_origins($config);
    if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: ' . $methods);
    header('Access-Control-Allow-Headers: ' . $headers);
}

function auth_send_json(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function auth_require_method(string $method): void
{
    if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== strtoupper($method)) {
        auth_send_json([
            'ok' => false,
            'error' => 'method-not-allowed',
            'message' => 'Expected HTTP ' . strtoupper($method) . '.',
        ], 405);
    }
}

function auth_load_raw_config(): array
{
    $config = auth_try_load_raw_config();
    if ($config === null) {
        auth_send_json([
            'ok' => false,
            'error' => 'missing-config-local',
            'message' => 'Missing server/config.local.php. Copy server/config.example.php to server/config.local.php and fill in credentials.',
        ], 500);
    }

    return $config;
}

function auth_db_from_config(array $config): array
{
    if (isset($config['database']) && is_array($config['database']) && isset($config['database']['host'])) {
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

function auth_pdo(array $config): PDO
{
    $db = auth_db_from_config($config);
    if ($db['host'] === '' || $db['name'] === '') {
        auth_send_json([
            'ok' => false,
            'error' => 'no-database-config',
            'message' => 'Database configuration in server/config.local.php is incomplete.',
        ], 500);
    }

    try {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $db['host'], $db['port'], $db['name'], $db['charset']);
        return new PDO($dsn, $db['user'], $db['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (Throwable $e) {
        auth_send_json([
            'ok' => false,
            'error' => 'db-connection',
            'message' => 'Could not connect to database.',
        ], 500);
    }
}

function auth_start_session_secure(array $config): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $security = isset($config['security']) && is_array($config['security']) ? $config['security'] : [];
    $cookieName = (string)($security['session_cookie_name'] ?? 'path_session');
    $lifetimeMinutes = (int)($security['session_lifetime_minutes'] ?? 480);
    if ($lifetimeMinutes < 15) {
        $lifetimeMinutes = 15;
    }

    $host = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    $host = preg_replace('/:\\d+$/', '', $host) ?? '';
    $isLocalHost = in_array($host, ['localhost', '127.0.0.1', '::1'], true);
    $isHttps = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off');
    $requireHttps = (bool)($security['require_https'] ?? false);
    $secureCookie = $isHttps || ($requireHttps && !$isLocalHost);

    session_name($cookieName);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');

    session_set_cookie_params([
        'lifetime' => $lifetimeMinutes * 60,
        'path' => '/',
        'domain' => '',
        'secure' => $secureCookie,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();

    // Check inactivity timeout BEFORE updating timestamp; then slide the window forward.
    if (isset($_SESSION['_last_active']) && (time() - (int)$_SESSION['_last_active']) > ($lifetimeMinutes * 60)) {
        auth_clear_session();
        return;
    }
    $_SESSION['_last_active'] = time();
}

function auth_client_ip(): string
{
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    return substr($ip, 0, 45);
}

function auth_user_agent(): string
{
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    return substr($ua, 0, 255);
}

function auth_log_event(PDO $pdo, ?int $companyId, ?int $userId, string $email, string $eventType, string $status, string $message = ''): void
{
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO auth_login_audit (company_id, user_id, email, event_type, status, ip_address, user_agent, message) VALUES (:company_id, :user_id, :email, :event_type, :status, :ip_address, :user_agent, :message)'
        );
        $stmt->execute([
            ':company_id' => $companyId,
            ':user_id' => $userId,
            ':email' => $email !== '' ? $email : null,
            ':event_type' => $eventType,
            ':status' => $status,
            ':ip_address' => auth_client_ip(),
            ':user_agent' => auth_user_agent(),
            ':message' => $message !== '' ? substr($message, 0, 255) : null,
        ]);
    } catch (Throwable $e) {
        // Logging must never block auth flows.
    }
}

function auth_session_user(): ?array
{
    if (!isset($_SESSION['auth']) || !is_array($_SESSION['auth'])) {
        return null;
    }
    return $_SESSION['auth'];
}

function auth_current_user(PDO $pdo): ?array
{
    $sessionUser = auth_session_user();
    if (!$sessionUser || !isset($sessionUser['user_id'])) {
        return null;
    }

    $stmt = $pdo->prepare('SELECT id, company_id, email, display_name, role, active FROM users WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => (int)$sessionUser['user_id']]);
    $user = $stmt->fetch();
    if (!$user || (int)$user['active'] !== 1) {
        return null;
    }

    return [
        'id' => (int)$user['id'],
        'company_id' => (int)$user['company_id'],
        'email' => (string)$user['email'],
        'display_name' => (string)$user['display_name'],
        'role' => (string)$user['role'],
    ];
}

function auth_require_role(array $allowedRoles, ?array $currentUser): void
{
    if (!$currentUser) {
        auth_send_json([
            'ok' => false,
            'error' => 'not-authenticated',
            'message' => 'No active session.',
        ], 401);
    }

    $role = (string)($currentUser['role'] ?? '');
    if (!in_array($role, $allowedRoles, true)) {
        auth_send_json([
            'ok' => false,
            'error' => 'forbidden',
            'message' => 'Role is not allowed for this endpoint.',
        ], 403);
    }
}

function auth_clear_session(): void
{
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'] ?? '/',
            $params['domain'] ?? '',
            (bool)($params['secure'] ?? false),
            (bool)($params['httponly'] ?? true)
        );
    }

    session_destroy();
}
