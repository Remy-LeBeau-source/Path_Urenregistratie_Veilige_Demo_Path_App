<?php

declare(strict_types=1);

require_once __DIR__ . '/cli-bootstrap.php';
require_once __DIR__ . '/../mail/config.php';
require_once __DIR__ . '/../lib/test-reset.php';

$options = ops_options($argv);
$configPath = (string)($options['config'] ?? '/data/sites/web/pathconsultancynl/private/path-uren-test/config.local.php');
$expectedPath = '/data/sites/web/pathconsultancynl/private/path-uren-test/config.local.php';
$businessRecipient = 'giovanno.maatsen@pathconsultancy.nl';
$invitationRecipient = $businessRecipient;
$secondaryTestAccount = 'kenrich.lieveld@pathconsultancy.nl';
// Derde beheerder-account op TEST (2026-09-12 verzoek). Alleen op de
// allowlist en als acceptatieaccount -- $businessRecipient/$secondaryTestAccount
// blijven bewust de enige omleidingsmailbox (test_sink_recipient/-cc), dat
// mechanisme raakt dit niet aan.
$thirdAcceptanceAccount = 'td_bv@teqdirectors.nl';
// Losse, met naam genoemde testers die op TEST hun eigen echte mail moeten
// kunnen ontvangen -- eerst alleen wachtwoordreset, sinds 11 sep (gebruikers-
// verzoek) ook het urenoverzicht en de goedkeuringsmail, zie
// $namedTesterTimesheetChannels hieronder en mail_test_extra_password_reset_recipients()/
// mail_test_named_tester_timesheet_channels() in server/mail/config.php.
// Staan hier apart van $acceptanceAccounts: dit zijn geen extra
// beheerderaccounts voor de acceptatietest-harness, maar bestaande
// medewerkeraccounts (vaste seed-id's 3/4/5/6, database/seed-demo-data.sql)
// die hun eigen mail moeten kunnen beproeven. De omleidingsmailbox
// ($businessRecipient) blijft via cc op de hoogte van alles wat zij sturen
// (server/mail/config.php, mail_effective_delivery()).
$namedTesterEmployeeEmails = [
    ['id' => 3, 'email' => 'marcderoon@pathconsultancy.nl'],
    ['id' => 4, 'email' => 'stasjovanbakel@pathconsultancy.nl'],
    ['id' => 5, 'email' => 'brian.hek@pathconsultancy.nl'],
    ['id' => 6, 'email' => 'shawn.nahar@pathconsultancy.nl'],
];
$namedPasswordResetTesters = array_column($namedTesterEmployeeEmails, 'email');
// Bewust smal: alleen deze twee, niet elk kanaal. Beheerdersaccounts
// (gio/joyce) blijven volledig omgeleid, net als elk ander kanaal voor deze
// vier medewerkers zelf (facturen, broker-mail, etc.).
$namedTesterTimesheetChannels = ['timesheet_submission_receipt', 'timesheet_final_approval'];
$acceptanceAccounts = [
    ['email' => $businessRecipient, 'name' => 'Giovanno Maatsen'],
    ['email' => $secondaryTestAccount, 'name' => 'Kenrich Lieveld'],
    ['email' => $thirdAcceptanceAccount, 'name' => 'TD B.V.'],
];
$temporaryPath = null;
$backupPath = null;
$configInstalled = false;
$pdo = null;

