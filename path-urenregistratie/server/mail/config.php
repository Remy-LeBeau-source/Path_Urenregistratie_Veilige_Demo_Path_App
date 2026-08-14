<?php

declare(strict_types=1);

/** Max delivery attempts before a failed item can no longer be retried. */
const MAIL_MAX_ATTEMPTS = 3;

/**
 * Returns true when real dispatch must be suppressed.
 * Defaults to true until mail.enabled is explicitly set in config.
 */
function mail_is_dry_run(array $config): bool
{
    if (isset($config['mail']) && is_array($config['mail'])) {
        return ($config['mail']['enabled'] ?? false) !== true;
    }
    // Legacy flat key.
    if (array_key_exists('mail_dry_run', $config)) {
        return (bool)$config['mail_dry_run'];
    }
    return true;
}

/** Real delivery is allowed only for the explicitly enabled SMTP relay transport. */
function mail_is_smtp_relay_enabled(array $config): bool
{
    $mail = isset($config['mail']) && is_array($config['mail']) ? $config['mail'] : [];
    return ($mail['enabled'] ?? false) === true
        && strtolower(trim((string)($mail['transport'] ?? ''))) === 'smtp_relay';
}

function mail_environment(array $config): string
{
    return strtolower(trim((string)($config['environment'] ?? ($config['app']['environment'] ?? 'production'))));
}

/** @return list<string> */
function mail_allowed_recipients(array $config): array
{
    $mail = isset($config['mail']) && is_array($config['mail']) ? $config['mail'] : [];
    $configured = isset($mail['allowed_recipients']) && is_array($mail['allowed_recipients'])
        ? $mail['allowed_recipients']
        : [];
    $normalized = [];
    foreach ($configured as $recipient) {
        $email = strtolower(trim((string)$recipient));
        if ($email !== '' && !in_array($email, $normalized, true)) {
            $normalized[] = $email;
        }
    }
    return $normalized;
}

/**
 * Production may deliver when SMTP is enabled. TEST additionally requires an
 * explicit opt-in and a non-empty recipient allowlist. Every other environment
 * remains fail-closed even if mail.enabled is accidentally changed.
 */
function mail_real_delivery_allowed_for_environment(array $config): bool
{
    if (!mail_is_smtp_relay_enabled($config)) {
        return false;
    }
    $environment = mail_environment($config);
    if ($environment === 'production') {
        return true;
    }
    $mail = isset($config['mail']) && is_array($config['mail']) ? $config['mail'] : [];
    return $environment === 'test'
        && ($mail['test_delivery_enabled'] ?? false) === true
        && mail_allowed_recipients($config) !== [];
}

function mail_recipient_is_allowed(array $config, string $email): bool
{
    if (mail_environment($config) === 'production') {
        return true;
    }
    return in_array(strtolower(trim($email)), mail_allowed_recipients($config), true);
}

function mail_test_sink_recipient(array $config): ?string
{
    if (mail_environment($config) !== 'test') {
        return null;
    }
    $mail = isset($config['mail']) && is_array($config['mail']) ? $config['mail'] : [];
    $recipient = strtolower(trim((string)($mail['test_sink_recipient'] ?? '')));
    if (($mail['test_redirect_all'] ?? false) !== true || !filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
        return null;
    }
    return mail_recipient_is_allowed($config, $recipient) ? $recipient : null;
}

/** @return array{recipient:string,cc:?string,subject:string,body:string,redirected:bool} */
function mail_effective_delivery(array $config, array $delivery): array
{
    $recipient = trim((string)($delivery['recipient_email'] ?? ''));
    $cc = !empty($delivery['cc_email']) ? trim((string)$delivery['cc_email']) : null;
    $subject = (string)($delivery['subject_snapshot'] ?? '');
    $body = (string)($delivery['body_snapshot'] ?? '');
    $sink = (bool)($delivery['acceptance_test'] ?? false) ? null : mail_test_sink_recipient($config);
    if ($sink === null) {
        return compact('recipient', 'cc', 'subject', 'body') + ['redirected' => false];
    }

    return [
        'recipient' => $sink,
        'cc' => null,
        'subject' => '[TEST voor ' . $recipient . '] ' . $subject,
        'body' => "TESTOMLEIDING — niet doorsturen of boeken.\nOorspronkelijke ontvanger: " . $recipient
            . ($cc ? "\nOorspronkelijke CC: " . $cc : '') . "\n\n" . $body,
        'redirected' => true,
    ];
}

/** @return list<string> */
function mail_validate_delivery_recipients(array $config, string $recipient, ?string $cc = null): array
{
    $errors = [];
    if (!mail_recipient_is_allowed($config, $recipient)) {
        $errors[] = 'recipient is not present in mail.allowed_recipients';
    }
    if ($cc !== null && trim($cc) !== '' && !mail_recipient_is_allowed($config, $cc)) {
        $errors[] = 'cc recipient is not present in mail.allowed_recipients';
    }
    return $errors;
}

/** Validate the non-secret SMTP relay contract without opening a network connection. */
function mail_validate_relay_config(array $config): array
{
    $mail = isset($config['mail']) && is_array($config['mail']) ? $config['mail'] : [];
    $relay = isset($mail['smtp_relay']) && is_array($mail['smtp_relay']) ? $mail['smtp_relay'] : [];
    $errors = [];

    if (strtolower(trim((string)($mail['transport'] ?? ''))) !== 'smtp_relay') {
        $errors[] = 'mail.transport must be smtp_relay';
    }
    if (strtolower(trim((string)($relay['host'] ?? ''))) !== 'smtp-relay.gmail.com') {
        $errors[] = 'mail.smtp_relay.host must be smtp-relay.gmail.com';
    }
    if ((int)($relay['port'] ?? 0) !== 587) {
        $errors[] = 'mail.smtp_relay.port must be 587';
    }
    if (strtolower(trim((string)($relay['encryption'] ?? ''))) !== 'starttls') {
        $errors[] = 'mail.smtp_relay.encryption must be starttls';
    }
    if (!filter_var((string)($relay['from_email'] ?? ''), FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'mail.smtp_relay.from_email must be a valid address';
    }
    foreach (['username', 'password'] as $credentialKey) {
        if (array_key_exists($credentialKey, $relay) && trim((string)$relay[$credentialKey]) !== '') {
            $errors[] = 'SMTP credentials are forbidden for IP-based relay: ' . $credentialKey;
        }
    }

    foreach (mail_allowed_recipients($config) as $recipient) {
        if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'mail.allowed_recipients contains an invalid address';
        }
    }
    if (($mail['test_redirect_all'] ?? false) === true && mail_environment($config) === 'test'
        && mail_test_sink_recipient($config) === null) {
        $errors[] = 'mail.test_sink_recipient must be a valid allowed TEST recipient when redirection is enabled';
    }
    if (($mail['enabled'] ?? false) === true && mail_environment($config) !== 'production') {
        if (mail_environment($config) !== 'test') {
            $errors[] = 'real mail delivery is allowed only in production or explicitly guarded TEST';
        } elseif (($mail['test_delivery_enabled'] ?? false) !== true) {
            $errors[] = 'mail.test_delivery_enabled must be true for TEST delivery';
        } elseif (mail_allowed_recipients($config) === []) {
            $errors[] = 'mail.allowed_recipients must contain at least one address for TEST delivery';
        }
    }

    return $errors;
}
