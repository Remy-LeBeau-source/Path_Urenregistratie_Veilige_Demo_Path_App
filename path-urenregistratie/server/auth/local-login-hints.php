<?php

declare(strict_types=1);

require __DIR__ . '/session.php';

auth_require_method('GET');

function local_login_hints_is_loopback_host(): bool
{
    $host = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    $host = preg_replace('/:\d+$/', '', $host) ?? '';
    return in_array($host, ['localhost', '127.0.0.1', '::1'], true);
}

function local_login_hints_is_loopback_client(): bool
{
    $remote = strtolower((string)($_SERVER['REMOTE_ADDR'] ?? ''));
    return in_array($remote, ['127.0.0.1', '::1'], true);
}

function local_login_hints_is_guarded_test_host(): bool
{
    $host = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    $host = preg_replace('/:\d+$/', '', $host) ?? '';
    if ($host !== 'uren-test.pathconsultancy.nl') {
        return false;
    }

    $config = auth_try_load_raw_config();
    if (!is_array($config)) {
        return false;
    }
    return auth_environment_from_config($config) === 'test'
        && auth_app_origin_from_config($config) === 'https://uren-test.pathconsultancy.nl'
        && ($config['allow_demo_migrations'] ?? false) === true;
}

function local_login_hints_load_env_map(): array
{
    $envMap = [];
    $paths = [
        dirname(__DIR__, 2) . '/.env.local',
        dirname(__DIR__, 2) . '/.env',
    ];

    foreach ($paths as $path) {
        if (!is_file($path)) {
            continue;
        }

        $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            continue;
        }

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                continue;
            }

            $separator = strpos($trimmed, '=');
            if ($separator === false) {
                continue;
            }

            $key = trim(substr($trimmed, 0, $separator));
            $value = trim(substr($trimmed, $separator + 1));
            if ($key === '') {
                continue;
            }

            if (strlen($value) >= 2) {
                $first = $value[0];
                $last = $value[strlen($value) - 1];
                if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                    $value = substr($value, 1, -1);
                }
            }

            $envMap[$key] = $value;
        }
    }

    return $envMap;
}

if ((!local_login_hints_is_loopback_host() || !local_login_hints_is_loopback_client())
    && !local_login_hints_is_guarded_test_host()) {
    auth_send_json(['ok' => false, 'error' => 'not-found'], 404);
}

$envMap = local_login_hints_load_env_map();
$guardedTest = local_login_hints_is_guarded_test_host();
$adminPassword = $guardedTest
    ? 'LocalDemoAdmin2026'
    : trim((string)(getenv('PLAYWRIGHT_ADMIN_PASSWORD') ?: ($envMap['PLAYWRIGHT_ADMIN_PASSWORD'] ?? '')));
$employeePassword = $guardedTest
    ? 'LocalDemoEmployee2026'
    : trim((string)(getenv('PLAYWRIGHT_EMPLOYEE_PASSWORD') ?: ($envMap['PLAYWRIGHT_EMPLOYEE_PASSWORD'] ?? '')));

header('Cache-Control: no-store, private');

auth_send_json([
    'ok' => true,
    'enabled' => ($adminPassword !== '' || $employeePassword !== ''),
    'adminPassword' => $adminPassword,
    'employeePassword' => $employeePassword,
]);
