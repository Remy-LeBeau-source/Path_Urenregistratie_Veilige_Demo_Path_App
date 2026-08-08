<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../security/csrf.php';
require_once __DIR__ . '/../security/validation.php';

header('Content-Type: application/json; charset=utf-8');
auth_apply_cors_headers(auth_try_load_raw_config(), 'GET, POST, OPTIONS', 'Content-Type, X-CSRF-Token');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$config = auth_load_raw_config();
auth_start_session_secure($config);
$pdo = auth_pdo($config);
$currentUser = auth_current_user($pdo);
auth_require_role(['administrator', 'employee'], $currentUser);

function timesheet_parse_period_key(string $periodKey): array
{
    if (!preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/', $periodKey, $matches)) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'Period must be in YYYY-MM format.',
        ], 400);
    }

    return [
        'year' => (int)$matches[1],
        'month' => (int)$matches[2],
        'period_key' => $periodKey,
    ];
}

function timesheet_decimal(array $payload, string $field, float $default = 0.0): float
{
    if (!array_key_exists($field, $payload) || $payload[$field] === null || $payload[$field] === '') {
        return $default;
    }

    $raw = $payload[$field];
    if (!is_numeric($raw)) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'Field ' . $field . ' must be numeric.',
        ], 400);
    }

    $value = round((float)$raw, 2);
    if ($value < 0) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'Field ' . $field . ' cannot be negative.',
        ], 400);
    }

    return $value;
}

function timesheet_optional_employee_id(array $payload): ?int
{
    if (!array_key_exists('employee_id', $payload) || $payload['employee_id'] === null || $payload['employee_id'] === '') {
        return null;
    }

    $raw = $payload['employee_id'];
    if (is_int($raw) && $raw > 0) {
        return $raw;
    }

    if (is_string($raw) && ctype_digit($raw) && (int)$raw > 0) {
        return (int)$raw;
    }

    auth_send_json([
        'ok' => false,
        'error' => 'invalid-payload',
        'message' => 'employee_id must be a positive integer when provided.',
    ], 400);
}

function timesheet_employee_from_payload(PDO $pdo, array $currentUser, array $payload): array
{
    $requestedEmployeeId = timesheet_optional_employee_id($payload);

    if ((string)$currentUser['role'] === 'employee') {
        $stmt = $pdo->prepare('SELECT id, company_id, user_id, full_name, active FROM employees WHERE company_id = :company_id AND user_id = :user_id LIMIT 1');
        $stmt->execute([
            ':company_id' => (int)$currentUser['company_id'],
            ':user_id' => (int)$currentUser['id'],
        ]);
        $employee = $stmt->fetch();

        if (!$employee) {
            auth_send_json([
                'ok' => false,
                'error' => 'employee-profile-missing',
                'message' => 'Employee account is not linked to an employee record.',
            ], 403);
        }

        if ($requestedEmployeeId !== null && (int)$employee['id'] !== $requestedEmployeeId) {
            auth_send_json([
                'ok' => false,
                'error' => 'forbidden-employee-scope',
                'message' => 'Employee can only modify own timesheet.',
            ], 403);
        }

        return [
            'id' => (int)$employee['id'],
            'company_id' => (int)$employee['company_id'],
            'full_name' => (string)$employee['full_name'],
        ];
    }

    if ($requestedEmployeeId === null) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'employee_id is required for administrator writes.',
        ], 400);
    }

    $stmt = $pdo->prepare('SELECT id, company_id, full_name, active FROM employees WHERE id = :id AND company_id = :company_id LIMIT 1');
    $stmt->execute([
        ':id' => $requestedEmployeeId,
        ':company_id' => (int)$currentUser['company_id'],
    ]);
    $employee = $stmt->fetch();

    if (!$employee) {
        auth_send_json([
            'ok' => false,
            'error' => 'employee-not-found',
            'message' => 'Employee was not found in your company scope.',
        ], 404);
    }

    return [
        'id' => (int)$employee['id'],
        'company_id' => (int)$employee['company_id'],
        'full_name' => (string)$employee['full_name'],
    ];
}

