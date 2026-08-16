<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../auth/password-reset-service.php';

function policy_config(string $environment, bool $enabled, bool $testEnabled, array $recipients): array
{
    return [
        'environment' => $environment,
        'app_origin' => 'https://uren-test.pathconsultancy.nl',
        'app' => ['app_origin' => 'https://uren-test.pathconsultancy.nl'],
        'mail' => [
            'enabled' => $enabled,
            'test_delivery_enabled' => $testEnabled,
            'allowed_recipients' => $recipients,
            'transport' => 'smtp_relay',
            'smtp_relay' => [
                'host' => 'smtp-relay.gmail.com',
                'port' => 587,
                'encryption' => 'starttls',
                'from_email' => 'backoffice@pathconsultancy.nl',
            ],
        ],
    ];
}

$allowedAddress = 'backoffice@pathconsultancy.nl';
$production = policy_config('production', true, false, []);
$testClosed = policy_config('test', true, false, []);
$testGuarded = policy_config('test', true, true, [$allowedAddress]);
$development = policy_config('development', true, true, [$allowedAddress]);
$guardedResponse = auth_password_reset_public_response($testGuarded, str_repeat('a', 64), '2099-01-01 00:00:00');
$closedResponse = auth_password_reset_public_response($testClosed, str_repeat('b', 64), '2099-01-01 00:00:00');

$checks = [
    'production_enabled_without_allowlist' => mail_real_delivery_allowed_for_environment($production),
    'test_without_guard_is_blocked' => !mail_real_delivery_allowed_for_environment($testClosed),
    'test_without_guard_has_config_error' => mail_validate_relay_config($testClosed) !== [],
    'guarded_test_is_enabled' => mail_real_delivery_allowed_for_environment($testGuarded),
    'guarded_test_config_is_valid' => mail_validate_relay_config($testGuarded) === [],
    'allowlisted_recipient_is_allowed' => mail_recipient_is_allowed($testGuarded, strtoupper($allowedAddress)),
    'other_recipient_is_blocked' => !mail_recipient_is_allowed($testGuarded, 'ander@example.com'),
    'cc_outside_allowlist_is_blocked' => mail_validate_delivery_recipients(
        $testGuarded,
        $allowedAddress,
        'ander@example.com'
    ) !== [],
    'development_remains_blocked' => !mail_real_delivery_allowed_for_environment($development),
    'development_enabled_has_config_error' => mail_validate_relay_config($development) !== [],
    'guarded_test_reset_uses_real_delivery' => ($guardedResponse['dry_run'] ?? true) === false
        && ($guardedResponse['delivery_available'] ?? false) === true
        && !array_key_exists('token', $guardedResponse),
    'closed_test_reset_returns_local_token' => ($closedResponse['dry_run'] ?? false) === true
        && ($closedResponse['delivery_available'] ?? true) === false
        && ($closedResponse['token'] ?? '') === str_repeat('b', 64),
];

$ok = !in_array(false, $checks, true);
echo json_encode([
    'ok' => $ok,
    'writes_performed' => false,
    'network_connections' => 0,
    'checks' => $checks,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
exit($ok ? 0 : 1);
