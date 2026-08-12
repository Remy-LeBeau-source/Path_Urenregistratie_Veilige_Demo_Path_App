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

    return $errors;
}
