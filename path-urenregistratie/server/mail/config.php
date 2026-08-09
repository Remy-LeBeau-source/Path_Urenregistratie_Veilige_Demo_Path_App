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
    if (isset($config['mail']['enabled']) && $config['mail']['enabled'] === true) {
        return false;
    }
    // Legacy flat key.
    if (array_key_exists('mail_dry_run', $config)) {
        return (bool)$config['mail_dry_run'];
    }
    return true;
}
