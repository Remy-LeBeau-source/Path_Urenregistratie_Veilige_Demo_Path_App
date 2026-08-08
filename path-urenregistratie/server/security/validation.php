<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';

function security_read_json_body(): array
{
    $raw = (string)file_get_contents('php://input');
    if ($raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-json',
            'message' => 'Request body must be valid JSON.',
        ], 400);
    }

    return $decoded;
}

function security_require_string_field(array $payload, string $field, string $message, int $maxLength = 0): string
{
    $value = trim((string)($payload[$field] ?? ''));

    if ($value === '') {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => $message,
        ], 400);
    }

    if ($maxLength > 0 && strlen($value) > $maxLength) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => $message,
        ], 400);
    }

    return $value;
}

function security_require_email_field(array $payload, string $field = 'email'): string
{
    $value = security_require_string_field($payload, $field, 'Email is required.', 254);
    if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'Email is invalid.',
        ], 400);
    }

    return $value;
}

function security_require_enum_field(array $payload, string $field, array $allowedValues, string $message): string
{
    $value = security_require_string_field($payload, $field, $message, 100);
    if (!in_array($value, $allowedValues, true)) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => $message,
        ], 400);
    }

    return $value;
}