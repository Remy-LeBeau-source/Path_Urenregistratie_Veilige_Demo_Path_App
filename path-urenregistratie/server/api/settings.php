<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../security/csrf.php';
require_once __DIR__ . '/../security/validation.php';

header('Content-Type: application/json; charset=utf-8');
auth_apply_cors_headers(auth_try_load_raw_config(), 'POST, OPTIONS', 'Content-Type, X-CSRF-Token');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    auth_send_json(['ok' => false, 'error' => 'method-not-allowed'], 405);
}

$config = auth_load_raw_config();
auth_start_session_secure($config);
$pdo = auth_pdo($config);
$currentUser = auth_current_user($pdo);
auth_require_role(['administrator'], $currentUser);
security_require_csrf_token();

$companyId = (int)$currentUser['company_id'];
$actorId = (int)$currentUser['id'];
$payload = security_read_json_body();
$settings = $payload['settings'] ?? null;
$mailRecipients = $payload['mailRecipients'] ?? null;

if (!is_array($settings)) {
    auth_send_json([
        'ok' => false,
        'error' => 'invalid-payload',
        'message' => 'settings payload is required',
    ], 400);
}

function settings_string(mixed $value, int $maxLength = 0): string
{
    $text = trim((string)($value ?? ''));
    if ($maxLength > 0 && strlen($text) > $maxLength) {
        return substr($text, 0, $maxLength);
    }
    return $text;
}

/**
 * Multi-line mail template text. Newlines carry meaning here, and a plain
 * substr() can cut a multi-byte character in half.
 */
function settings_text(mixed $value, int $maxLength): string
{
    $text = trim((string)($value ?? ''));
    if ($maxLength <= 0) {
        return $text;
    }
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $maxLength);
    }
    $truncated = preg_replace('/^(.{0,' . $maxLength . '}).*$/su', '$1', $text);
    return is_string($truncated) ? $truncated : substr($text, 0, $maxLength);
}

function settings_bool(mixed $value, bool $default = false): bool
{
    if ($value === null) {
        return $default;
    }
    return (bool)$value;
}

function settings_email_or_null(mixed $value): ?string
{
    $email = trim((string)($value ?? ''));
    if ($email === '') {
        return null;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'Een of meer e-mailvelden zijn ongeldig.',
        ], 400);
    }
    return $email;
}

function settings_color(string $value, string $fallback): string
{
    if (preg_match('/^#[0-9a-fA-F]{6}$/', $value) === 1) {
        return strtolower($value);
    }
    return $fallback;
}

function settings_postal_city(mixed $value): array
{
    $combined = settings_string($value, 140);
    if (preg_match('/^([1-9][0-9]{3})\s*([a-zA-Z]{2})\s+(.+)$/u', $combined, $matches) === 1) {
        return [
            'postal_code' => $matches[1] . ' ' . strtoupper($matches[2]),
            'city' => trim($matches[3]),
        ];
    }
    return ['postal_code' => null, 'city' => $combined !== '' ? $combined : null];
}

