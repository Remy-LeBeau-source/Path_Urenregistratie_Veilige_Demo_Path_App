<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../security/csrf.php';
require_once __DIR__ . '/../security/validation.php';
require_once __DIR__ . '/mail-recipients.php';
require_once __DIR__ . '/../auth/password-reset-service.php';

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
$action = trim((string)($payload['action'] ?? ''));

function staff_bool(mixed $value, bool $default = false): bool
{
    if ($value === null) {
        return $default;
    }
    return (bool)$value;
}

function staff_string(mixed $value, int $maxLength = 0): string
{
    $text = trim((string)($value ?? ''));
    if ($maxLength > 0 && strlen($text) > $maxLength) {
        return substr($text, 0, $maxLength);
    }
    return $text;
}

/**
 * Multi-line template text. Newlines are meaningful here, and a plain substr()
 * can cut a multi-byte character in half; simple_pdf.php and announcements.php
 * already guard their mb_ calls the same way.
 */
function staff_text(mixed $value, int $maxLength): string
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

function staff_email(mixed $value): string
{
    $email = trim((string)($value ?? ''));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'A valid email address is required.',
        ], 400);
    }
    return $email;
}

function staff_role_from_payload(string $raw): string
{
    return in_array($raw, ['employee', 'administrator'], true) ? $raw : 'employee';
}

function staff_find_email_conflict(PDO $pdo, string $email, int $excludeUserId = 0): ?array
{
    $stmt = $pdo->prepare(
        'SELECT u.id, u.company_id, u.display_name, u.role, u.active, e.id AS employee_id
         FROM users u
         LEFT JOIN employees e ON e.user_id = u.id AND e.company_id = u.company_id
         WHERE LOWER(u.email) = LOWER(:email)
           AND u.id <> :exclude_user_id
         LIMIT 1'
    );
    $stmt->execute([
        ':email' => $email,
        ':exclude_user_id' => $excludeUserId,
    ]);
    $row = $stmt->fetch();
    return is_array($row) ? $row : null;
}

function staff_send_email_conflict(?array $existing = null, int $companyId = 0): never
{
    $response = [
        'ok' => false,
        'error' => 'email-already-in-use',
        'message' => 'Dit e-mailadres is al in gebruik. Kies een ander e-mailadres of pas het bestaande account aan.',
    ];

    // Only reveal account details inside the administrator's own company. The
    // database keeps e-mail globally unique, but a conflict in another tenant
    // must remain indistinguishable from any other duplicate.
    if ($existing !== null && (int)$existing['company_id'] === $companyId) {
        $role = (string)$existing['role'];
        $active = (bool)$existing['active'];
        $response['existing_account'] = [
            'user_id' => (int)$existing['id'],
            'employee_id' => isset($existing['employee_id']) ? (int)$existing['employee_id'] : null,
            'display_name' => (string)$existing['display_name'],
            'role' => $role,
            'active' => $active,
        ];
        $response['message'] = sprintf(
            'Dit e-mailadres hoort al bij %s (%s %s). Het bestaande account is voor je geopend.',
            (string)$existing['display_name'],
            $active ? 'actieve' : 'inactieve',
            $role === 'administrator' ? 'beheerder' : 'medewerker'
        );
    }

    auth_send_json($response, 409);
}

