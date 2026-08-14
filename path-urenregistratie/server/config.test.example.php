<?php

declare(strict_types=1);

$privateRoot = dirname(__DIR__) . '/../path-test-private';
$origin = 'https://uren-test.pathconsultancy.nl';

return [
    'environment' => 'test',
    'app_origin' => $origin,
    'allow_demo_migrations' => true,
    'app' => [
        'environment' => 'test',
        'base_url' => $origin,
        'app_origin' => $origin,
        'timezone' => 'Europe/Amsterdam',
    ],
    'database' => [
        'host' => 'pathco-urentest.db.transip.me',
        'port' => 3306,
        'name' => 'pathco_Urentest',
        'user' => 'pathco_UrenTestUser',
        'password' => 'replace_me',
        'charset' => 'utf8mb4',
    ],
    'security' => [
        'session_cookie_name' => 'path_test_session',
        'session_lifetime_minutes' => 480,
        'require_https' => true,
        'allowed_google_domain' => 'pathconsultancy.nl',
        'cors_allowed_origins' => [$origin],
        'content_security_policy' => "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self' blob:",
        'hsts_enabled' => false,
        'hsts_max_age' => 31536000,
        'hsts_include_subdomains' => false,
        'hsts_preload' => false,
    ],
    'storage' => [
        'private_root' => $privateRoot,
        'backup_dir' => $privateRoot . '/backups',
        'log_dir' => $privateRoot . '/logs',
    ],
    'logging' => [
        'enabled' => true,
        'display_errors' => false,
        'error_log' => $privateRoot . '/logs/php-error.log',
        'retention_days' => 30,
        'rotate_max_bytes' => 10 * 1024 * 1024,
    ],
    'mail' => [
        'enabled' => false,
        'test_delivery_enabled' => false,
        'allowed_recipients' => [],
        'acceptance_test' => [
            'enabled' => false,
            'business_recipient' => '',
            'password_reset_recipient' => '',
            'invitation_recipient' => '',
        ],
        'transport' => 'smtp_relay',
        'smtp_relay' => [
            'host' => 'smtp-relay.gmail.com',
            'port' => 587,
            'encryption' => 'starttls',
            'timeout' => 30,
            'from_email' => 'backoffice@pathconsultancy.nl',
            'from_name' => 'Path Consultancy TEST',
        ],
        'max_attempts' => 3,
    ],
];
