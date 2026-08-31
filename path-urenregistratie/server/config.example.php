<?php

declare(strict_types=1);

return [
    'environment' => 'production',
    'app_origin' => 'https://uren.pathconsultancy.nl',
    'allow_demo_migrations' => false,
    'app' => [
        'environment' => 'production',
        'base_url' => 'https://uren.pathconsultancy.nl',
        'app_origin' => 'https://uren.pathconsultancy.nl',
        'timezone' => 'Europe/Amsterdam',
    ],
    'database' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'path_urenregistratie',
        'user' => 'replace_me',
        'password' => 'replace_me',
        'charset' => 'utf8mb4',
    ],
    'security' => [
        'session_cookie_name' => 'path_session',
        'session_lifetime_minutes' => 480,
        'require_https' => true,
        'allowed_google_domain' => 'pathconsultancy.nl',
        'cors_allowed_origins' => ['https://uren.pathconsultancy.nl'],
        'content_security_policy' => "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self' blob:",
        // HSTS is prepared but intentionally disabled until HTTPS production rollout is confirmed.
        'hsts_enabled' => false,
        'hsts_max_age' => 31536000,
        'hsts_include_subdomains' => true,
        'hsts_preload' => false,
    ],
    // Every path below must resolve outside the public document root.
    'storage' => [
        'private_root' => dirname(__DIR__) . '/../path-private',
        'backup_dir' => dirname(__DIR__) . '/../path-private/backups',
        'log_dir' => dirname(__DIR__) . '/../path-private/logs',
    ],
    'logging' => [
        'enabled' => true,
        'display_errors' => false,
        'error_log' => dirname(__DIR__) . '/../path-private/logs/php-error.log',
        'retention_days' => 30,
        'rotate_max_bytes' => 10 * 1024 * 1024,
    ],
    // Mail: keep mail.enabled = false until SPF/DKIM/DMARC is verified and dispatch is activated.
    // transport options: dry_run | smtp_relay
    // smtp_relay uses Google Workspace SMTP Relay (smtp-relay.gmail.com:587, STARTTLS, IP-based auth).
    // No username or password: authentication is handled by the registered outgoing TransIP IP.
    'mail' => [
        'enabled' => false,              // set to true to enable real SMTP dispatch
        // disabled = no production mail; pilot = allowlist only; live = normal business recipients.
        'production_mode' => 'disabled',
        // TEST may send only when this switch is true and every recipient is
        // listed below. Production pilot mode uses the same exact allowlist.
        'test_delivery_enabled' => false,
        'allowed_recipients' => [],
        // Guarded TEST may redirect every ordinary application message to one
        // allowlisted sink. Production ignores these keys.
        'test_redirect_all' => false,
        'test_sink_recipient' => '',
        // Acceptance mail is a separate, fail-closed admin console. Enabling it
        // still requires mail.enabled plus an exact allowed_recipients match.
        'acceptance_test' => [
            'enabled' => false,
            'business_recipient' => '',
            'password_reset_recipient' => '',
            'invitation_recipient' => '',
        ],
        'transport' => 'smtp_relay',
        'smtp_relay' => [
            'host'       => 'smtp-relay.gmail.com',
            'port'       => 587,
            'encryption' => 'starttls',   // always; required by Google
            'timeout'    => 30,
            'from_email' => 'backoffice@pathconsultancy.nl',
            'from_name'  => 'Path Consultancy',
            // No username / no password — IP-based relay only.
        ],
        'max_attempts' => 3,
    ],
];
