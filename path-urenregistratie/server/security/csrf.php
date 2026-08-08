<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';

function security_csrf_token_key(): string
{
    return 'auth_csrf_token';
}

function security_csrf_token(): string
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        auth_send_json([
            'ok' => false,
            'error' => 'session-not-started',
            'message' => 'Session must be started before issuing a CSRF token.',
        ], 500);
    }

    $tokenKey = security_csrf_token_key();
    if (!isset($_SESSION[$tokenKey]) || !is_string($_SESSION[$tokenKey]) || $_SESSION[$tokenKey] === '') {
        $_SESSION[$tokenKey] = bin2hex(random_bytes(32));
    }

    return (string)$_SESSION[$tokenKey];
}

function security_csrf_payload(): array
{
    return [
        'csrf_token' => security_csrf_token(),
    ];
}

function security_read_csrf_token(): string
{
    return trim((string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''));
}

function security_require_csrf_token(): void
{
    $expected = security_csrf_token();
    $provided = security_read_csrf_token();

    if ($provided === '' || !hash_equals($expected, $provided)) {
        auth_send_json([
            'ok' => false,
            'error' => 'csrf-invalid',
            'message' => 'Missing or invalid CSRF token.',
        ], 403);
    }
}