function timesheet_assignment_id(PDO $pdo, int $companyId, int $employeeId): int
{
    $stmt = $pdo->prepare('SELECT id FROM assignments WHERE company_id = :company_id AND employee_id = :employee_id AND active = 1 ORDER BY id LIMIT 1');
    $stmt->execute([
        ':company_id' => $companyId,
        ':employee_id' => $employeeId,
    ]);
    $row = $stmt->fetch();

    if (!$row) {
        auth_send_json([
            'ok' => false,
            'error' => 'assignment-not-found',
            'message' => 'No active assignment found for this employee.',
        ], 409);
    }

    return (int)$row['id'];
}

function timesheet_parse_day_entries(array $payload, int $year, int $month, float $billableHours): array
{
    if (!isset($payload['day_entries']) || !is_array($payload['day_entries'])) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'day_entries is required and must be an array.',
        ], 400);
    }

    $normalized = [];
    $sumHours = 0.0;

    foreach ($payload['day_entries'] as $index => $entry) {
        if (!is_array($entry)) {
            auth_send_json([
                'ok' => false,
                'error' => 'invalid-payload',
                'message' => 'Each day_entries item must be an object.',
            ], 400);
        }

        $workDate = trim((string)($entry['work_date'] ?? ''));
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $workDate, $matches)) {
            auth_send_json([
                'ok' => false,
                'error' => 'invalid-payload',
                'message' => 'Each day entry work_date must be in YYYY-MM-DD format.',
            ], 400);
        }

        $entryYear = (int)$matches[1];
        $entryMonth = (int)$matches[2];
        $entryDay = (int)$matches[3];

        if (!checkdate($entryMonth, $entryDay, $entryYear)) {
            auth_send_json([
                'ok' => false,
                'error' => 'invalid-payload',
                'message' => 'Each day entry work_date must be a valid date.',
            ], 400);
        }

        if ($entryYear !== $year || $entryMonth !== $month) {
            auth_send_json([
                'ok' => false,
                'error' => 'invalid-payload',
                'message' => 'Each day entry work_date must be within the selected period.',
            ], 400);
        }

        $rawHours = $entry['hours'] ?? null;
        if (!is_numeric($rawHours)) {
            auth_send_json([
                'ok' => false,
                'error' => 'invalid-payload',
                'message' => 'Each day entry hours field must be numeric.',
            ], 400);
        }

        $hours = round((float)$rawHours, 2);
        if ($hours < 0 || $hours > 24) {
            auth_send_json([
                'ok' => false,
                'error' => 'invalid-payload',
                'message' => 'Each day entry hours value must be between 0 and 24.',
            ], 400);
        }

        if ($hours <= 0.0) {
            continue;
        }

        $description = trim((string)($entry['description'] ?? ''));
        if (strlen($description) > 200) {
            auth_send_json([
                'ok' => false,
                'error' => 'invalid-payload',
                'message' => 'Each day entry description must be at most 200 characters.',
            ], 400);
        }

        $normalized[] = [
            'work_date' => $workDate,
            'hours' => $hours,
            'description' => $description !== '' ? $description : 'Webapp daginvoer',
        ];
        $sumHours += $hours;
    }

    if (abs(round($sumHours, 2) - round($billableHours, 2)) > 0.01) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'billable_hours must match the total of day_entries hours.',
        ], 400);
    }

    return $normalized;
}

function timesheet_ensure_period(PDO $pdo, int $companyId, int $year, int $month): int
{
    $stmt = $pdo->prepare('SELECT id FROM periods WHERE company_id = :company_id AND year = :year AND month = :month LIMIT 1');
    $stmt->execute([
        ':company_id' => $companyId,
        ':year' => $year,
        ':month' => $month,
    ]);
    $row = $stmt->fetch();
    if ($row) {
        return (int)$row['id'];
    }

    $insert = $pdo->prepare('INSERT INTO periods (company_id, year, month, status) VALUES (:company_id, :year, :month, :status)');
    $insert->execute([
        ':company_id' => $companyId,
        ':year' => $year,
        ':month' => $month,
        ':status' => 'open',
    ]);

    return (int)$pdo->lastInsertId();
}

