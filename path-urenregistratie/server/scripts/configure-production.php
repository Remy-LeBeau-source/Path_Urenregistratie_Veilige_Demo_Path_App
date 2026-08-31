<?php

declare(strict_types=1);

require_once __DIR__ . '/cli-bootstrap.php';

/** Read a secret without placing it in command history, output or the process list. */
function configure_read_hidden(string $prompt): string
{
    if (DIRECTORY_SEPARATOR !== '/' || !function_exists('stream_isatty') || !stream_isatty(STDIN)) {
        throw new RuntimeException('Production configuration requires an interactive Linux/Unix terminal.');
    }
    fwrite(STDERR, $prompt);
    $terminalState = trim((string)shell_exec('stty -g'));
    if ($terminalState === '') {
        throw new RuntimeException('Could not secure terminal input.');
    }
    shell_exec('stty -echo');
    try {
        $value = fgets(STDIN);
    } finally {
        shell_exec('stty ' . escapeshellarg($terminalState));
        fwrite(STDERR, PHP_EOL);
    }
    return rtrim((string)$value, "\r\n");
}

function configure_required_option(array $options, string $name): string
{
    $value = trim((string)($options[$name] ?? ''));
    if ($value === '') {
        throw new RuntimeException('Missing required option --' . $name . '=...');
    }
    return $value;
}

function configure_assert_identifier(string $value, string $label): void
{
    if (!preg_match('/^[A-Za-z0-9_\-.]+$/', $value)) {
        throw new RuntimeException($label . ' contains unsupported characters.');
    }
}

$options = ops_options($argv);
$temporaryPath = null;
try {
    $applicationRoot = dirname(__DIR__, 2);
    $configPath = dirname(__DIR__) . '/config.local.php';
    $defaultPrivateRoot = dirname($applicationRoot, 2) . '/private/path-urenregistratie';

    if (($options['execute'] ?? false) !== true) {
        ops_print([
            'ok' => true,
            'mode' => 'check',
            'writes_performed' => false,
            'password_in_arguments_supported' => false,
            'config_path' => $configPath,
            'default_private_root' => $defaultPrivateRoot,
            'message' => 'Use --execute --confirm=CONFIGURE_PRODUCTION --host=... --database=... --user=... from an interactive production terminal.',
        ]);
    }

    if (($options['confirm'] ?? '') !== 'CONFIGURE_PRODUCTION') {
        throw new RuntimeException('Execution requires --confirm=CONFIGURE_PRODUCTION.');
    }
    if (isset($options['password'])) {
        throw new RuntimeException('Database passwords in command arguments are forbidden.');
    }
    if (is_file($configPath) && ($options['replace'] ?? false) !== true) {
        throw new RuntimeException('Production config already exists; use --replace only after making a protected backup.');
    }

    $host = configure_required_option($options, 'host');
    $database = configure_required_option($options, 'database');
    $user = configure_required_option($options, 'user');
    $privateRoot = rtrim(trim((string)($options['private-root'] ?? $defaultPrivateRoot)), '/\\');
    configure_assert_identifier($host, 'Database host');
    configure_assert_identifier($database, 'Database name');
    configure_assert_identifier($user, 'Database user');
    if ($privateRoot === '' || $privateRoot[0] !== '/') {
        throw new RuntimeException('Private root must be an absolute Linux path.');
    }
    if (!ops_is_outside_webroot($privateRoot)) {
        throw new RuntimeException('Private root must be outside the public application root.');
    }
    foreach (['', '/invoices', '/customer-timesheets', '/backups', '/logs'] as $suffix) {
        $directory = $privateRoot . $suffix;
        if (!is_dir($directory) || !is_writable($directory)) {
            throw new RuntimeException('Required private directory is missing or not writable: ' . $directory);
        }
    }

    $password = configure_read_hidden('Databasewachtwoord (wordt niet getoond): ');
    if ($password === '') {
        throw new RuntimeException('Database password may not be empty.');
    }

    $config = [
        'environment' => 'production',
        'app_origin' => 'https://uren.pathconsultancy.nl',
        'allow_demo_migrations' => false,
        'database' => [
            'host' => $host,
            'name' => $database,
            'user' => $user,
            'password' => $password,
            'port' => 3306,
            'charset' => 'utf8mb4',
        ],
        'security' => [
            'session_cookie_name' => 'path_session',
            'session_lifetime_minutes' => 480,
            'require_https' => true,
            'allowed_google_domain' => 'pathconsultancy.nl',
            'cors_allowed_origins' => ['https://uren.pathconsultancy.nl'],
            'content_security_policy' => "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self' blob:",
            'hsts_enabled' => false,
            'hsts_max_age' => 31536000,
            'hsts_include_subdomains' => true,
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
            'production_mode' => 'disabled',
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
                'from_name' => 'Path Consultancy',
            ],
            'max_attempts' => 3,
        ],
    ];

    // Prove the supplied credentials read-only before any configuration file is written.
    $pdo = ops_pdo($config);
    $pdo->query('SELECT 1')->fetchColumn();
    $pdo = null;

    $contents = "<?php\n\ndeclare(strict_types=1);\n\nreturn " . var_export($config, true) . ";\n";
    unset($config['database']['password'], $password);
    umask(0077);
    $temporaryPath = $configPath . '.tmp-' . bin2hex(random_bytes(8));
    if (file_put_contents($temporaryPath, $contents, LOCK_EX) === false) {
        throw new RuntimeException('Could not write temporary production configuration.');
    }
    chmod($temporaryPath, 0600);
    if (!rename($temporaryPath, $configPath)) {
        throw new RuntimeException('Could not atomically install production configuration.');
    }
    $temporaryPath = null;
    chmod($configPath, 0600);

    ops_print([
        'ok' => true,
        'mode' => 'execute',
        'writes_performed' => true,
        'database_connection_verified' => true,
        'mail_enabled' => false,
        'config_path' => $configPath,
        'private_root' => $privateRoot,
        'message' => 'Production config installed with mode 0600. Run production-preflight.php --live next.',
    ]);
} catch (Throwable $error) {
    if (is_string($temporaryPath) && is_file($temporaryPath)) {
        @unlink($temporaryPath);
    }
    ops_print(['ok' => false, 'writes_performed' => false, 'error' => $error->getMessage()], 1);
}
