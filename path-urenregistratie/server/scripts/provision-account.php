<?php

declare(strict_types=1);

require_once __DIR__ . '/cli-bootstrap.php';
require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../auth/password-reset-service.php';

/** Read a password without placing it in command history or the process list. */
function provision_read_hidden(string $prompt): string
{
    if (DIRECTORY_SEPARATOR !== '/' || !function_exists('stream_isatty') || !stream_isatty(STDIN)) {
        throw new RuntimeException('Account provisioning requires an interactive Linux/Unix terminal.');
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

$options = ops_options($argv);
try {
    $config = ops_load_config($options);
    if (($options['execute'] ?? false) !== true) {
        ops_print([
            'ok' => true,
            'mode' => 'check',
            'writes_performed' => false,
            'password_in_arguments_supported' => false,
            'message' => 'Use --execute --email=... --name=... --role=administrator|employee --company-id=1. A personal one-time password setup email is queued by default.',
        ]);
    }

    $environment = strtolower(trim((string)($config['environment'] ?? ($config['app']['environment'] ?? 'production'))));
    if ($environment !== 'production') {
        throw new RuntimeException('This provisioning command is restricted to production configuration.');
    }
    $email = strtolower(trim((string)($options['email'] ?? '')));
    $name = trim((string)($options['name'] ?? ''));
    $role = strtolower(trim((string)($options['role'] ?? '')));
    $companyId = (int)($options['company-id'] ?? 0);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $name === '' || strlen($name) > 160) {
        throw new RuntimeException('A valid email and name (max 160 characters) are required.');
    }
    if (!in_array($role, ['administrator', 'employee'], true) || $companyId <= 0) {
        throw new RuntimeException('Role must be administrator or employee and company-id must be positive.');
    }
    if (isset($options['password'])) {
        throw new RuntimeException('Passwords in command arguments are forbidden.');
    }

    $temporaryPasswordMode = ($options['temporary-password'] ?? false) === true;
    if ($temporaryPasswordMode) {
        $password = provision_read_hidden('Tijdelijk wachtwoord (minimaal 12 tekens): ');
        $confirmation = provision_read_hidden('Herhaal tijdelijk wachtwoord: ');
        if (!hash_equals($password, $confirmation)) {
            throw new RuntimeException('Password confirmation does not match.');
        }
        if (strlen($password) < 12) {
            throw new RuntimeException('Password must be at least 12 characters.');
        }
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        unset($password, $confirmation);
    } else {
        if (!auth_password_reset_delivery_available($config)) {
            throw new RuntimeException('SMTP relay must be enabled and valid before an account invitation can be queued.');
        }
        // This value is never shown or shared. The recipient establishes the
        // only usable password through the one-time invitation link.
        $passwordHash = password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);
    }

    $pdo = ops_pdo($config);
    $company = $pdo->prepare('SELECT id FROM companies WHERE id = :id LIMIT 1');
    $company->execute([':id' => $companyId]);
    if (!$company->fetchColumn()) {
        throw new RuntimeException('Configured company does not exist.');
    }

    $inviteQueued = false;
    $pdo->beginTransaction();
    try {
        $existing = $pdo->prepare('SELECT id, company_id FROM users WHERE email = :email LIMIT 1');
        $existing->execute([':email' => $email]);
        $existingUser = $existing->fetch();
        if ($existingUser && (int)$existingUser['company_id'] !== $companyId) {
            throw new RuntimeException('Existing account belongs to another company.');
        }
        $userId = $existingUser ? (int)$existingUser['id'] : 0;
        if ($userId > 0) {
            $statement = $pdo->prepare(
                'UPDATE users SET company_id = :company_id, display_name = :name, role = :role,
                 password_hash = :password_hash, force_password_change = 1, active = 1,
                 deactivated_at = NULL, deactivated_by = NULL WHERE id = :id'
            );
            $statement->execute([
                ':company_id' => $companyId, ':name' => $name, ':role' => $role,
                ':password_hash' => $passwordHash, ':id' => $userId,
            ]);
            $action = 'updated';
        } else {
            $statement = $pdo->prepare(
                'INSERT INTO users (company_id, email, display_name, role, active, password_hash, force_password_change)
                 VALUES (:company_id, :email, :name, :role, 1, :password_hash, 1)'
            );
            $statement->execute([
                ':company_id' => $companyId, ':email' => $email, ':name' => $name,
                ':role' => $role, ':password_hash' => $passwordHash,
            ]);
            $userId = (int)$pdo->lastInsertId();
            $action = 'created';
        }
        $pdo->prepare(
            'INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
             VALUES (:company_id, NULL, :event_type, "user", :entity_id, :event_data)'
        )->execute([
            ':company_id' => $companyId,
            ':event_type' => 'user.production_provisioned',
            ':entity_id' => (string)$userId,
            ':event_data' => json_encode(['email' => $email, 'role' => $role, 'action' => $action], JSON_UNESCAPED_UNICODE),
        ]);

        if (!$temporaryPasswordMode) {
            $reset = auth_create_password_reset($pdo, [
                'id' => $userId,
                'email' => $email,
                'display_name' => $name,
            ], $config, 'invitation');
            if (!$reset || (int)($reset['delivery_id'] ?? 0) <= 0) {
                throw new RuntimeException('Account invitation could not be queued. No account changes were saved.');
            }
            $inviteQueued = true;
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }

    ops_print([
        'ok' => true,
        'mode' => 'execute',
        'user_id' => $userId,
        'email' => $email,
        'role' => $role,
        'action' => $action,
        'invite_queued' => $inviteQueued,
        'temporary_password' => $temporaryPasswordMode,
    ]);
} catch (Throwable $error) {
    ops_print(['ok' => false, 'error' => $error->getMessage()], 1);
}