try {
    if (($options['execute'] ?? false) !== true) {
        ops_print([
            'ok' => true,
            'mode' => 'check',
            'writes_performed' => false,
            'config_path' => $expectedPath,
            'allowed_recipients' => [$businessRecipient, $secondaryTestAccount, $thirdAcceptanceAccount, ...$namedPasswordResetTesters],
            'test_sink_cc_recipient' => $secondaryTestAccount,
            'test_accounts' => array_column($acceptanceAccounts, 'email'),
            'named_tester_timesheet_channels' => $namedTesterTimesheetChannels,
            'named_tester_employee_emails' => $namedTesterEmployeeEmails,
            'message' => 'Use --execute --confirm=ENABLE_TEST_MAIL_SANDBOX on TransIP to open only the guarded TEST mail sandbox.',
        ]);
    }

    if (($options['confirm'] ?? '') !== 'ENABLE_TEST_MAIL_SANDBOX') {
        throw new RuntimeException('Execution requires --confirm=ENABLE_TEST_MAIL_SANDBOX.');
    }
    if ($configPath !== $expectedPath || !is_file($configPath)) {
        throw new RuntimeException('Only the canonical private TEST config may be updated.');
    }

    $config = require $configPath;
    if (!is_array($config)) {
        throw new RuntimeException('TEST config must return an array.');
    }
    $environment = strtolower(trim((string)($config['environment'] ?? ($config['app']['environment'] ?? ''))));
    $origin = rtrim((string)($config['app_origin'] ?? ($config['app']['app_origin'] ?? '')), '/');
    if ($environment !== 'test' || $origin !== 'https://uren-test.pathconsultancy.nl') {
        throw new RuntimeException('Mail sandbox may be enabled only for the exact dedicated TEST environment.');
    }

    $config['mail'] = is_array($config['mail'] ?? null) ? $config['mail'] : [];
    $config['mail']['enabled'] = true;
    $config['mail']['test_delivery_enabled'] = true;
    $config['mail']['allowed_recipients'] = [$businessRecipient, $secondaryTestAccount, $thirdAcceptanceAccount, ...$namedPasswordResetTesters];
    $config['mail']['test_redirect_all'] = true;
    $config['mail']['test_sink_recipient'] = $businessRecipient;
    $config['mail']['test_sink_cc_recipient'] = $secondaryTestAccount;
    $config['mail']['acceptance_test'] = [
        'enabled' => true,
        'business_recipient' => $businessRecipient,
        'password_reset_recipient' => $businessRecipient,
        'invitation_recipient' => $invitationRecipient,
        'extra_password_reset_recipients' => $namedPasswordResetTesters,
        'named_tester_timesheet_channels' => $namedTesterTimesheetChannels,
        'named_tester_employee_emails' => $namedTesterEmployeeEmails,
    ];

    $relayErrors = mail_validate_relay_config($config);
    if ($relayErrors !== [] || !mail_real_delivery_allowed_for_environment($config)) {
        throw new RuntimeException('Guarded TEST relay configuration is invalid: ' . implode('; ', $relayErrors));
    }
    foreach ([$businessRecipient, $secondaryTestAccount, $thirdAcceptanceAccount, ...$namedPasswordResetTesters] as $recipient) {
        if (!mail_recipient_is_allowed($config, $recipient)) {
            throw new RuntimeException('TEST recipient is not protected by the exact allowlist.');
        }
    }

    $pdo = ops_pdo($config);
    $companyId = (int)$pdo->query('SELECT id FROM companies ORDER BY id ASC LIMIT 1')->fetchColumn();
    if ($companyId <= 0) {
        throw new RuntimeException('The TEST company is unavailable.');
    }
    $pdo->beginTransaction();
    foreach ($acceptanceAccounts as $account) {
        $existing = $pdo->prepare('SELECT id, company_id FROM users WHERE LOWER(email) = :email LIMIT 1');
        $existing->execute([':email' => $account['email']]);
        $user = $existing->fetch();
        if ($user && (int)$user['company_id'] !== $companyId) {
            throw new RuntimeException('A TEST acceptance account belongs to another company.');
        }
        if ($user) {
            $pdo->prepare(
                'UPDATE users SET display_name = :name, role = "administrator", active = 1,
                 deactivated_at = NULL, deactivated_by = NULL WHERE id = :id'
            )->execute([':name' => $account['name'], ':id' => (int)$user['id']]);
            continue;
        }
        $pdo->prepare(
            'INSERT INTO users
             (company_id, email, display_name, role, active, password_hash, force_password_change)
             VALUES (:company_id, :email, :name, "administrator", 1, :password_hash, 1)'
        )->execute([
            ':company_id' => $companyId,
            ':email' => $account['email'],
            ':name' => $account['name'],
            ':password_hash' => password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT),
        ]);
    }

    // Onmiddellijk effect: de vier medewerkeraccounts krijgen hier meteen hun
    // echte adres (raakt alleen de e-mailkolom, het wachtwoord blijft
    // ongemoeid). Dezelfde functie draait ook automatisch na elke gedeelde
    // baseline-reset (server/lib/test-reset.php), zodat het adres niet
    // verloren gaat bij de eerstvolgende reset.
    $appliedNamedTesterEmails = test_reset_apply_named_tester_emails($pdo, $config);

    umask(0077);
    $backupPath = $configPath . '.before-mail-sandbox-' . gmdate('Ymd-His');
    if (!copy($configPath, $backupPath)) {
        throw new RuntimeException('Could not create the protected TEST config backup.');
    }
    chmod($backupPath, 0600);

    $contents = "<?php\n\ndeclare(strict_types=1);\n\nreturn " . var_export($config, true) . ";\n";
    $temporaryPath = $configPath . '.tmp-' . bin2hex(random_bytes(8));
    if (file_put_contents($temporaryPath, $contents, LOCK_EX) === false) {
        throw new RuntimeException('Could not write the temporary TEST mail config.');
    }
    chmod($temporaryPath, 0600);
    if (!rename($temporaryPath, $configPath)) {
        throw new RuntimeException('Could not atomically install the guarded TEST mail config.');
    }
    $temporaryPath = null;
    chmod($configPath, 0600);
    $configInstalled = true;
    $pdo->commit();

    ops_print([
        'ok' => true,
        'mode' => 'execute',
        'writes_performed' => true,
        'mail_enabled' => true,
        'test_delivery_enabled' => true,
        'allowed_recipients' => [$businessRecipient, $secondaryTestAccount, $thirdAcceptanceAccount, ...$namedPasswordResetTesters],
        'test_sink_recipient' => $businessRecipient,
        'test_sink_cc_recipient' => $secondaryTestAccount,
        'test_accounts' => array_column($acceptanceAccounts, 'email'),
        'named_password_reset_testers' => $namedPasswordResetTesters,
        'named_tester_timesheet_channels' => $namedTesterTimesheetChannels,
        'named_tester_employee_emails_applied' => $appliedNamedTesterEmails,
        'backup_path' => $backupPath,
        'message' => 'Guarded TEST mail sandbox enabled. No message was sent.',
    ]);
} catch (Throwable $error) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (is_string($temporaryPath) && is_file($temporaryPath)) {
        @unlink($temporaryPath);
    }
    if ($configInstalled && is_string($backupPath) && is_file($backupPath)) {
        @copy($backupPath, $configPath);
        @chmod($configPath, 0600);
    }
    ops_print(['ok' => false, 'writes_performed' => false, 'error' => $error->getMessage()], 1);
}
