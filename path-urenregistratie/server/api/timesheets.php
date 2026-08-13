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

function timesheet_expected_version(array $payload, bool $required): ?int
{
    if (!array_key_exists('expected_version', $payload) || $payload['expected_version'] === null || $payload['expected_version'] === '') {
        if ($required) {
            auth_send_json([
                'ok' => false,
                'error' => 'invalid-payload',
                'message' => 'expected_version is required for this action.',
            ], 400);
        }

        return null;
    }

    $raw = $payload['expected_version'];
    if (is_int($raw) && $raw > 0) {
        return $raw;
    }

    if (is_string($raw) && ctype_digit($raw) && (int)$raw > 0) {
        return (int)$raw;
    }

    auth_send_json([
        'ok' => false,
        'error' => 'invalid-payload',
        'message' => 'expected_version must be a positive integer.',
    ], 400);
}

function timesheet_correction_message(array $payload): string
{
    $message = security_require_string_field($payload, 'correction_message', 'correction_message is required.', 2000);
    $message = trim($message);
    if ($message === '') {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'correction_message is required.',
        ], 400);
    }

    return $message;
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
        'SELECT id, status, contractual_hours, billable_hours, leave_hours, sickness_hours,
                employee_note, review_note, submitted_at, approved_at, approved_by, version
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

function timesheet_day_entries(PDO $pdo, int $timesheetId): array
{
    $stmt = $pdo->prepare(
        'SELECT work_date, hours, description
         FROM time_entries
         WHERE timesheet_id = :timesheet_id AND entry_type = :entry_type
         ORDER BY work_date ASC, id ASC'
    );
    $stmt->execute([
        ':timesheet_id' => $timesheetId,
        ':entry_type' => 'billable',
    ]);

    return array_map(static function (array $row): array {
        return [
            'work_date' => (string)$row['work_date'],
            'hours' => (float)$row['hours'],
            'description' => (string)$row['description'],
        ];
    }, $stmt->fetchAll());
}

function timesheet_correction_history(PDO $pdo, int $timesheetId): array
{
    $stmt = $pdo->prepare(
        'SELECT tc.id, tc.requested_by, tc.correction_message, tc.requested_at, tc.resubmitted_at,
                u.display_name AS requested_by_name
         FROM timesheet_corrections tc
         LEFT JOIN users u ON u.id = tc.requested_by
         WHERE tc.timesheet_id = :timesheet_id
         ORDER BY tc.requested_at ASC, tc.id ASC'
    );
    $stmt->execute([':timesheet_id' => $timesheetId]);

    return array_map(static function (array $row): array {
        return [
            'id' => (int)$row['id'],
            'requested_by' => (int)$row['requested_by'],
            'requested_by_name' => (string)($row['requested_by_name'] ?? ''),
            'correction_message' => (string)$row['correction_message'],
            'requested_at' => (string)$row['requested_at'],
            'resubmitted_at' => $row['resubmitted_at'],
        ];
    }, $stmt->fetchAll());
}