// Het opslaan zelf staat in mail-recipients.php, gedeeld met settings.php.
// Hier alleen de keuze die dit eindpunt maakt: een onjuist adres wordt
// overgeslagen, want een medewerker opslaan mag niet stuklopen op een
// ontvanger die verderop in het formulier staat.
function staff_upsert_mail_recipients(PDO $pdo, int $companyId, array $items): array
{
    return mail_recipients_upsert($pdo, $companyId, $items)['keys'];
}
function staff_upsert_counterparty(PDO $pdo, int $companyId, string $type, string $name, ?string $email, ?string $address): int
{
    $effectiveName = staff_string($name, 180);
    if ($effectiveName === '') {
        $effectiveName = $type === 'broker' ? 'Onbekende broker' : 'Onbekende klant';
    }

    $stmt = $pdo->prepare(
        'SELECT id FROM counterparties
         WHERE company_id = :company_id AND type = :type AND legal_name = :legal_name
         ORDER BY id ASC LIMIT 1'
    );
    $stmt->execute([
        ':company_id' => $companyId,
        ':type' => $type,
        ':legal_name' => $effectiveName,
    ]);
    $existingId = (int)($stmt->fetchColumn() ?: 0);

    $safeEmail = $email !== null && $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;
    $addressLine = null;
    $postalCode = null;
    $city = null;
    if ($address !== null && trim($address) !== '') {
        $parts = preg_split('/\r\n|\r|\n/', trim($address));
        if (is_array($parts) && $parts !== []) {
            $addressLine = staff_string((string)($parts[0] ?? ''), 180);
            $secondLine = staff_string((string)($parts[1] ?? ''), 120);
            if ($secondLine !== '') {
                $postalCode = staff_string(substr($secondLine, 0, 16), 16);
                $city = staff_string(substr($secondLine, 16), 100);
            }
        }
    }

    if ($existingId > 0) {
        $update = $pdo->prepare(
            'UPDATE counterparties
             SET invoice_email = COALESCE(:invoice_email, invoice_email),
                 invoice_address_line = COALESCE(:invoice_address_line, invoice_address_line),
                 invoice_postal_code = COALESCE(:invoice_postal_code, invoice_postal_code),
                 invoice_city = COALESCE(:invoice_city, invoice_city),
                 active = 1
             WHERE id = :id AND company_id = :company_id'
        );
        $update->execute([
            ':invoice_email' => $safeEmail,
            ':invoice_address_line' => $addressLine,
            ':invoice_postal_code' => $postalCode,
            ':invoice_city' => $city,
            ':id' => $existingId,
            ':company_id' => $companyId,
        ]);
        return $existingId;
    }

    $insert = $pdo->prepare(
        'INSERT INTO counterparties (
            company_id, type, legal_name, trade_name,
            invoice_address_line, invoice_postal_code, invoice_city,
            invoice_email, active
        ) VALUES (
            :company_id, :type, :legal_name, :trade_name,
            :invoice_address_line, :invoice_postal_code, :invoice_city,
            :invoice_email, 1
        )'
    );
    $insert->execute([
        ':company_id' => $companyId,
        ':type' => $type,
        ':legal_name' => $effectiveName,
        ':trade_name' => $effectiveName,
        ':invoice_address_line' => $addressLine,
        ':invoice_postal_code' => $postalCode,
        ':invoice_city' => $city,
        ':invoice_email' => $safeEmail,
    ]);

    return (int)$pdo->lastInsertId();
}

