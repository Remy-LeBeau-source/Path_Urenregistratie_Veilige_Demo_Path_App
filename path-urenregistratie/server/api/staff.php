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

function staff_upsert_mail_recipients(PDO $pdo, int $companyId, array $items): array
{
    if (!is_array($items) || $items === []) {
        $items = [];
    }

    $byKey = [];

    $existingStmt = $pdo->prepare('SELECT id, recipient_key, email FROM mail_recipients WHERE company_id = :company_id');
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

    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }

        $rawId = staff_string($item['id'] ?? '', 80);
        $numericId = ctype_digit($rawId) ? (int)$rawId : 0;
        $recipientKey = $numericId > 0 ? '' : $rawId;
        $email = staff_string($item['email'] ?? '', 190);
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            continue;
        }

        $name = staff_string($item['name'] ?? '', 160);
        if ($name === '') {
            $name = $email;
        }
        $category = staff_string($item['category'] ?? 'other', 60);
        if ($category === '') {
            $category = 'other';
        }
        $active = staff_bool($item['active'] ?? true, true) ? 1 : 0;

        $matched = null;
        if ($numericId > 0 && isset($existingById[$numericId])) {
            $matched = $existingById[$numericId];
        } elseif ($recipientKey !== '' && isset($existingByKey[$recipientKey])) {
            $matched = $existingByKey[$recipientKey];
        }

        if ($matched) {
            $recipientId = (int)$matched['id'];
            $deactivatedAt = $active === 1 ? null : date('Y-m-d H:i:s');
            $updateStmt = $pdo->prepare(
                'UPDATE mail_recipients
                 SET recipient_key = :recipient_key,
                     recipient_category = :recipient_category,
                     display_name = :display_name,
                     email = :email,
                     active = :active,
                     deactivated_at = :deactivated_at
                 WHERE id = :id AND company_id = :company_id'
            );
            $updateStmt->execute([
                ':recipient_key' => $recipientKey !== '' ? $recipientKey : $matched['recipient_key'],
                ':recipient_category' => $category,
                ':display_name' => $name,
                ':email' => $email,
                ':active' => $active,
                ':deactivated_at' => $deactivatedAt,
                ':id' => $recipientId,
                ':company_id' => $companyId,
            ]);
            $resolvedKey = $recipientKey !== '' ? $recipientKey : trim((string)($matched['recipient_key'] ?? ''));
            $byKey[$resolvedKey !== '' ? $resolvedKey : (string)$recipientId] = $recipientId;
            continue;
        }

        $insertStmt = $pdo->prepare(
            'INSERT INTO mail_recipients (company_id, recipient_key, recipient_category, display_name, email, active, deactivated_at)
             VALUES (:company_id, :recipient_key, :recipient_category, :display_name, :email, :active, :deactivated_at)'
        );
        $deactivatedAt = $active === 1 ? null : date('Y-m-d H:i:s');
        $insertStmt->execute([
            ':company_id' => $companyId,
            ':recipient_key' => $recipientKey !== '' ? $recipientKey : null,
            ':recipient_category' => $category,
            ':display_name' => $name,
            ':email' => $email,
            ':active' => $active,
            ':deactivated_at' => $deactivatedAt,
        ]);

        $insertedId = (int)$pdo->lastInsertId();
        $key = $recipientKey !== '' ? $recipientKey : (string)$insertedId;
        $byKey[$key] = $insertedId;
    }

    $finalStmt = $pdo->prepare('SELECT id, recipient_key FROM mail_recipients WHERE company_id = :company_id');
    $finalStmt->execute([':company_id' => $companyId]);
    foreach ($finalStmt->fetchAll() as $row) {
        $id = (int)$row['id'];
        $key = trim((string)($row['recipient_key'] ?? ''));
        $byKey[(string)$id] = $id;
        if ($key !== '') {
            $byKey[$key] = $id;
        }
    }

    return $byKey;
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

            if ($update->rowCount() === 0) {
                throw new RuntimeException('Admin user was not found in company scope.');
            }
        } else {
            $insert = $pdo->prepare(
                'INSERT INTO users (company_id, email, display_name, role, active)
                 VALUES (:company_id, :email, :display_name, :role, :active)'
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

        $pdo->commit();
        auth_send_json(['ok' => true, 'user_id' => $dbUserId]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        auth_send_json(['ok' => false, 'error' => 'upsert-admin-failed', 'message' => $e->getMessage()], 500);
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
    $clientName = staff_string($employee['client'] ?? '', 180);
    $brokerName = staff_string($employee['broker'] ?? '', 180);
    $brokerEmail = staff_string($employee['brokerEmail'] ?? '', 190);

    $mailRecipients = is_array($payload['mailRecipients'] ?? null) ? $payload['mailRecipients'] : [];
    $hasMailRoutesPayload = array_key_exists('mailRecipientRoutes', $employee) && is_array($employee['mailRecipientRoutes']);
    $mailRoutes = $hasMailRoutesPayload ? $employee['mailRecipientRoutes'] : [];

    try {
        $pdo->beginTransaction();

        $recipientIdByKey = staff_upsert_mail_recipients($pdo, $companyId, $mailRecipients);

        if ($employeeDbUserId > 0) {
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
            if ($updateUser->rowCount() === 0) {
                throw new RuntimeException('Employee user was not found in company scope.');
            }
        } else {
            $insertUser = $pdo->prepare(
                'INSERT INTO users (company_id, email, display_name, role, active)
                 VALUES (:company_id, :email, :display_name, :role, :active)'
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
            if ($updateEmployee->rowCount() === 0) {
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
                    'INSERT INTO assignment_mail_routes (assignment_id, mail_recipient_id, enabled, include_invoice_pdf)
                     VALUES (:assignment_id, :mail_recipient_id, :enabled, :include_invoice_pdf)'
                );
                $insertRoute->execute([
                    ':assignment_id' => $assignmentId,
                    ':mail_recipient_id' => $recipientId,
                    ':enabled' => staff_bool($routeConfig['enabled'] ?? false, false) ? 1 : 0,
                    ':include_invoice_pdf' => staff_bool($routeConfig['invoiceAttachment'] ?? false, false) ? 1 : 0,
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

        $pdo->commit();
        auth_send_json([
            'ok' => true,
            'user_id' => $employeeDbUserId,
            'employee_id' => $employeeDbId,
            'assignment_id' => $assignmentId,
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        auth_send_json(['ok' => false, 'error' => 'upsert-employee-failed', 'message' => $e->getMessage()], 500);
    }
}

auth_send_json([
    'ok' => false,
    'error' => 'invalid-action',
    'message' => 'action must be upsert_admin or upsert_employee',
], 400);