function timesheet_payload_from_row(array $timesheet, array $dayEntries, array $correctionHistory): array
{
    $latestCorrection = count($correctionHistory) ? $correctionHistory[count($correctionHistory) - 1] : null;

    return [
        'id' => (int)$timesheet['id'],
        'status' => (string)$timesheet['status'],
        'contractual_hours' => (float)$timesheet['contractual_hours'],
        'billable_hours' => (float)$timesheet['billable_hours'],
        'leave_hours' => (float)$timesheet['leave_hours'],
        'sickness_hours' => (float)$timesheet['sickness_hours'],
        'employee_note' => $timesheet['employee_note'],
        'review_note' => $timesheet['review_note'],
        'day_entries' => $dayEntries,
        'submitted_at' => $timesheet['submitted_at'],
        'approved_at' => $timesheet['approved_at'],
        'approved_by' => $timesheet['approved_by'] !== null ? (int)$timesheet['approved_by'] : null,
        'version' => (int)$timesheet['version'],
        'latest_correction' => $latestCorrection,
        'correction_history' => $correctionHistory,
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
    $dayEntries = timesheet_day_entries($pdo, (int)$timesheet['id']);
    $correctionHistory = timesheet_correction_history($pdo, (int)$timesheet['id']);
    auth_send_json([
        'ok' => true,
        'found' => true,
        'period' => $period['period_key'],
        'employee_id' => (int)$employee['id'],
        'timesheet' => timesheet_payload_from_row($timesheet, $dayEntries, $correctionHistory),
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

$action = security_require_enum_field($payload, 'action', ['save_draft', 'submit', 'request_correction', 'approve'], 'Invalid timesheet action.');
$period = timesheet_parse_period_key(security_require_string_field($payload, 'period', 'Period is required.', 7));
$employee = timesheet_employee_from_payload($pdo, $currentUser, $payload);

$expectedVersion = null;
$correctionMessage = '';
$needsWritePayload = in_array($action, ['save_draft', 'submit'], true);

if ($action === 'request_correction' || $action === 'approve') {
    if ((string)$currentUser['role'] !== 'administrator') {
        auth_send_json([
            'ok' => false,
            'error' => 'forbidden-action',
            'message' => 'Only administrator can perform this action.',
        ], 403);
    }

    $expectedVersion = timesheet_expected_version($payload, true);
}

if ($action === 'request_correction') {
    $correctionMessage = timesheet_correction_message($payload);
}

$contractualHours = 0.0;
$billableHours = 0.0;
$leaveHours = 0.0;
$sicknessHours = 0.0;
$employeeNote = '';
$dayEntries = [];

if ($needsWritePayload) {
    $contractualHours = timesheet_decimal($payload, 'contractual_hours', 0.0);
    $billableHours = timesheet_decimal($payload, 'billable_hours', 0.0);
    $leaveHours = timesheet_decimal($payload, 'leave_hours', 0.0);
    $sicknessHours = timesheet_decimal($payload, 'sickness_hours', 0.0);
    $employeeNote = isset($payload['employee_note']) ? trim((string)$payload['employee_note']) : '';
    $dayEntries = timesheet_parse_day_entries($payload, $period['year'], $period['month'], $billableHours);
}

$companyId = (int)$currentUser['company_id'];
$employeeId = (int)$employee['id'];
$assignmentId = timesheet_assignment_id($pdo, $companyId, $employeeId);

$statusRequested = 'draft';
if ($action === 'submit') {
    $statusRequested = 'submitted';
}
if ($action === 'request_correction') {
    $statusRequested = 'correction';
}
if ($action === 'approve') {
    $statusRequested = 'approved';
}

$pdo->beginTransaction();

try {
    $periodId = timesheet_ensure_period($pdo, $companyId, $period['year'], $period['month']);
    $existing = timesheet_find($pdo, $companyId, $periodId, $employeeId, $assignmentId);

    $timesheetId = 0;
    $statusToPersist = $statusRequested;
    $eventType = '';

    if ($existing) {
        $timesheetId = (int)$existing['id'];
        $existingStatus = (string)$existing['status'];

        if (in_array($action, ['save_draft', 'submit'], true) && in_array($existingStatus, ['approved', 'invoiced', 'rejected'], true)) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            auth_send_json([
                'ok' => false,
                'error' => 'timesheet-locked',
                'message' => 'Approved or invoiced timesheets cannot be changed.',
            ], 409);
        }

        if ($action === 'save_draft' && !in_array($existingStatus, ['draft', 'submitted', 'correction'], true)) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            auth_send_json([
                'ok' => false,
                'error' => 'invalid-timesheet-state',
                'message' => 'Alleen concept-, ingediende of correctie-urenstaten kunnen in deze flow worden aangepast.',
            ], 409);
        }

        if ($action === 'submit' && !in_array($existingStatus, ['draft', 'submitted', 'correction'], true)) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            auth_send_json([
                'ok' => false,
                'error' => 'invalid-timesheet-transition',
                'message' => 'Deze urenstaat kan niet opnieuw worden ingediend omdat hij al is goedgekeurd of vergrendeld.',
            ], 409);
        }

        if ($action === 'save_draft' || $action === 'submit') {
            $expectedVersion = timesheet_expected_version($payload, false);

            if ($action === 'save_draft' && $existingStatus === 'correction') {
                $statusToPersist = 'correction';
            }

            if ($expectedVersion !== null) {
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
                     WHERE id = :id AND version = :expected_version'
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
                    ':expected_version' => $expectedVersion,
                ]);

                if ($update->rowCount() === 0) {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }
                    auth_send_json([
                        'ok' => false,
                        'error' => 'stale-version',
                        'message' => 'Timesheet was changed by someone else. Reload and try again.',
                    ], 409);
                }
            } else {
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
            }

            timesheet_write_entries($pdo, $timesheetId, $dayEntries, $leaveHours, $sicknessHours, $period['year'], $period['month']);

            if ($action === 'submit' && $existingStatus === 'correction') {
                $closeCorrection = $pdo->prepare(
                    'UPDATE timesheet_corrections
                     SET resubmitted_at = CURRENT_TIMESTAMP
                     WHERE id = (
                         SELECT correction_id
                         FROM (
                             SELECT id AS correction_id
                             FROM timesheet_corrections
                             WHERE timesheet_id = :timesheet_id AND resubmitted_at IS NULL
                             ORDER BY requested_at DESC, id DESC
                             LIMIT 1
                         ) latest
                     )'
                );
                $closeCorrection->execute([':timesheet_id' => $timesheetId]);
                $eventType = 'timesheet.resubmitted';
            } elseif ($action === 'submit') {
                $eventType = 'timesheet.submitted';
            } else {
                $eventType = 'timesheet.draft_saved';
            }
        } elseif ($action === 'request_correction') {
            if (!in_array($existingStatus, ['submitted', 'approved'], true)) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                auth_send_json([
                    'ok' => false,
                    'error' => 'invalid-timesheet-transition',
                    'message' => 'Only submitted or approved timesheets can be moved to correction.',
                ], 409);
            }

            if ($existingStatus === 'approved') {
                $invoice = $pdo->prepare(
                    'SELECT id, status, locked_at
                     FROM invoices
                     WHERE timesheet_id = :timesheet_id
                     ORDER BY id DESC
                     LIMIT 1
                     FOR UPDATE'
                );
                $invoice->execute([':timesheet_id' => $timesheetId]);
                $existingInvoice = $invoice->fetch();
                if ($existingInvoice) {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }
                    auth_send_json([
                        'ok' => false,
                        'error' => 'timesheet-invoiced',
                        'message' => 'Approved timesheet cannot be reopened after an invoice has been created.',
                    ], 409);
                }
            }

            $update = $pdo->prepare(
                'UPDATE timesheets
                 SET status = :status,
                     review_note = :review_note,
                     approved_at = NULL,
                     approved_by = NULL,
                     version = version + 1
                 WHERE id = :id AND version = :expected_version'
            );
            $update->execute([
                ':status' => 'correction',
                ':review_note' => $correctionMessage,
                ':id' => $timesheetId,
                ':expected_version' => $expectedVersion,
            ]);

            if ($update->rowCount() === 0) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                auth_send_json([
                    'ok' => false,
                    'error' => 'stale-version',
                    'message' => 'Timesheet was changed by someone else. Reload and try again.',
                ], 409);
            }

            $insertCorrection = $pdo->prepare(
                'INSERT INTO timesheet_corrections (timesheet_id, requested_by, correction_message)
                 VALUES (:timesheet_id, :requested_by, :correction_message)'
            );
            $insertCorrection->execute([
                ':timesheet_id' => $timesheetId,
                ':requested_by' => (int)$currentUser['id'],
                ':correction_message' => $correctionMessage,
            ]);

            $eventType = $existingStatus === 'approved'
                ? 'timesheet.approval_reopened'
                : 'timesheet.correction_requested';
        } elseif ($action === 'approve') {
            if ($existingStatus !== 'submitted') {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                auth_send_json([
                    'ok' => false,
                    'error' => 'invalid-timesheet-transition',
                    'message' => 'Only submitted timesheets can be approved.',
                ], 409);
            }

            $update = $pdo->prepare(
                'UPDATE timesheets
                 SET status = :status,
                     approved_at = CURRENT_TIMESTAMP,
                     approved_by = :approved_by,
                     version = version + 1
                 WHERE id = :id AND version = :expected_version'
            );
            $update->execute([
                ':status' => 'approved',
                ':approved_by' => (int)$currentUser['id'],
                ':id' => $timesheetId,
                ':expected_version' => $expectedVersion,
            ]);

            if ($update->rowCount() === 0) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                auth_send_json([
                    'ok' => false,
                    'error' => 'stale-version',
                    'message' => 'Timesheet was changed by someone else. Reload and try again.',
                ], 409);
            }

            $eventType = 'timesheet.approved';
        }
    } else {
        if ($action === 'request_correction' || $action === 'approve') {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            auth_send_json([
                'ok' => false,
                'error' => 'timesheet-not-found',
                'message' => 'No timesheet exists for this employee and period.',
            ], 404);
        }

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

        timesheet_write_entries($pdo, $timesheetId, $dayEntries, $leaveHours, $sicknessHours, $period['year'], $period['month']);
        $eventType = $action === 'submit' ? 'timesheet.submitted' : 'timesheet.draft_saved';
    }

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
    $latestDayEntries = timesheet_day_entries($pdo, (int)$latest['id']);
    $latestCorrectionHistory = timesheet_correction_history($pdo, (int)$latest['id']);
    $latestAudit = timesheet_last_audit($pdo, $companyId, (int)$latest['id']);

    $pdo->commit();

    auth_send_json([
        'ok' => true,
        'period' => $period['period_key'],
        'employee_id' => $employeeId,
        'timesheet' => timesheet_payload_from_row($latest, $latestDayEntries, $latestCorrectionHistory),
        'latest_correction' => count($latestCorrectionHistory) ? $latestCorrectionHistory[count($latestCorrectionHistory) - 1] : null,
        'correction_history' => $latestCorrectionHistory,
        'last_audit' => $latestAudit,
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