function timesheet_find(PDO $pdo, int $companyId, int $periodId, int $employeeId, int $assignmentId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT id, status, submitted_at, approved_at, approved_by, review_note, version
         FROM timesheets
         WHERE period_id = :period_id AND employee_id = :employee_id AND assignment_id = :assignment_id
                     AND period_id IN (SELECT id FROM periods WHERE id = :period_id_scope AND company_id = :period_company_id)
                     AND assignment_id IN (SELECT id FROM assignments WHERE id = :assignment_id_scope AND company_id = :assignment_company_id)
         LIMIT 1'
    );
    $stmt->execute([
        ':period_id' => $periodId,
        ':period_id_scope' => $periodId,
                ':period_company_id' => $companyId,
        ':employee_id' => $employeeId,
        ':assignment_id' => $assignmentId,
        ':assignment_id_scope' => $assignmentId,
                ':assignment_company_id' => $companyId,
    ]);

    $row = $stmt->fetch();
    return $row ?: null;
}

function timesheet_write_entries(PDO $pdo, int $timesheetId, array $dayEntries, float $leaveHours, float $sicknessHours, int $year, int $month): void
{
    $delete = $pdo->prepare('DELETE FROM time_entries WHERE timesheet_id = :timesheet_id AND entry_type IN (\'billable\', \'leave\', \'sickness\')');
    $delete->execute([':timesheet_id' => $timesheetId]);

    $workDate = (new DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month)))->format('Y-m-t');

    $insert = $pdo->prepare(
        'INSERT INTO time_entries (timesheet_id, work_date, entry_type, hours, description)
         VALUES (:timesheet_id, :work_date, :entry_type, :hours, :description)'
    );

    foreach ($dayEntries as $row) {
        $insert->execute([
            ':timesheet_id' => $timesheetId,
            ':work_date' => $row['work_date'],
            ':entry_type' => 'billable',
            ':hours' => $row['hours'],
            ':description' => $row['description'],
        ]);
    }

    $summaryRows = [
        ['type' => 'leave', 'hours' => $leaveHours],
        ['type' => 'sickness', 'hours' => $sicknessHours],
    ];

    foreach ($summaryRows as $row) {
        if ((float)$row['hours'] <= 0.0) {
            continue;
        }

        $insert->execute([
            ':timesheet_id' => $timesheetId,
            ':work_date' => $workDate,
            ':entry_type' => $row['type'],
            ':hours' => $row['hours'],
            ':description' => 'Webapp samenvatting',
        ]);
    }
}

