<?php

declare(strict_types=1);

require_once __DIR__ . '/cli-bootstrap.php';
require_once __DIR__ . '/../mail/config.php';

$options = ops_options($argv);
$temporaryPath = null;
try {
    $configPath = (string)($options['config'] ?? dirname(__DIR__) . '/config.local.php');
    $config = ops_load_config(['config' => $configPath]);
    $origin = rtrim((string)($config['app_origin'] ?? ($config['app']['app_origin'] ?? '')), '/');
    if (mail_environment($config) !== 'production' || $origin !== 'https://uren.pathconsultancy.nl') {
        throw new RuntimeException('Production mail pilot may only be configured for the exact production environment.');
    }

    $mode = strtolower(trim((string)($options['mode'] ?? 'check')));
    if (!in_array($mode, ['check', 'pilot', 'disabled'], true)) {
        throw new RuntimeException('Mode must be check, pilot or disabled.');
    }
    if ($mode === 'check' || ($options['execute'] ?? false) !== true) {
        ops_print([
            'ok' => true,
            'mode' => 'check',
            'writes_performed' => false,
            'current_production_mode' => mail_production_mode($config),
            'current_mail_enabled' => !mail_is_dry_run($config),
            'message' => 'Use --execute --mode=pilot --confirm=ENABLE_PRODUCTION_PILOT --recipients=a@b.nl,c@d.nl, or --mode=disabled --confirm=DISABLE_PRODUCTION_MAIL.',
        ]);
    }

    if (!is_file($configPath) || !is_writable($configPath)) {
        throw new RuntimeException('Production config file is missing or not writable.');
    }
    $mail = isset($config['mail']) && is_array($config['mail']) ? $config['mail'] : [];
    if ($mode === 'pilot') {
        if (($options['confirm'] ?? '') !== 'ENABLE_PRODUCTION_PILOT') {
            throw new RuntimeException('Pilot activation requires --confirm=ENABLE_PRODUCTION_PILOT.');
        }
        $raw = array_filter(array_map('trim', explode(',', (string)($options['recipients'] ?? ''))));
        $recipients = [];
        foreach ($raw as $recipient) {
            $email = strtolower($recipient);
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new RuntimeException('Every pilot recipient must be a valid email address.');
            }
            if (!in_array($email, $recipients, true)) {
                $recipients[] = $email;
            }
        }
        if ($recipients === []) {
            throw new RuntimeException('At least one pilot recipient is required.');
        }
        $mail['enabled'] = true;
        $mail['production_mode'] = 'pilot';
        $mail['allowed_recipients'] = $recipients;
        $mail['test_delivery_enabled'] = false;
        $mail['test_redirect_all'] = false;
        $mail['test_sink_recipient'] = '';
        $mail['test_sink_cc_recipient'] = '';
    } else {
        if (($options['confirm'] ?? '') !== 'DISABLE_PRODUCTION_MAIL') {
            throw new RuntimeException('Disabling requires --confirm=DISABLE_PRODUCTION_MAIL.');
        }
        $mail['enabled'] = false;
        $mail['production_mode'] = 'disabled';
        $mail['allowed_recipients'] = [];
    }
    $config['mail'] = $mail;
    $errors = mail_validate_relay_config($config);
    if ($errors !== []) {
        throw new RuntimeException('Mail policy is invalid: ' . implode('; ', $errors));
    }

    $contents = "<?php\n\ndeclare(strict_types=1);\n\nreturn " . var_export($config, true) . ";\n";
    umask(0077);
    $temporaryPath = $configPath . '.tmp-' . bin2hex(random_bytes(8));
    if (file_put_contents($temporaryPath, $contents, LOCK_EX) === false) {
        throw new RuntimeException('Could not write temporary production configuration.');
    }
    chmod($temporaryPath, 0600);
    if (!rename($temporaryPath, $configPath)) {
        throw new RuntimeException('Could not atomically install production mail policy.');
    }
    $temporaryPath = null;
    chmod($configPath, 0600);

    ops_print([
        'ok' => true,
        'mode' => $mode,
        'writes_performed' => true,
        'mail_enabled' => !mail_is_dry_run($config),
        'production_mode' => mail_production_mode($config),
        'allowed_recipients' => mail_allowed_recipients($config),
    ]);
} catch (Throwable $error) {
    if (is_string($temporaryPath) && is_file($temporaryPath)) {
        @unlink($temporaryPath);
    }
    ops_print(['ok' => false, 'writes_performed' => false, 'error' => $error->getMessage()], 1);
}