try {
    $pdo->beginTransaction();

    $updateCompany = $pdo->prepare(
        'UPDATE companies
         SET trade_name = :trade_name,
             invoice_name_display = :invoice_name_display,
             app_name = :app_name,
             support_name = :support_name,
             support_email = :support_email,
             brand_primary = :brand_primary,
             brand_accent = :brand_accent,
             legal_name = :legal_name,
             chamber_of_commerce_number = :chamber_of_commerce_number,
             vat_number = :vat_number,
             iban = :iban,
             address_line = :address_line,
             postal_code = :postal_code,
             city = :city,
             invoice_phone = :invoice_phone,
             invoice_email = :invoice_email,
             payment_term_days = :payment_term_days,
             customer_timesheet_reminder_enabled = :customer_timesheet_reminder_enabled,
             customer_timesheet_reminder_time = :customer_timesheet_reminder_time,
             customer_timesheet_overdue_workdays = :customer_timesheet_overdue_workdays,
             customer_timesheet_submission_subject = :customer_timesheet_submission_subject,
             customer_timesheet_submission_body = :customer_timesheet_submission_body,
             customer_timesheet_broker_subject = :customer_timesheet_broker_subject,
             customer_timesheet_broker_body = :customer_timesheet_broker_body
         WHERE id = :company_id'
    );

    $tradeName = settings_string($settings['organizationName'] ?? '', 160);
    $appName = settings_string($settings['appName'] ?? '', 120);
    $supportName = settings_string($settings['supportName'] ?? '', 160);
    $supportEmail = settings_email_or_null($settings['supportEmail'] ?? null);
    $brandPrimary = settings_color(settings_string($settings['brandPrimary'] ?? '#0d1b38', 7), '#0d1b38');
    $brandAccent = settings_color(settings_string($settings['brandAccent'] ?? '#3abd9d', 7), '#3abd9d');

    $legalName = settings_string($settings['companyName'] ?? '', 160);
    $invoiceNameDisplay = settings_string($settings['invoiceNameDisplay'] ?? 'trade_and_legal', 32);
    if (!in_array($invoiceNameDisplay, ['trade_and_legal', 'legal_only'], true)) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'invoiceNameDisplay is invalid.',
        ], 400);
    }
    $postalCity = settings_postal_city($settings['postalCity'] ?? '');
    $kvk = settings_string($settings['kvk'] ?? '', 32);
    if ($kvk === '') {
        $kvk = 'onbekend';
    }

    $paymentTerm = (int)($settings['paymentTerm'] ?? 30);
    $paymentTerm = max(1, min(365, $paymentTerm));

    $reminderTime = settings_string($settings['customerTimesheetReminderTime'] ?? '15:00', 8);
    if (!preg_match('/^\d{2}:\d{2}$/', $reminderTime)) {
        $reminderTime = '15:00';
    }

    $overdueWorkdays = max(1, min(23, (int)($settings['customerTimesheetOverdueWorkdays'] ?? 2)));

    $updateCompany->execute([
        ':trade_name' => $tradeName !== '' ? $tradeName : 'Organisatie',
        ':invoice_name_display' => $invoiceNameDisplay,
        ':app_name' => $appName !== '' ? $appName : 'Uren & Facturatie',
        ':support_name' => $supportName !== '' ? $supportName : null,
        ':support_email' => $supportEmail,
        ':brand_primary' => $brandPrimary,
        ':brand_accent' => $brandAccent,
        ':legal_name' => $legalName !== '' ? $legalName : 'Organisatie',
        ':chamber_of_commerce_number' => $kvk,
        ':vat_number' => settings_string($settings['vat'] ?? '', 32) ?: null,
        ':iban' => settings_string($settings['iban'] ?? '', 64) ?: null,
        ':address_line' => settings_string($settings['address'] ?? '', 180) ?: null,
        ':postal_code' => $postalCity['postal_code'],
        ':city' => $postalCity['city'],
        ':invoice_phone' => settings_string($settings['phone'] ?? '', 40) ?: null,
        ':invoice_email' => settings_email_or_null($settings['invoiceEmail'] ?? null),
        ':payment_term_days' => $paymentTerm,
        ':customer_timesheet_reminder_enabled' => settings_bool($settings['customerTimesheetReminderEnabled'] ?? true, true) ? 1 : 0,
        ':customer_timesheet_reminder_time' => $reminderTime . ':00',
        ':customer_timesheet_overdue_workdays' => $overdueWorkdays,
        // These four were collected by the form but never stored: the texts lived
        // only in the browser of whoever typed them, so F5 lost the change.
        ':customer_timesheet_submission_subject' => settings_string($settings['customerTimesheetSubmissionSubject'] ?? '', 250) ?: null,
        ':customer_timesheet_submission_body' => settings_text($settings['customerTimesheetSubmissionBody'] ?? '', 4000) ?: null,
        ':customer_timesheet_broker_subject' => settings_string($settings['customerTimesheetBrokerSubject'] ?? '', 250) ?: null,
        ':customer_timesheet_broker_body' => settings_text($settings['customerTimesheetBrokerBody'] ?? '', 4000) ?: null,
        ':company_id' => $companyId,
    ]);

    if (is_array($mailRecipients)) {
        $existingStmt = $pdo->prepare('SELECT id, recipient_key FROM mail_recipients WHERE company_id = :company_id');
        $existingStmt->execute([':company_id' => $companyId]);
        $existing = $existingStmt->fetchAll();

        $existingById = [];
        $existingByKey = [];
        foreach ($existing as $row) {
            $id = (int)$row['id'];
            $key = trim((string)($row['recipient_key'] ?? ''));
            $existingById[$id] = $row;
            if ($key !== '') {
                $existingByKey[$key] = $row;
            }
        }

        foreach ($mailRecipients as $recipient) {
            if (!is_array($recipient)) {
                continue;
            }

            $rawId = settings_string($recipient['id'] ?? '', 80);
            $numericId = ctype_digit($rawId) ? (int)$rawId : 0;
            $recipientKey = $numericId > 0 ? '' : $rawId;
            $email = settings_email_or_null($recipient['email'] ?? null);
            if ($email === null) {
                continue;
            }

            $displayName = settings_string($recipient['name'] ?? '', 160);
            if ($displayName === '') {
                $displayName = $email;
            }
            $category = settings_string($recipient['category'] ?? 'other', 60);
            if ($category === '') {
                $category = 'other';
            }

            $active = settings_bool($recipient['active'] ?? true, true) ? 1 : 0;

            $matched = null;
            if ($numericId > 0 && isset($existingById[$numericId])) {
                $matched = $existingById[$numericId];
            } elseif ($recipientKey !== '' && isset($existingByKey[$recipientKey])) {
                $matched = $existingByKey[$recipientKey];
            }

            if ($matched) {
                $deactivatedAt = $active === 1 ? null : date('Y-m-d H:i:s');
                $updateRecipient = $pdo->prepare(
                    'UPDATE mail_recipients
                     SET recipient_key = :recipient_key,
                         recipient_category = :recipient_category,
                         display_name = :display_name,
                         email = :email,
                         active = :active,
                         deactivated_at = :deactivated_at
                     WHERE id = :id AND company_id = :company_id'
                );
                $updateRecipient->execute([
                    ':recipient_key' => $recipientKey !== '' ? $recipientKey : $matched['recipient_key'],
                    ':recipient_category' => $category,
                    ':display_name' => $displayName,
                    ':email' => $email,
                    ':active' => $active,
                    ':deactivated_at' => $deactivatedAt,
                    ':id' => (int)$matched['id'],
                    ':company_id' => $companyId,
                ]);
            } else {
                $deactivatedAt = $active === 1 ? null : date('Y-m-d H:i:s');
                $insertRecipient = $pdo->prepare(
                    'INSERT INTO mail_recipients (company_id, recipient_key, recipient_category, display_name, email, active, deactivated_at)
                     VALUES (:company_id, :recipient_key, :recipient_category, :display_name, :email, :active, :deactivated_at)'
                );
                $insertRecipient->execute([
                    ':company_id' => $companyId,
                    ':recipient_key' => $recipientKey !== '' ? $recipientKey : null,
                    ':recipient_category' => $category,
                    ':display_name' => $displayName,
                    ':email' => $email,
                    ':active' => $active,
                    ':deactivated_at' => $deactivatedAt,
                ]);
            }
        }
    }

    $audit = $pdo->prepare(
        'INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
         VALUES (:company_id, :actor_user_id, :event_type, :entity_type, :entity_id, :event_data)'
    );
    $audit->execute([
        ':company_id' => $companyId,
        ':actor_user_id' => $actorId,
        ':event_type' => 'settings.company_saved',
        ':entity_type' => 'company',
        ':entity_id' => (string)$companyId,
        ':event_data' => json_encode([
            'trade_name' => $tradeName,
            'legal_name' => $legalName,
            'invoice_name_display' => $invoiceNameDisplay,
            'app_name' => $appName,
            'support_email' => $supportEmail,
            'payment_term_days' => $paymentTerm,
        ], JSON_UNESCAPED_UNICODE),
    ]);

    $pdo->commit();
    auth_send_json(['ok' => true]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    auth_send_json([
        'ok' => false,
        'error' => 'save-settings-failed',
        'message' => $e->getMessage(),
    ], 500);
}