function timesheet_last_audit(PDO $pdo, int $companyId, int $timesheetId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT event_type, created_at
         FROM audit_log
         WHERE company_id = :company_id
           AND entity_type = :entity_type
           AND entity_id = :entity_id
         ORDER BY id DESC
         LIMIT 1'
    );
    $stmt->execute([
        ':company_id' => $companyId,
        ':entity_type' => 'timesheet',
        ':entity_id' => (string)$timesheetId,
    ]);

    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }

    return [
        'event_type' => (string)$row['event_type'],
        'created_at' => (string)$row['created_at'],
    ];
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $periodKey = security_require_string_field($_GET, 'period', 'Period is required.', 7);
    $period = timesheet_parse_period_key($periodKey);

    $employee = timesheet_employee_from_payload($pdo, $currentUser, $_GET);
    $assignmentId = timesheet_assignment_id($pdo, (int)$currentUser['company_id'], (int)$employee['id']);

    $periodStmt = $pdo->prepare('SELECT id FROM periods WHERE company_id = :company_id AND year = :year AND month = :month LIMIT 1');
    $periodStmt->execute([
        ':company_id' => (int)$currentUser['company_id'],
        ':year' => $period['year'],
        ':month' => $period['month'],
    ]);
    $periodRow = $periodStmt->fetch();

    if (!$periodRow) {
        auth_send_json([
            'ok' => true,
            'found' => false,
            'period' => $period['period_key'],
            'employee_id' => (int)$employee['id'],
        ]);
    }

    $timesheet = timesheet_find($pdo, (int)$currentUser['company_id'], (int)$periodRow['id'], (int)$employee['id'], $assignmentId);
    if (!$timesheet) {
        auth_send_json([
            'ok' => true,
            'found' => false,
            'period' => $period['period_key'],
            'employee_id' => (int)$employee['id'],
        ]);
    }

    $audit = timesheet_last_audit($pdo, (int)$currentUser['company_id'], (int)$timesheet['id']);
    auth_send_json([
        'ok' => true,
        'found' => true,
        'period' => $period['period_key'],
        'employee_id' => (int)$employee['id'],
        'timesheet' => [
            'id' => (int)$timesheet['id'],
            'status' => (string)$timesheet['status'],
            'submitted_at' => $timesheet['submitted_at'],
            'version' => (int)$timesheet['version'],
        ],
        'last_audit' => $audit,
    ]);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    auth_send_json([
        'ok' => false,
        'error' => 'method-not-allowed',
        'message' => 'Only GET and POST are allowed on this endpoint.',
    ], 405);
}

security_require_csrf_token();
$payload = security_read_json_body();

$action = security_require_enum_field($payload, 'action', ['save_draft', 'submit'], 'Invalid timesheet action.');
$period = timesheet_parse_period_key(security_require_string_field($payload, 'period', 'Period is required.', 7));
$employee = timesheet_employee_from_payload($pdo, $currentUser, $payload);

$contractualHours = timesheet_decimal($payload, 'contractual_hours', 0.0);
$billableHours = timesheet_decimal($payload, 'billable_hours', 0.0);
$leaveHours = timesheet_decimal($payload, 'leave_hours', 0.0);
$sicknessHours = timesheet_decimal($payload, 'sickness_hours', 0.0);
$employeeNote = isset($payload['employee_note']) ? trim((string)$payload['employee_note']) : '';
$dayEntries = timesheet_parse_day_entries($payload, $period['year'], $period['month'], $billableHours);

$companyId = (int)$currentUser['company_id'];
$employeeId = (int)$employee['id'];
$assignmentId = timesheet_assignment_id($pdo, $companyId, $employeeId);
$statusRequested = $action === 'submit' ? 'submitted' : 'draft';

$pdo->beginTransaction();

