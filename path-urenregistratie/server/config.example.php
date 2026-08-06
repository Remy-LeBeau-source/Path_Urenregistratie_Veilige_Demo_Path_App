<?php

declare(strict_types=1);

return [
    'app' => [
        'environment' => 'demo',
        'base_url' => 'https://uren.example.invalid',
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
    'google' => [
        'client_id' => 'replace_me',
        'client_secret' => 'replace_me',
        'redirect_uri' => 'https://uren.example.invalid/auth/google/callback',
        'sender_email' => 'backoffice@example.invalid',
    ],
    'security' => [
        'session_cookie_name' => 'path_session',
        'session_lifetime_minutes' => 480,
        'require_https' => true,
        'allowed_google_domain' => 'example.invalid',
    ],
];