if ($action === 'upsert_admin') {
    $admin = $payload['admin'] ?? null;
    if (!is_array($admin)) {
        auth_send_json(['ok' => false, 'error' => 'invalid-payload', 'message' => 'admin payload is required'], 400);
    }

    $name = staff_string($admin['name'] ?? '', 160);
    if ($name === '') {
        auth_send_json(['ok' => false, 'error' => 'invalid-payload', 'message' => 'Admin name is required.'], 400);
    }

    $email = staff_email($admin['email'] ?? '');
    $active = staff_bool($admin['active'] ?? true, true) ? 1 : 0;
    $dbUserId = (int)($admin['dbUserId'] ?? 0);
    $emailConflict = staff_find_email_conflict($pdo, $email, $dbUserId);
    if ($emailConflict !== null) {
        staff_send_email_conflict($emailConflict, $companyId);
    }
    $sendInvitation = staff_bool($payload['sendInvitation'] ?? false, false);
    if (
        $sendInvitation
        && auth_environment_from_config($config) === 'production'
        && !auth_password_reset_delivery_available($config)
    ) {
        auth_send_json([
            'ok' => false,
            'error' => 'invitation-delivery-unavailable',
            'message' => 'De beheerder kan wel worden opgeslagen, maar e-mailuitnodigingen zijn nog niet ingeschakeld.',
        ], 409);
    }

    $createdUser = false;
    $invitationQueued = false;
    try {
        $pdo->beginTransaction();

        if ($dbUserId > 0) {
            $deactivatedAt = $active === 1 ? null : date('Y-m-d H:i:s');
            $deactivatedBy = $active === 1 ? null : $actorId;
            $update = $pdo->prepare(
                'UPDATE users
                 SET email = :email,
                     display_name = :display_name,
                     role = :role,
                     active = :active,
                     deactivated_at = :deactivated_at,
                     deactivated_by = :deactivated_by
                 WHERE id = :id AND company_id = :company_id'
            );
            $update->execute([
                ':email' => $email,
                ':display_name' => $name,
                ':role' => 'administrator',
                ':active' => $active,
                ':deactivated_at' => $deactivatedAt,
                ':deactivated_by' => $deactivatedBy,
                ':id' => $dbUserId,
                ':company_id' => $companyId,
            ]);

            // rowCount() telt gewijzigde rijen, niet gevonden rijen. Een opslag die
            // dit record niet verandert -- alleen een mailtekst of een route -- gaf
            // anders ten onrechte "niet gevonden".
            $bestaat = $pdo->prepare(
                'SELECT id FROM users WHERE id = :id AND company_id = :company_id LIMIT 1'
            );
            $bestaat->execute([':id' => $dbUserId, ':company_id' => $companyId]);
            if ($bestaat->fetchColumn() === false) {
                throw new RuntimeException('Admin user was not found in company scope.');
            }
        } else {
            $createdUser = true;
            $insert = $pdo->prepare(
                'INSERT INTO users (company_id, email, display_name, role, active, force_password_change)
                 VALUES (:company_id, :email, :display_name, :role, :active, 1)'
            );
            $insert->execute([
                ':company_id' => $companyId,
                ':email' => $email,
                ':display_name' => $name,
                ':role' => 'administrator',
                ':active' => $active,
            ]);
            $dbUserId = (int)$pdo->lastInsertId();
        }

        $audit = $pdo->prepare(
            'INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
             VALUES (:company_id, :actor_user_id, :event_type, :entity_type, :entity_id, :event_data)'
        );
        $audit->execute([
            ':company_id' => $companyId,
            ':actor_user_id' => $actorId,
            ':event_type' => 'user.admin_upsert',
            ':entity_type' => 'user',
            ':entity_id' => (string)$dbUserId,
            ':event_data' => json_encode(['email' => $email, 'display_name' => $name, 'active' => $active === 1], JSON_UNESCAPED_UNICODE),
        ]);

        if ($sendInvitation && $active === 1) {
            $reset = auth_create_password_reset($pdo, [
                'id' => $dbUserId, 'email' => $email, 'display_name' => $name,
            ], $config, 'invitation');
            if ($reset === null) {
                throw new RuntimeException('Er is recent al een uitnodiging gemaakt. Probeer het later opnieuw.');
            }
            $invitationQueued = (int)($reset['delivery_id'] ?? 0) > 0;
        }

        $passwordReadyStmt = $pdo->prepare(
            "SELECT CASE WHEN password_hash IS NOT NULL AND password_hash <> '' THEN 1 ELSE 0 END FROM users WHERE id = :id"
        );
        $passwordReadyStmt->execute([':id' => $dbUserId]);
        $invitationPending = (int)$passwordReadyStmt->fetchColumn() !== 1;

        $pdo->commit();
        auth_send_json([
            'ok' => true,
            'user_id' => $dbUserId,
            'invitation_queued' => $invitationQueued,
            'invitation_pending' => $invitationPending,
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($e instanceof PDOException && (string)$e->getCode() === '23000') {
            staff_send_email_conflict(staff_find_email_conflict($pdo, $email, $dbUserId), $companyId);
        }
        // Without this the cause is thrown away and a failed save is not
        // diagnosable: the caller only sees a generic 500.
        error_log('Employee upsert failed: ' . $e->getMessage());
        $message = $e instanceof RuntimeException
            ? $e->getMessage()
            : 'De beheerder kon niet worden opgeslagen. Probeer het opnieuw.';
        auth_send_json(['ok' => false, 'error' => 'upsert-admin-failed', 'message' => $message], 500);
    }
}

if ($action === 'upsert_employee') {
    $employee = $payload['employee'] ?? null;
    if (!is_array($employee)) {
        auth_send_json(['ok' => false, 'error' => 'invalid-payload', 'message' => 'employee payload is required'], 400);
    }

    $name = staff_string($employee['name'] ?? '', 160);
    if ($name === '') {
        auth_send_json(['ok' => false, 'error' => 'invalid-payload', 'message' => 'Employee name is required.'], 400);
    }

    $email = staff_email($employee['email'] ?? '');
    $role = staff_string($employee['role'] ?? '', 160);
    $startDate = staff_string($employee['startDate'] ?? '', 20);
    if ($startDate === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) {
        $startDate = date('Y-m-d');
    }

    $weeklyHours = (float)($employee['weeklyHours'] ?? 36);
    if ($weeklyHours < 0) {
        $weeklyHours = 0;
    }

    $rate = (float)($employee['rate'] ?? 0);
    if ($rate < 0) {
        $rate = 0;
    }

    $employeeDbUserId = (int)($employee['dbUserId'] ?? 0);
    $employeeDbId = (int)($employee['dbEmployeeId'] ?? 0);
    $emailConflict = staff_find_email_conflict($pdo, $email, $employeeDbUserId);
    if ($emailConflict !== null) {
        staff_send_email_conflict($emailConflict, $companyId);
    }
    $clientName = staff_string($employee['client'] ?? '', 180);
    $brokerName = staff_string($employee['broker'] ?? '', 180);
    $brokerEmail = staff_string($employee['brokerEmail'] ?? '', 190);

    $mailRecipients = is_array($payload['mailRecipients'] ?? null) ? $payload['mailRecipients'] : [];
    $hasMailRoutesPayload = array_key_exists('mailRecipientRoutes', $employee) && is_array($employee['mailRecipientRoutes']);
    $mailRoutes = $hasMailRoutesPayload ? $employee['mailRecipientRoutes'] : [];
    $sendInvitation = staff_bool($payload['sendInvitation'] ?? false, false);
    if (
        $sendInvitation
        && auth_environment_from_config($config) === 'production'
        && !auth_password_reset_delivery_available($config)
    ) {
        auth_send_json([
            'ok' => false,
            'error' => 'invitation-delivery-unavailable',
            'message' => 'De medewerker kan wel worden opgeslagen, maar e-mailuitnodigingen zijn nog niet ingeschakeld.',
        ], 409);
    }

    $createdUser = false;
    $invitationQueued = false;
    try {
        $pdo->beginTransaction();

        $recipientIdByKey = staff_upsert_mail_recipients($pdo, $companyId, $mailRecipients);

        if ($employeeDbUserId > 0) {
            // rowCount() reports rows CHANGED, not rows matched -- MYSQL_ATTR_FOUND_ROWS
            // is deliberately off. Treating 0 as "not found" made every save fail that
            // did not alter the user row itself: changing only a mail route, the
            // accompanying text or the rate came back as "user was not found".
            $existsStmt = $pdo->prepare(
                'SELECT id FROM users WHERE id = :id AND company_id = :company_id LIMIT 1'
            );
            $existsStmt->execute([':id' => $employeeDbUserId, ':company_id' => $companyId]);
            if ($existsStmt->fetchColumn() === false) {
                throw new RuntimeException('Employee user was not found in company scope.');
            }
            $employeeActive = staff_bool($employee['active'] ?? true, true) ? 1 : 0;
            $deactivatedAt = $employeeActive === 1 ? null : date('Y-m-d H:i:s');
            $deactivatedBy = $employeeActive === 1 ? null : $actorId;
            $updateUser = $pdo->prepare(
                'UPDATE users
                 SET email = :email,
                     display_name = :display_name,
                     role = :role,
                     active = :active,
                     deactivated_at = :deactivated_at,
                     deactivated_by = :deactivated_by
                 WHERE id = :id AND company_id = :company_id'
            );
            $updateUser->execute([
                ':email' => $email,
                ':display_name' => $name,
                ':role' => staff_role_from_payload('employee'),
                ':active' => $employeeActive,
                ':deactivated_at' => $deactivatedAt,
                ':deactivated_by' => $deactivatedBy,
                ':id' => $employeeDbUserId,
                ':company_id' => $companyId,
            ]);
        } else {
            $createdUser = true;
            $insertUser = $pdo->prepare(
                'INSERT INTO users (company_id, email, display_name, role, active, force_password_change)
                 VALUES (:company_id, :email, :display_name, :role, :active, 1)'
            );
            $insertUser->execute([
                ':company_id' => $companyId,
                ':email' => $email,
                ':display_name' => $name,
                ':role' => staff_role_from_payload('employee'),
                ':active' => staff_bool($employee['active'] ?? true, true) ? 1 : 0,
            ]);
            $employeeDbUserId = (int)$pdo->lastInsertId();
        }

        if ($employeeDbId > 0) {
            $updateEmployee = $pdo->prepare(
                'UPDATE employees
                 SET user_id = :user_id,
                     full_name = :full_name,
                     job_title = :job_title,
                     weekly_contract_hours = :weekly_contract_hours,
                     employment_start_date = :employment_start_date,
                     active = :active
                 WHERE id = :id AND company_id = :company_id'
            );
            $updateEmployee->execute([
                ':user_id' => $employeeDbUserId,
                ':full_name' => $name,
                ':job_title' => $role !== '' ? $role : null,
                ':weekly_contract_hours' => $weeklyHours,
                ':employment_start_date' => $startDate,
                ':active' => staff_bool($employee['active'] ?? true, true) ? 1 : 0,
                ':id' => $employeeDbId,
                ':company_id' => $companyId,
            ]);
            // rowCount() telt gewijzigde rijen, niet gevonden rijen. Een opslag die
            // dit record niet verandert -- alleen een mailtekst of een route -- gaf
            // anders ten onrechte "niet gevonden".
            $bestaat = $pdo->prepare(
                'SELECT id FROM employees WHERE id = :id AND company_id = :company_id LIMIT 1'
            );
            $bestaat->execute([':id' => $employeeDbId, ':company_id' => $companyId]);
            if ($bestaat->fetchColumn() === false) {
                throw new RuntimeException('Employee profile was not found in company scope.');
            }
        } else {
            $insertEmployee = $pdo->prepare(
                'INSERT INTO employees (company_id, user_id, full_name, job_title, weekly_contract_hours, employment_start_date, active)
                 VALUES (:company_id, :user_id, :full_name, :job_title, :weekly_contract_hours, :employment_start_date, :active)'
            );
            $insertEmployee->execute([
                ':company_id' => $companyId,
                ':user_id' => $employeeDbUserId,
                ':full_name' => $name,
                ':job_title' => $role !== '' ? $role : null,
                ':weekly_contract_hours' => $weeklyHours,
                ':employment_start_date' => $startDate,
                ':active' => staff_bool($employee['active'] ?? true, true) ? 1 : 0,
            ]);
            $employeeDbId = (int)$pdo->lastInsertId();
        }

        $clientId = staff_upsert_counterparty(
            $pdo,
            $companyId,
            'client',
            $clientName !== '' ? $clientName : 'Onbekende klant',
            null,
            null
        );

        $brokerId = staff_upsert_counterparty(
            $pdo,
            $companyId,
            'broker',
            $brokerName !== '' ? $brokerName : 'Onbekende broker',
            $brokerEmail,
            staff_string($employee['brokerInvoiceAddress'] ?? '', 255)
        );

        $assignmentStmt = $pdo->prepare(
            'SELECT id FROM assignments
             WHERE company_id = :company_id AND employee_id = :employee_id
             ORDER BY active DESC, id ASC LIMIT 1'
        );
        $assignmentStmt->execute([
            ':company_id' => $companyId,
            ':employee_id' => $employeeDbId,
        ]);
        $assignmentId = (int)($assignmentStmt->fetchColumn() ?: 0);

        if ($assignmentId > 0) {
            $updateAssignment = $pdo->prepare(
                'UPDATE assignments
                 SET client_id = :client_id,
                     broker_id = :broker_id,
                     assignment_name = :assignment_name,
                     invoice_project_name = :invoice_project_name,
                     project_code = :project_code,
                     agreement_number = :agreement_number,
                     creditor_number = :creditor_number,
                     contractor_number = :contractor_number,
                     invoice_number_template = :invoice_number_template,
                     invoice_subject_template = :invoice_subject_template,
                     invoice_body_template = :invoice_body_template,
                     hourly_rate = :hourly_rate,
                     broker_mail_enabled = :broker_mail_enabled,
                     broker_invoice_attachment = :broker_invoice_attachment,
                     customer_timesheet_expected = :customer_timesheet_expected,
                     customer_timesheet_due_workday = :customer_timesheet_due_workday,
                     customer_timesheet_broker_enabled = :customer_timesheet_broker_enabled,
                     customer_timesheet_use_broker_email = :customer_timesheet_use_broker_email,
                     customer_timesheet_broker_email = :customer_timesheet_broker_email,
                     invoice_without_customer_timesheet_allowed = :invoice_without_customer_timesheet_allowed,
                     active = :active
                 WHERE id = :id AND company_id = :company_id'
            );
            $updateAssignment->execute([
                ':client_id' => $clientId,
                ':broker_id' => $brokerId,
                ':assignment_name' => staff_string($employee['projectCode'] ?? '', 180) !== '' ? staff_string($employee['projectCode'] ?? '', 180) : ('Assignment ' . $employeeDbId),
                ':invoice_project_name' => staff_string($employee['invoiceProject'] ?? '', 180),
                ':project_code' => staff_string($employee['projectCode'] ?? '', 80),
                ':agreement_number' => staff_string($employee['agreementNumber'] ?? '', 80),
                ':creditor_number' => staff_string($employee['creditorNumber'] ?? '', 80),
                ':contractor_number' => staff_string($employee['contractorNumber'] ?? '', 80),
                ':invoice_number_template' => staff_string($employee['invoiceTemplate'] ?? '', 120),
                // The screen offers these two fields and the form collects them, but they
                // were never written: an edited subject or accompanying text was silently
                // discarded and the seeded value came back on the next reload.
                ':invoice_subject_template' => staff_string($employee['mailSubject'] ?? '', 255),
                ':invoice_body_template' => staff_text($employee['mailBody'] ?? '', 4000),
                ':hourly_rate' => $rate,
                ':broker_mail_enabled' => staff_bool($employee['brokerMailEnabled'] ?? true, true) ? 1 : 0,
                ':broker_invoice_attachment' => staff_bool($employee['brokerInvoiceAttachment'] ?? true, true) ? 1 : 0,
                ':customer_timesheet_expected' => staff_bool($employee['customerTimesheetExpected'] ?? true, true) ? 1 : 0,
                ':customer_timesheet_due_workday' => max(1, min(23, (int)($employee['customerTimesheetDueWorkday'] ?? 5))),
                ':customer_timesheet_broker_enabled' => staff_bool($employee['customerTimesheetBrokerEnabled'] ?? false, false) ? 1 : 0,
                ':customer_timesheet_use_broker_email' => staff_bool($employee['customerTimesheetUseBrokerEmail'] ?? true, true) ? 1 : 0,
                ':customer_timesheet_broker_email' => staff_string($employee['customerTimesheetBrokerEmail'] ?? '', 190),
                ':invoice_without_customer_timesheet_allowed' => staff_bool($employee['invoiceWithoutCustomerTimesheetAllowed'] ?? true, true) ? 1 : 0,
                ':active' => staff_bool($employee['active'] ?? true, true) ? 1 : 0,
                ':id' => $assignmentId,
                ':company_id' => $companyId,
            ]);
        } else {
            $insertAssignment = $pdo->prepare(
                'INSERT INTO assignments (
                    company_id, employee_id, client_id, broker_id,
                    assignment_name, invoice_project_name, project_code,
                    agreement_number, creditor_number, contractor_number,
                    invoice_number_template, hourly_rate, start_date,
                    invoice_subject_template, invoice_body_template,
                    broker_mail_enabled, broker_invoice_attachment,
                    bookkeeper_invoice_attachment, payroll_invoice_attachment,
                    customer_timesheet_expected, customer_timesheet_due_workday,
                    customer_timesheet_broker_enabled, customer_timesheet_use_broker_email,
                    customer_timesheet_broker_email, invoice_without_customer_timesheet_allowed,
                    active
                 ) VALUES (
                    :company_id, :employee_id, :client_id, :broker_id,
                    :assignment_name, :invoice_project_name, :project_code,
                    :agreement_number, :creditor_number, :contractor_number,
                    :invoice_number_template, :hourly_rate, :start_date,
                    :invoice_subject_template, :invoice_body_template,
                    :broker_mail_enabled, :broker_invoice_attachment,
                    :bookkeeper_invoice_attachment, :payroll_invoice_attachment,
                    :customer_timesheet_expected, :customer_timesheet_due_workday,
                    :customer_timesheet_broker_enabled, :customer_timesheet_use_broker_email,
                    :customer_timesheet_broker_email, :invoice_without_customer_timesheet_allowed,
                    :active
                 )'
            );
            $insertAssignment->execute([
                ':company_id' => $companyId,
                ':employee_id' => $employeeDbId,
                ':client_id' => $clientId,
                ':broker_id' => $brokerId,
                ':assignment_name' => staff_string($employee['projectCode'] ?? '', 180) !== '' ? staff_string($employee['projectCode'] ?? '', 180) : ('Assignment ' . $employeeDbId),
                ':invoice_project_name' => staff_string($employee['invoiceProject'] ?? '', 180),
                ':project_code' => staff_string($employee['projectCode'] ?? '', 80),
                ':agreement_number' => staff_string($employee['agreementNumber'] ?? '', 80),
                ':creditor_number' => staff_string($employee['creditorNumber'] ?? '', 80),
                ':contractor_number' => staff_string($employee['contractorNumber'] ?? '', 80),
                ':invoice_number_template' => staff_string($employee['invoiceTemplate'] ?? '', 120),
                // The screen offers these two fields and the form collects them, but they
                // were never written: an edited subject or accompanying text was silently
                // discarded and the seeded value came back on the next reload.
                ':invoice_subject_template' => staff_string($employee['mailSubject'] ?? '', 255),
                ':invoice_body_template' => staff_text($employee['mailBody'] ?? '', 4000),
                ':hourly_rate' => $rate,
                ':start_date' => $startDate,
                ':broker_mail_enabled' => staff_bool($employee['brokerMailEnabled'] ?? true, true) ? 1 : 0,
                ':broker_invoice_attachment' => staff_bool($employee['brokerInvoiceAttachment'] ?? true, true) ? 1 : 0,
                ':bookkeeper_invoice_attachment' => staff_bool($employee['bookkeeperInvoiceAttachment'] ?? true, true) ? 1 : 0,
                ':payroll_invoice_attachment' => staff_bool($employee['payrollInvoiceAttachment'] ?? false, false) ? 1 : 0,
                ':customer_timesheet_expected' => staff_bool($employee['customerTimesheetExpected'] ?? true, true) ? 1 : 0,
                ':customer_timesheet_due_workday' => max(1, min(23, (int)($employee['customerTimesheetDueWorkday'] ?? 5))),
                ':customer_timesheet_broker_enabled' => staff_bool($employee['customerTimesheetBrokerEnabled'] ?? false, false) ? 1 : 0,
                ':customer_timesheet_use_broker_email' => staff_bool($employee['customerTimesheetUseBrokerEmail'] ?? true, true) ? 1 : 0,
                ':customer_timesheet_broker_email' => staff_string($employee['customerTimesheetBrokerEmail'] ?? '', 190),
                ':invoice_without_customer_timesheet_allowed' => staff_bool($employee['invoiceWithoutCustomerTimesheetAllowed'] ?? true, true) ? 1 : 0,
                ':active' => staff_bool($employee['active'] ?? true, true) ? 1 : 0,
            ]);
            $assignmentId = (int)$pdo->lastInsertId();
        }

        if ($hasMailRoutesPayload) {
            $deleteRoutes = $pdo->prepare('DELETE FROM assignment_mail_routes WHERE assignment_id = :assignment_id');
            $deleteRoutes->execute([':assignment_id' => $assignmentId]);

            foreach ($mailRoutes as $routeKey => $routeConfig) {
                if (!is_array($routeConfig)) {
                    continue;
                }

                $recipientId = null;
                $lookupKey = (string)$routeKey;
                if (isset($recipientIdByKey[$lookupKey])) {
                    $recipientId = (int)$recipientIdByKey[$lookupKey];
                } elseif (ctype_digit($lookupKey) && isset($recipientIdByKey[(string)((int)$lookupKey)])) {
                    $recipientId = (int)$recipientIdByKey[(string)((int)$lookupKey)];
                }

                if (!$recipientId || $recipientId <= 0) {
                    continue;
                }

                $insertRoute = $pdo->prepare(
                    'INSERT INTO assignment_mail_routes (assignment_id, mail_recipient_id, enabled, include_invoice_pdf, subject_template, body_template)
                     VALUES (:assignment_id, :mail_recipient_id, :enabled, :include_invoice_pdf, :subject_template, :body_template)'
                );
                $insertRoute->execute([
                    ':assignment_id' => $assignmentId,
                    ':mail_recipient_id' => $recipientId,
                    ':enabled' => staff_bool($routeConfig['enabled'] ?? false, false) ? 1 : 0,
                    ':include_invoice_pdf' => staff_bool($routeConfig['invoiceAttachment'] ?? false, false) ? 1 : 0,
                    // Empty means inherit the assignment template; storing NULL keeps that
                    // distinction explicit instead of persisting an empty override.
                    ':subject_template' => staff_string($routeConfig['mailSubject'] ?? '', 250) !== '' ? staff_string($routeConfig['mailSubject'] ?? '', 250) : null,
                    ':body_template' => staff_text($routeConfig['mailBody'] ?? '', 4000) !== '' ? staff_text($routeConfig['mailBody'] ?? '', 4000) : null,
                ]);
            }
        }

        $audit = $pdo->prepare(
            'INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
             VALUES (:company_id, :actor_user_id, :event_type, :entity_type, :entity_id, :event_data)'
        );
        $audit->execute([
            ':company_id' => $companyId,
            ':actor_user_id' => $actorId,
            ':event_type' => 'employee.upsert',
            ':entity_type' => 'employee',
            ':entity_id' => (string)$employeeDbId,
            ':event_data' => json_encode([
                'user_id' => $employeeDbUserId,
                'full_name' => $name,
                'email' => $email,
                'assignment_id' => $assignmentId,
            ], JSON_UNESCAPED_UNICODE),
        ]);

        if ($sendInvitation && staff_bool($employee['active'] ?? true, true)) {
            $reset = auth_create_password_reset($pdo, [
                'id' => $employeeDbUserId, 'email' => $email, 'display_name' => $name,
            ], $config, 'invitation');
            if ($reset === null) {
                throw new RuntimeException('Er is recent al een uitnodiging gemaakt. Probeer het later opnieuw.');
            }
            $invitationQueued = (int)($reset['delivery_id'] ?? 0) > 0;
        }

        $passwordReadyStmt = $pdo->prepare(
            "SELECT CASE WHEN password_hash IS NOT NULL AND password_hash <> '' THEN 1 ELSE 0 END FROM users WHERE id = :id"
        );
        $passwordReadyStmt->execute([':id' => $employeeDbUserId]);
        $invitationPending = (int)$passwordReadyStmt->fetchColumn() !== 1;

        $pdo->commit();
        auth_send_json([
            'ok' => true,
            'user_id' => $employeeDbUserId,
            'employee_id' => $employeeDbId,
            'assignment_id' => $assignmentId,
            'invitation_queued' => $invitationQueued,
            'invitation_pending' => $invitationPending,
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($e instanceof PDOException && (string)$e->getCode() === '23000') {
            staff_send_email_conflict(staff_find_email_conflict($pdo, $email, $employeeDbUserId), $companyId);
        }
        $message = $e instanceof RuntimeException
            ? $e->getMessage()
            : 'De medewerker kon niet worden opgeslagen. Probeer het opnieuw.';
        auth_send_json(['ok' => false, 'error' => 'upsert-employee-failed', 'message' => $message], 500);
    }
}

auth_send_json([
    'ok' => false,
    'error' => 'invalid-action',
    'message' => 'Deze actie wordt niet ondersteund.',
], 400);