try {
    $periodId = timesheet_ensure_period($pdo, $companyId, $period['year'], $period['month']);
    $existing = timesheet_find($pdo, $companyId, $periodId, $employeeId, $assignmentId);

    $timesheetId = 0;
    $statusToPersist = $statusRequested;

    if ($existing) {
        $timesheetId = (int)$existing['id'];
        $existingStatus = (string)$existing['status'];

        if (in_array($existingStatus, ['approved', 'invoiced', 'rejected'], true)) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            auth_send_json([
                'ok' => false,
                'error' => 'timesheet-locked',
                'message' => 'Approved or invoiced timesheets cannot be changed.',
            ], 409);
        }

        if ($existingStatus === 'submitted') {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            auth_send_json([
                'ok' => false,
                'error' => 'timesheet-already-submitted',
                'message' => 'Submitted timesheets require a correction flow before changes.',
            ], 409);
        }

        if (!in_array($existingStatus, ['draft', 'correction'], true)) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            auth_send_json([
                'ok' => false,
                'error' => 'invalid-timesheet-state',
                'message' => 'Only draft or correction timesheets can be changed in this flow.',
            ], 409);
        }

        if ($action === 'save_draft' && $existingStatus === 'correction') {
            $statusToPersist = 'correction';
        }

        $update = $pdo->prepare(
            'UPDATE timesheets
             SET contractual_hours = :contractual_hours,
                 billable_hours = :billable_hours,
                 leave_hours = :leave_hours,
                 sickness_hours = :sickness_hours,
                 status = :status,
                 employee_note = :employee_note,
                 review_note = CASE WHEN :clear_review = 1 THEN NULL ELSE review_note END,
                 submitted_at = CASE WHEN :submitted = 1 THEN CURRENT_TIMESTAMP ELSE submitted_at END,
                 approved_at = NULL,
                 approved_by = NULL,
                 version = version + 1
             WHERE id = :id'
        );
        $update->execute([
            ':contractual_hours' => $contractualHours,
            ':billable_hours' => $billableHours,
            ':leave_hours' => $leaveHours,
            ':sickness_hours' => $sicknessHours,
            ':status' => $statusToPersist,
            ':employee_note' => $employeeNote !== '' ? $employeeNote : null,
            ':clear_review' => $action === 'submit' ? 1 : 0,
            ':submitted' => $action === 'submit' ? 1 : 0,
            ':id' => $timesheetId,
        ]);
    } else {
        $insert = $pdo->prepare(
            'INSERT INTO timesheets
             (period_id, employee_id, assignment_id, contractual_hours, billable_hours, leave_hours, sickness_hours, status, employee_note, submitted_at)
             VALUES
             (:period_id, :employee_id, :assignment_id, :contractual_hours, :billable_hours, :leave_hours, :sickness_hours, :status, :employee_note, CASE WHEN :submitted = 1 THEN CURRENT_TIMESTAMP ELSE NULL END)'
        );
        $insert->execute([
            ':period_id' => $periodId,
            ':employee_id' => $employeeId,
            ':assignment_id' => $assignmentId,
            ':contractual_hours' => $contractualHours,
            ':billable_hours' => $billableHours,
            ':leave_hours' => $leaveHours,
            ':sickness_hours' => $sicknessHours,
            ':status' => $statusToPersist,
            ':employee_note' => $employeeNote !== '' ? $employeeNote : null,
            ':submitted' => $action === 'submit' ? 1 : 0,
        ]);

        $timesheetId = (int)$pdo->lastInsertId();
    }

    timesheet_write_entries($pdo, $timesheetId, $dayEntries, $leaveHours, $sicknessHours, $period['year'], $period['month']);

    $eventType = $action === 'submit' ? 'timesheet.submitted' : 'timesheet.draft_saved';
    $eventData = json_encode([
        'period' => $period['period_key'],
        'employee_id' => $employeeId,
        'hours' => [
            'contractual' => $contractualHours,
            'billable' => $billableHours,
            'leave' => $leaveHours,
            'sickness' => $sicknessHours,
        ],
        'status' => $statusToPersist,
        'source' => 'webapp',
    ], JSON_UNESCAPED_UNICODE);

    $audit = $pdo->prepare(
        'INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
         VALUES (:company_id, :actor_user_id, :event_type, :entity_type, :entity_id, :event_data)'
    );
    $audit->execute([
        ':company_id' => $companyId,
        ':actor_user_id' => (int)$currentUser['id'],
        ':event_type' => $eventType,
        ':entity_type' => 'timesheet',
        ':entity_id' => (string)$timesheetId,
        ':event_data' => $eventData,
    ]);

    $latest = timesheet_find($pdo, $companyId, $periodId, $employeeId, $assignmentId);

    $pdo->commit();

    auth_send_json([
        'ok' => true,
        'period' => $period['period_key'],
        'employee_id' => $employeeId,
        'timesheet' => [
            'id' => (int)$latest['id'],
            'status' => (string)$latest['status'],
            'submitted_at' => $latest['submitted_at'],
            'version' => (int)$latest['version'],
        ],
        'audit_event' => $eventType,
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    auth_send_json([
        'ok' => false,
        'error' => 'timesheet-write-failed',
        'message' => 'Could not store timesheet write action.',
    ], 500);
}
