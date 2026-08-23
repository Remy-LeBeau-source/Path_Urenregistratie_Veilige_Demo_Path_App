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
    foreach (['PATH_APP_ENVIRONMENT', 'PLAYWRIGHT_ENVIRONMENT', 'APP_ENV', 'PLAYWRIGHT_STAGE'] as $key) {
        $override = getenv($key);
        if ($override !== false && trim((string)$override) !== '') {
            $environment = strtolower(trim((string)$override));
            return $environment !== '' ? $environment : 'production';
        }
    }
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
    $security = isset($cfg['security']) && is_array($cfg['security']) ? $cfg['security'] : [];

    $origins = [];
    if (in_array($environment, ['local', 'test', 'development', 'dev', 'demo'], true)) {
        $origins[] = 'http://localhost:8000';
        $origins[] = 'http://127.0.0.1:8000';
    }
    if ($appOrigin !== '') {
        $origins[] = $appOrigin;
    }

    $configuredOrigins = $security['cors_allowed_origins'] ?? [];
    if (is_string($configuredOrigins) && trim($configuredOrigins) !== '') {
        $configuredOrigins = array_map('trim', explode(',', $configuredOrigins));
    }
    if (is_array($configuredOrigins)) {
        foreach ($configuredOrigins as $configuredOrigin) {
            $value = rtrim(trim((string)$configuredOrigin), '/');
            if ($value !== '') {
                $origins[] = $value;
            }
        }
    }

    return array_values(array_unique($origins));
}

function auth_apply_security_headers(?array $config): void
{
    $cfg = is_array($config) ? $config : [];
    $security = isset($cfg['security']) && is_array($cfg['security']) ? $cfg['security'] : [];

    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: no-referrer');
    header('Permissions-Policy: geolocation=(), camera=(), microphone=()');

    $csp = trim((string)($security['content_security_policy'] ?? ''));
    if ($csp !== '') {
        header('Content-Security-Policy: ' . $csp);
    }

    $hstsEnabled = (bool)($security['hsts_enabled'] ?? false);
    if ($hstsEnabled) {
        $isHttps = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off');
        if ($isHttps) {
            $maxAge = max(300, (int)($security['hsts_max_age'] ?? 31536000));
            $includeSubdomains = (bool)($security['hsts_include_subdomains'] ?? true);
            $preload = (bool)($security['hsts_preload'] ?? false);

            $value = 'max-age=' . $maxAge;
            if ($includeSubdomains) {
                $value .= '; includeSubDomains';
            }
            if ($preload) {
                $value .= '; preload';
            }

            header('Strict-Transport-Security: ' . $value);
        }
    }
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
    auth_apply_security_headers($config);
}

function auth_private_root_from_config(array $config): string
{
    $configured = trim((string)($config['storage']['private_root'] ?? ''));
    if ($configured !== '') {
        return $configured;
    }

    if (auth_environment_from_config($config) === 'test') {
        $testRoot = trim((string)getenv('PATH_APP_PRIVATE_ROOT'));
        if ($testRoot !== '') {
            return $testRoot;
        }
    }

    return dirname(__DIR__, 2) . '/../path-private';
}

function auth_normalize_filesystem_path(string $path): string
{
    $value = str_replace('\\', '/', $path);
    $prefix = str_starts_with($value, '/') ? '/' : '';
    if (preg_match('/^[A-Za-z]:/', $value, $match)) {
        $prefix = strtoupper($match[0]) . '/';
        $value = substr($value, 2);
    }
    $segments = [];
    foreach (explode('/', $value) as $segment) {
        if ($segment === '' || $segment === '.') {
            continue;
        }
        if ($segment === '..') {
            array_pop($segments);
            continue;
        }
        $segments[] = $segment;
    }
    return $prefix . implode('/', $segments);
}

/** Configure PHP error logging without exposing errors in production responses. */
function auth_configure_runtime_logging(array $config): void
{
    $logging = isset($config['logging']) && is_array($config['logging']) ? $config['logging'] : [];
    $production = auth_environment_from_config($config) === 'production';
    $enabled = ($logging['enabled'] ?? $production) === true;

    ini_set('display_errors', ($logging['display_errors'] ?? false) === true && !$production ? '1' : '0');
    ini_set('log_errors', $enabled ? '1' : '0');
    if (!$enabled) {
        return;
    }

    $path = trim((string)($logging['error_log'] ?? ''));
    if ($path === '') {
        $path = dirname(__DIR__, 2) . '/../path-private/logs/php-error.log';
    }
    $publicRoot = auth_normalize_filesystem_path((string)(realpath(dirname(__DIR__, 2)) ?: dirname(__DIR__, 2)));
    $normalizedPath = auth_normalize_filesystem_path($path);
    if (str_starts_with($normalizedPath . '/', rtrim($publicRoot, '/') . '/')) {
        // Never direct production logs into the public application tree.
        return;
    }
    $directory = dirname($path);
    if (!is_dir($directory)) {
        @mkdir($directory, 0750, true);
    }
    if (is_dir($directory) && is_writable($directory)) {
        ini_set('error_log', $path);
    }
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

function auth_env_value(array $keys): ?string
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

function auth_db_from_config(array $config): array
{
    $db = [];
    if (isset($config['database']) && is_array($config['database']) && isset($config['database']['host'])) {
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

    $db['host'] = auth_env_value(['PATH_APP_DB_HOST', 'PLAYWRIGHT_DB_HOST', 'DB_HOST']) ?? $db['host'];
    $db['port'] = (int)(auth_env_value(['PATH_APP_DB_PORT', 'PLAYWRIGHT_DB_PORT', 'DB_PORT']) ?? (string)$db['port']);
    $db['name'] = auth_env_value(['PATH_APP_DB_NAME', 'PLAYWRIGHT_DB_NAME', 'DB_NAME']) ?? $db['name'];
    $db['user'] = auth_env_value(['PATH_APP_DB_USER', 'PLAYWRIGHT_DB_USER', 'DB_USER']) ?? $db['user'];
    $db['password'] = auth_env_value(['PATH_APP_DB_PASSWORD', 'PLAYWRIGHT_DB_PASSWORD', 'DB_PASSWORD']) ?? $db['password'];
    $db['charset'] = auth_env_value(['PATH_APP_DB_CHARSET', 'PLAYWRIGHT_DB_CHARSET', 'DB_CHARSET']) ?? $db['charset'];

    return $db;
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
            'message' => 'Er kon geen verbinding met de database worden gemaakt.',
        ], 500);
    }
}

function auth_start_session_secure(array $config): void
{
    auth_configure_runtime_logging($config);
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
