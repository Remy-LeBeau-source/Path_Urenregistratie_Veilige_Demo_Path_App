<?php

declare(strict_types=1);

function ops_require_cli(): void
{
    if (PHP_SAPI !== 'cli') {
        http_response_code(403);
        exit("CLI only.\n");
    }
}

/** @return array<string,string|bool> */
function ops_options(array $argv): array
{
    $options = [];
    foreach (array_slice($argv, 1) as $argument) {
        if (!str_starts_with($argument, '--')) {
            continue;
        }
        $parts = explode('=', substr($argument, 2), 2);
        $options[$parts[0]] = $parts[1] ?? true;
    }
    return $options;
}

function ops_config_path(array $options): string
{
    return isset($options['config']) && is_string($options['config'])
        ? $options['config']
        : dirname(__DIR__) . '/config.local.php';
}

function ops_load_config(array $options): array
{
    $path = ops_config_path($options);
    if (!is_file($path)) {
        throw new RuntimeException('Config file not found: ' . $path);
    }
    $config = require $path;
    if (!is_array($config)) {
        throw new RuntimeException('Config file must return an array.');
    }
    return $config;
}

/**
 * Zelfde precedentie als auth_env_value() in server/auth/session.php: eerst
 * een echte omgevingsvariabele, anders een regel uit .env.local/.env/
 * environments/<stage>.env. Nodig omdat de Playwright-harness de webserver en
 * losse CLI-scripts (deze scheduler, debug-tools) door dezelfde
 * PATH_APP_DB_ en PLAYWRIGHT_DB_-variabelen naar de geisoleerde testdatabase
 * moet sturen -- zonder dit las een los `php send-due-reminders.php`
 * gewoon de statische server/config.local.php en keek het naar een heel
 * andere (grotendeels lege) database dan de webserver die de suite bedient.
 */
function ops_env_value(array $keys): ?string
{
    foreach ($keys as $key) {
        $value = getenv($key);
        if ($value !== false && trim((string)$value) !== '') {
            return trim((string)$value);
        }
    }

    $root = dirname(__DIR__);
    $dotenvPaths = [$root . '/.env.local', $root . '/.env'];
    $stage = strtolower(trim((string)getenv('PLAYWRIGHT_STAGE')));
    if (in_array($stage, ['dev', 'test', 'acc', 'prod'], true)) {
        $dotenvPaths[] = $root . '/environments/' . $stage . '.env';
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

/** @return array{host:string,port:int,name:string,user:string,password:string,charset:string} */
function ops_database_config(array $config): array
{
    $database = isset($config['database']) && is_array($config['database']) ? $config['database'] : [];
    $db = [
        'host' => (string)($database['host'] ?? ($config['host'] ?? '')),
        'port' => (int)($database['port'] ?? ($config['port'] ?? 3306)),
        'name' => (string)($database['name'] ?? (is_string($config['database'] ?? null) ? $config['database'] : '')),
        'user' => (string)($database['user'] ?? ($config['username'] ?? ($config['user'] ?? ''))),
        'password' => (string)($database['password'] ?? ($config['password'] ?? '')),
        'charset' => (string)($database['charset'] ?? ($config['charset'] ?? 'utf8mb4')),
    ];

    $db['host'] = ops_env_value(['PATH_APP_DB_HOST', 'PLAYWRIGHT_DB_HOST', 'DB_HOST']) ?? $db['host'];
    $db['port'] = (int)(ops_env_value(['PATH_APP_DB_PORT', 'PLAYWRIGHT_DB_PORT', 'DB_PORT']) ?? (string)$db['port']);
    $db['name'] = ops_env_value(['PATH_APP_DB_NAME', 'PLAYWRIGHT_DB_NAME', 'DB_NAME']) ?? $db['name'];
    $db['user'] = ops_env_value(['PATH_APP_DB_USER', 'PLAYWRIGHT_DB_USER', 'DB_USER']) ?? $db['user'];
    $db['password'] = ops_env_value(['PATH_APP_DB_PASSWORD', 'PLAYWRIGHT_DB_PASSWORD', 'DB_PASSWORD']) ?? $db['password'];
    $db['charset'] = ops_env_value(['PATH_APP_DB_CHARSET', 'PLAYWRIGHT_DB_CHARSET', 'DB_CHARSET']) ?? $db['charset'];

    return $db;
}

function ops_pdo(array $config): PDO
{
    $db = ops_database_config($config);
    if ($db['host'] === '' || $db['name'] === '' || $db['user'] === '') {
        throw new RuntimeException('Database configuration is incomplete.');
    }
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $db['host'], $db['port'], $db['name'], $db['charset']);
    return new PDO($dsn, $db['user'], $db['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

function ops_private_root(array $config): string
{
    $configured = trim((string)($config['storage']['private_root'] ?? ''));
    return $configured !== '' ? rtrim($configured, '/\\') : dirname(__DIR__, 2) . '/../path-private';
}

function ops_normalize_path(string $path): string
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

function ops_is_outside_webroot(string $path): bool
{
    $webroot = realpath(dirname(__DIR__, 2));
    $parent = realpath(dirname($path));
    if ($webroot === false || $parent === false) {
        $webroot = ops_normalize_path(dirname(__DIR__, 2));
        $path = ops_normalize_path($path);
        return !str_starts_with($path . '/', rtrim($webroot, '/') . '/');
    }
    return !str_starts_with($parent . DIRECTORY_SEPARATOR, rtrim($webroot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR);
}

/** Execute without a command shell; sensitive values belong in $environment, never command arguments. */
function ops_run_process(array $command, array $environment = [], $stdin = null): array
{
    $descriptors = [
        0 => $stdin === null ? ['pipe', 'r'] : $stdin,
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $inheritedEnvironment = getenv();
    $process = proc_open(
        $command,
        $descriptors,
        $pipes,
        null,
        array_merge(is_array($inheritedEnvironment) ? $inheritedEnvironment : [], $environment)
    );
    if (!is_resource($process)) {
        throw new RuntimeException('Unable to start process.');
    }
    if ($stdin === null) {
        fclose($pipes[0]);
    }
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exitCode = proc_close($process);
    return ['exit_code' => $exitCode, 'stdout' => (string)$stdout, 'stderr' => (string)$stderr];
}

function ops_print(array $payload, int $exitCode = 0): never
{
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
    exit($exitCode);
}

ops_require_cli();
