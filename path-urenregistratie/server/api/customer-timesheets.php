<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../security/csrf.php';
require_once __DIR__ . '/../security/validation.php';
require_once __DIR__ . '/../lib/simple_pdf.php';

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

function customer_timesheet_json(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function customer_timesheet_parse_period_key(string $periodKey): array
{
    if (!preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/', $periodKey, $matches)) {
        customer_timesheet_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'De periode moet de notatie JJJJ-MM hebben.',
        ], 400);
    }

    return [
        'year' => (int)$matches[1],
        'month' => (int)$matches[2],
        'period_key' => $periodKey,
    ];
}

function customer_timesheet_optional_positive_int(array $payload, string $field): ?int
{
    if (!array_key_exists($field, $payload) || $payload[$field] === null || $payload[$field] === '') {
        return null;
    }

    $raw = $payload[$field];
    if (is_int($raw) && $raw > 0) {
        return $raw;
    }

    if (is_string($raw) && ctype_digit($raw) && (int)$raw > 0) {
        return (int)$raw;
    }

    customer_timesheet_json([
        'ok' => false,
        'error' => 'invalid-payload',
        'message' => $field . ' must be a positive integer when provided.',
    ], 400);
}

function customer_timesheet_required_text(array $payload, string $field, int $maxLength = 2000): string
{
    $value = trim((string)($payload[$field] ?? ''));
    if ($value === '' || strlen($value) > $maxLength) {
        customer_timesheet_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => $field . ' is required.',
        ], 400);
    }

    return $value;
}

function customer_timesheet_employee_from_payload(PDO $pdo, array $currentUser, array $payload): array
{
    $requestedEmployeeId = customer_timesheet_optional_positive_int($payload, 'employee_id');

    if ((string)$currentUser['role'] === 'employee') {
        $stmt = $pdo->prepare('SELECT id, company_id, user_id, full_name, active FROM employees WHERE company_id = :company_id AND user_id = :user_id LIMIT 1');
        $stmt->execute([
            ':company_id' => (int)$currentUser['company_id'],
            ':user_id' => (int)$currentUser['id'],
        ]);
        $employee = $stmt->fetch();

        if (!$employee) {
            customer_timesheet_json([
                'ok' => false,
                'error' => 'employee-profile-missing',
                'message' => 'Dit medewerkersaccount is niet gekoppeld aan een medewerkersrecord.',
            ], 403);
        }

        if ($requestedEmployeeId !== null && (int)$employee['id'] !== $requestedEmployeeId) {
            customer_timesheet_json([
                'ok' => false,
                'error' => 'forbidden-employee-scope',
                'message' => 'Een medewerker kan alleen de eigen klanturenstaat openen.',
            ], 403);
        }

        return [
            'id' => (int)$employee['id'],
            'company_id' => (int)$employee['company_id'],
            'full_name' => (string)$employee['full_name'],
        ];
    }

    if ($requestedEmployeeId === null) {
        customer_timesheet_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'Voor een beheeractie is een medewerker vereist.',
        ], 400);
    }

    $stmt = $pdo->prepare('SELECT id, company_id, full_name, active FROM employees WHERE id = :id AND company_id = :company_id LIMIT 1');
    $stmt->execute([
        ':id' => $requestedEmployeeId,
        ':company_id' => (int)$currentUser['company_id'],
    ]);
    $employee = $stmt->fetch();

    if (!$employee) {
        customer_timesheet_json([
            'ok' => false,
            'error' => 'employee-not-found',
            'message' => 'De medewerker is niet gevonden binnen jouw bedrijfsomgeving.',
        ], 404);
    }

    return [
        'id' => (int)$employee['id'],
        'company_id' => (int)$employee['company_id'],
        'full_name' => (string)$employee['full_name'],
    ];
}

function customer_timesheet_assignment_id(PDO $pdo, int $companyId, int $employeeId, ?int $requestedAssignmentId): int
{
    if ($requestedAssignmentId !== null) {
        $stmt = $pdo->prepare('SELECT id FROM assignments WHERE id = :id AND company_id = :company_id AND employee_id = :employee_id LIMIT 1');
        $stmt->execute([
            ':id' => $requestedAssignmentId,
            ':company_id' => $companyId,
            ':employee_id' => $employeeId,
        ]);
        $row = $stmt->fetch();
        if ($row) {
            return (int)$row['id'];
        }

        customer_timesheet_json([
            'ok' => false,
            'error' => 'assignment-not-found',
            'message' => 'De gevraagde plaatsing is niet gevonden binnen jouw bedrijfsomgeving.',
        ], 404);
    }

    $stmt = $pdo->prepare('SELECT id FROM assignments WHERE company_id = :company_id AND employee_id = :employee_id ORDER BY active DESC, id ASC LIMIT 1');
    $stmt->execute([
        ':company_id' => $companyId,
        ':employee_id' => $employeeId,
    ]);
    $row = $stmt->fetch();

    if (!$row) {
        customer_timesheet_json([
            'ok' => false,
            'error' => 'assignment-not-found',
            'message' => 'Voor deze medewerker is geen plaatsing gevonden.',
        ], 409);
    }

    return (int)$row['id'];
}

function customer_timesheet_ensure_period(PDO $pdo, int $companyId, int $year, int $month): int
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

function customer_timesheet_find(PDO $pdo, int $companyId, int $periodId, int $employeeId, int $assignmentId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT id, status, storage_key, original_file_name, stored_file_name, mime_type,
                uploaded_at, uploaded_by, reviewed_at, reviewed_by, review_note, sent_to_broker_at,
                reminder_count, last_reminder_at, created_at, updated_at
         FROM customer_timesheets
         WHERE period_id = :period_id
           AND employee_id = :employee_id
           AND assignment_id = :assignment_id
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

function customer_timesheet_storage_root(array $config): string
{
    $privateRoot = auth_private_root_from_config($config);
    return rtrim($privateRoot, '/\\') . DIRECTORY_SEPARATOR . 'customer-timesheets';
}

function customer_timesheet_relative_path(int $companyId, int $employeeId, string $periodKey, string $extension): string
{
    $token = bin2hex(random_bytes(8));
    $safePeriod = str_replace('-', '_', $periodKey);
    return (string)$companyId . '/' . (string)$employeeId . '/' . $safePeriod . '/' . gmdate('Ymd_His') . '_' . $token . '.' . $extension;
}

function customer_timesheet_mkdir_for(string $absolutePath): void
{
    $dir = dirname($absolutePath);
    if (!is_dir($dir)) {
        if (!mkdir($dir, 0775, true) && !is_dir($dir)) {
            customer_timesheet_json([
                'ok' => false,
                'error' => 'storage-failed',
                'message' => 'De opslagmap voor klanturenstaten kon niet worden aangemaakt.',
            ], 500);
        }
    }
}

function customer_timesheet_detect_upload(array $file): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        customer_timesheet_json([
            'ok' => false,
            'error' => 'invalid-upload',
            'message' => 'Het uploaden van het bestand is mislukt.',
        ], 400);
    }

    $size = (int)($file['size'] ?? 0);
    if ($size <= 0 || $size > (2 * 1024 * 1024)) {
        customer_timesheet_json([
            'ok' => false,
            'error' => 'invalid-upload',
            'message' => 'Het bestand moet groter zijn dan 0 en maximaal 2 MB groot zijn.',
        ], 400);
    }

    $tmpName = (string)($file['tmp_name'] ?? '');
    if ($tmpName === '' || !is_file($tmpName)) {
        customer_timesheet_json([
            'ok' => false,
            'error' => 'invalid-upload',
            'message' => 'Voor het geuploade bestand ontbreekt tijdelijke opslag.',
        ], 400);
    }

    $originalName = trim((string)($file['name'] ?? ''));
    $originalName = $originalName !== '' ? basename($originalName) : 'document';

    $mimeType = '';
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo !== false) {
            $detected = finfo_file($finfo, $tmpName);
            finfo_close($finfo);
            if (is_string($detected) && $detected !== '') {
                $mimeType = strtolower($detected);
            }
        }
    } elseif (function_exists('mime_content_type')) {
        $detected = mime_content_type($tmpName);
        if (is_string($detected) && $detected !== '') {
            $mimeType = strtolower($detected);
        }
    }
    $ext = strtolower((string)pathinfo($originalName, PATHINFO_EXTENSION));

    if ($mimeType === '' || $mimeType === 'application/octet-stream' || $mimeType === 'text/plain') {
        if ($ext === 'pdf') {
            $mimeType = 'application/pdf';
        } elseif ($ext === 'jpg' || $ext === 'jpeg') {
            $mimeType = 'image/jpeg';
        } elseif ($ext === 'png') {
            $mimeType = 'image/png';
        }
    }

    $allowed = [
        'application/pdf' => 'pdf',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
    ];

    if (!isset($allowed[$mimeType])) {
        customer_timesheet_json([
            'ok' => false,
            'error' => 'invalid-upload',
            'message' => 'Alleen PDF, JPG en PNG zijn toegestaan.',
        ], 400);
    }

    return [
        'tmp_name' => $tmpName,
        'size' => $size,
        'original_name' => $originalName,
        'mime_type' => $mimeType,
        'extension' => $allowed[$mimeType],
    ];
}

function customer_timesheet_convert_image_to_pdf_bytes(string $tmpPath, string $mimeType): ?string
{
    if (!is_uploaded_file($tmpPath)) {
        return null;
    }

    $image = null;
    if ($mimeType === 'image/jpeg' && function_exists('imagecreatefromjpeg')) {
        $image = @imagecreatefromjpeg($tmpPath);
    } elseif ($mimeType === 'image/png' && function_exists('imagecreatefrompng')) {
        $image = @imagecreatefrompng($tmpPath);
    }

    if (!($image instanceof \GdImage)) {
        return null;
    }

    // Flatten any transparency onto white before re-encoding as a normalized JPEG.
    $width = imagesx($image);
    $height = imagesy($image);
    $flattened = imagecreatetruecolor($width, $height);
    imagefill($flattened, 0, 0, (int)imagecolorallocate($flattened, 255, 255, 255));
    imagecopy($flattened, $image, 0, 0, 0, 0, $width, $height);
    imagedestroy($image);

    ob_start();
    imagejpeg($flattened, null, 90);
    $jpegBytes = (string)ob_get_clean();
    imagedestroy($flattened);

    if ($jpegBytes === '') {
        return null;
    }

    $pdfBytes = simple_pdf_from_jpeg($jpegBytes, $width, $height);
    return simple_pdf_looks_valid($pdfBytes) ? $pdfBytes : null;
}

function customer_timesheet_store_upload(array $config, array $upload, int $companyId, int $employeeId, string $periodKey): array
{
    $mimeType = $upload['mime_type'];
    $extension = $upload['extension'];
    $pdfBytes = null;

    // JPG/PNG uploads are converted server-side to PDF so every stored klanturenstaat is a PDF.
    if ($mimeType === 'image/jpeg' || $mimeType === 'image/png') {
        $pdfBytes = customer_timesheet_convert_image_to_pdf_bytes($upload['tmp_name'], $mimeType);
        if ($pdfBytes !== null) {
            $mimeType = 'application/pdf';
            $extension = 'pdf';
        }
    }

    $root = customer_timesheet_storage_root($config);
    $relative = customer_timesheet_relative_path($companyId, $employeeId, $periodKey, $extension);
    $absolute = rtrim($root, '/\\') . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);

    customer_timesheet_mkdir_for($absolute);

    if ($pdfBytes !== null) {
        if (file_put_contents($absolute, $pdfBytes) === false) {
            customer_timesheet_json([
                'ok' => false,
                'error' => 'storage-failed',
                'message' => 'De geuploade klanturenstaat kon niet worden opgeslagen.',
            ], 500);
        }
    } elseif (!move_uploaded_file($upload['tmp_name'], $absolute)) {
        customer_timesheet_json([
            'ok' => false,
            'error' => 'storage-failed',
            'message' => 'De geuploade klanturenstaat kon niet worden opgeslagen.',
        ], 500);
    }

    return [
        'storage_key' => $relative,
        'stored_file_name' => basename($absolute),
        'original_file_name' => $upload['original_name'],
        'mime_type' => $mimeType,
        'absolute_path' => $absolute,
    ];
}

function customer_timesheet_absolute_from_key(array $config, string $storageKey): string
{
    $root = rtrim(customer_timesheet_storage_root($config), '/\\');
    return $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, ltrim($storageKey, '/\\'));
}

function customer_timesheet_delete_existing_file(array $config, ?string $storageKey): void
{
    $key = trim((string)$storageKey);
    if ($key === '') {
        return;
    }

    $path = customer_timesheet_absolute_from_key($config, $key);
    if (is_file($path)) {
        @unlink($path);
    }
}

function customer_timesheet_audit(PDO $pdo, int $companyId, int $actorUserId, int $entityId, string $eventType, array $eventData): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
         VALUES (:company_id, :actor_user_id, :event_type, :entity_type, :entity_id, :event_data)'
    );
    $stmt->execute([
        ':company_id' => $companyId,
        ':actor_user_id' => $actorUserId,
        ':event_type' => $eventType,
        ':entity_type' => 'customer_timesheet',
        ':entity_id' => (string)$entityId,
        ':event_data' => json_encode($eventData, JSON_UNESCAPED_UNICODE),
    ]);
}

function customer_timesheet_payload_from_row(array $row, string $periodKey, int $employeeId, int $assignmentId): array
{
    return [
        'id' => (int)$row['id'],
        'period' => $periodKey,
        'employee_id' => $employeeId,
        'assignment_id' => $assignmentId,
        'status' => (string)$row['status'],
        'storage_key' => (string)($row['storage_key'] ?? ''),
        'original_file_name' => (string)($row['original_file_name'] ?? ''),
        'stored_file_name' => (string)($row['stored_file_name'] ?? ''),
        'mime_type' => (string)($row['mime_type'] ?? 'application/pdf'),
        'uploaded_at' => $row['uploaded_at'],
        'uploaded_by' => $row['uploaded_by'] !== null ? (int)$row['uploaded_by'] : null,
        'reviewed_at' => $row['reviewed_at'],
        'reviewed_by' => $row['reviewed_by'] !== null ? (int)$row['reviewed_by'] : null,
        'review_note' => (string)($row['review_note'] ?? ''),
        'sent_to_broker_at' => $row['sent_to_broker_at'],
        'reminder_count' => (int)($row['reminder_count'] ?? 0),
        'last_reminder_at' => $row['last_reminder_at'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
        'download_url' => '/server/api/customer-timesheets.php?action=download&period=' . rawurlencode($periodKey) . '&employee_id=' . (string)$employeeId . '&assignment_id=' . (string)$assignmentId,
    ];
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $query = $_GET;
    $periodRaw = trim((string)($query['period'] ?? ''));
    if ($periodRaw === '') {
        customer_timesheet_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'period is required.',
        ], 400);
    }

    $period = customer_timesheet_parse_period_key($periodRaw);
    $employee = customer_timesheet_employee_from_payload($pdo, $currentUser, $query);
    $assignmentId = customer_timesheet_assignment_id(
        $pdo,
        (int)$currentUser['company_id'],
        (int)$employee['id'],
        customer_timesheet_optional_positive_int($query, 'assignment_id')
    );

    $periodId = customer_timesheet_ensure_period($pdo, (int)$currentUser['company_id'], $period['year'], $period['month']);
    $existing = customer_timesheet_find($pdo, (int)$currentUser['company_id'], $periodId, (int)$employee['id'], $assignmentId);

    $action = trim((string)($query['action'] ?? 'read'));
    if ($action === 'download') {
        if (!$existing) {
            customer_timesheet_json([
                'ok' => false,
                'error' => 'customer-timesheet-not-found',
                'message' => 'Voor deze periode en medewerker bestaat geen klanturenstaat.',
            ], 404);
        }

        $storageKey = trim((string)($existing['storage_key'] ?? ''));
        if ($storageKey === '') {
            customer_timesheet_json([
                'ok' => false,
                'error' => 'customer-timesheet-file-missing',
                'message' => 'Aan deze klanturenstaat is geen bestand gekoppeld.',
            ], 404);
        }

        $absolutePath = customer_timesheet_absolute_from_key($config, $storageKey);
        if (!is_file($absolutePath)) {
            customer_timesheet_json([
                'ok' => false,
                'error' => 'customer-timesheet-file-missing',
                'message' => 'Het opgeslagen bestand is niet gevonden op de server.',
            ], 404);
        }

        $downloadName = (string)($existing['original_file_name'] ?? $existing['stored_file_name'] ?? 'klanturenstaat.pdf');
        $mimeType = (string)($existing['mime_type'] ?? 'application/pdf');

        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . (string)filesize($absolutePath));
        header('Content-Disposition: attachment; filename="' . str_replace('"', '', $downloadName) . '"');
        readfile($absolutePath);
        exit;
    }

    if (!$existing) {
        customer_timesheet_json([
            'ok' => true,
            'found' => false,
            'period' => $period['period_key'],
            'employee_id' => (int)$employee['id'],
            'assignment_id' => $assignmentId,
            'customer_timesheet' => null,
        ]);
    }

    customer_timesheet_json([
        'ok' => true,
        'found' => true,
        'period' => $period['period_key'],
        'employee_id' => (int)$employee['id'],
        'assignment_id' => $assignmentId,
        'customer_timesheet' => customer_timesheet_payload_from_row($existing, $period['period_key'], (int)$employee['id'], $assignmentId),
    ]);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    customer_timesheet_json([
        'ok' => false,
        'error' => 'method-not-allowed',
        'message' => 'Alleen GET en POST zijn toegestaan voor dit endpoint.',
    ], 405);
}

security_require_csrf_token();

$payload = $_POST;
if (!$payload) {
    $payload = security_read_json_body();
}

$action = security_require_enum_field(
    $payload,
    'action',
    ['save_draft', 'submit', 'approve', 'request_resubmit', 'mark_sent', 'mark_sent_to_broker', 'mark_skipped', 'restore_missing'],
    'Invalid customer timesheet action.'
);
$period = customer_timesheet_parse_period_key(security_require_string_field($payload, 'period', 'period is required.', 7));
$employee = customer_timesheet_employee_from_payload($pdo, $currentUser, $payload);
$companyId = (int)$currentUser['company_id'];
$employeeId = (int)$employee['id'];
$assignmentId = customer_timesheet_assignment_id($pdo, $companyId, $employeeId, customer_timesheet_optional_positive_int($payload, 'assignment_id'));

if (in_array($action, ['approve', 'request_resubmit', 'mark_sent', 'mark_sent_to_broker'], true) && (string)$currentUser['role'] !== 'administrator') {
    customer_timesheet_json([
        'ok' => false,
        'error' => 'forbidden-action',
        'message' => 'Alleen een beheerder kan deze actie uitvoeren.',
    ], 403);
}

$reviewNote = '';
if ($action === 'request_resubmit' || $action === 'mark_skipped') {
    $reviewNote = customer_timesheet_required_text($payload, 'review_note', 2000);
}

$uploaded = null;
if (isset($_FILES['file']) && is_array($_FILES['file'])) {
    $uploaded = customer_timesheet_detect_upload($_FILES['file']);
}

$pdo->beginTransaction();

try {
    $periodId = customer_timesheet_ensure_period($pdo, $companyId, $period['year'], $period['month']);
    $existing = customer_timesheet_find($pdo, $companyId, $periodId, $employeeId, $assignmentId);

    $statusToPersist = 'missing';
    $eventType = '';
    $timesheetId = $existing ? (int)$existing['id'] : 0;

    if ($action === 'save_draft' || $action === 'submit') {
        $statusToPersist = $action === 'submit' ? 'received' : 'draft';
        $eventType = $action === 'submit' ? 'customer_timesheet.submitted' : 'customer_timesheet.draft_saved';

        if ($existing) {
            $existingStatus = (string)$existing['status'];
            if (in_array($existingStatus, ['approved', 'sent', 'sent_to_broker'], true)) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                customer_timesheet_json([
                    'ok' => false,
                    'error' => 'customer-timesheet-locked',
                    'message' => 'Een goedgekeurde of verzonden klanturenstaat kan in deze status niet worden vervangen.',
                ], 409);
            }
        }

        if (!$uploaded && (!$existing || trim((string)$existing['storage_key']) === '')) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            customer_timesheet_json([
                'ok' => false,
                'error' => 'invalid-upload',
                'message' => 'Voor de eerste upload is een bestand vereist.',
            ], 400);
        }

        $stored = null;
        if ($uploaded) {
            $stored = customer_timesheet_store_upload($config, $uploaded, $companyId, $employeeId, $period['period_key']);
        }

        if ($existing) {
            if ($stored) {
                customer_timesheet_delete_existing_file($config, (string)$existing['storage_key']);
            }

            $update = $pdo->prepare(
                'UPDATE customer_timesheets
                 SET status = :status,
                     storage_key = :storage_key,
                     original_file_name = :original_file_name,
                     stored_file_name = :stored_file_name,
                     mime_type = :mime_type,
                     uploaded_at = CASE WHEN :set_uploaded_at = 1 THEN CURRENT_TIMESTAMP ELSE uploaded_at END,
                     uploaded_by = CASE WHEN :set_uploaded_by = 1 THEN :uploaded_by ELSE uploaded_by END,
                     reviewed_at = NULL,
                     reviewed_by = NULL,
                     review_note = NULL,
                     sent_to_broker_at = NULL
                 WHERE id = :id'
            );
            $update->execute([
                ':status' => $statusToPersist,
                ':storage_key' => $stored ? $stored['storage_key'] : (string)$existing['storage_key'],
                ':original_file_name' => $stored ? $stored['original_file_name'] : (string)$existing['original_file_name'],
                ':stored_file_name' => $stored ? $stored['stored_file_name'] : (string)$existing['stored_file_name'],
                ':mime_type' => $stored ? $stored['mime_type'] : (string)$existing['mime_type'],
                ':set_uploaded_at' => $stored ? 1 : 0,
                ':set_uploaded_by' => $stored ? 1 : 0,
                ':uploaded_by' => (int)$currentUser['id'],
                ':id' => $timesheetId,
            ]);
        } else {
            $insert = $pdo->prepare(
                'INSERT INTO customer_timesheets
                 (period_id, employee_id, assignment_id, status, storage_key, original_file_name, stored_file_name, mime_type, uploaded_at, uploaded_by)
                 VALUES
                 (:period_id, :employee_id, :assignment_id, :status, :storage_key, :original_file_name, :stored_file_name, :mime_type, CURRENT_TIMESTAMP, :uploaded_by)'
            );
            $insert->execute([
                ':period_id' => $periodId,
                ':employee_id' => $employeeId,
                ':assignment_id' => $assignmentId,
                ':status' => $statusToPersist,
                ':storage_key' => $stored['storage_key'],
                ':original_file_name' => $stored['original_file_name'],
                ':stored_file_name' => $stored['stored_file_name'],
                ':mime_type' => $stored['mime_type'],
                ':uploaded_by' => (int)$currentUser['id'],
            ]);
            $timesheetId = (int)$pdo->lastInsertId();
        }
    } elseif ($action === 'approve' || $action === 'request_resubmit' || $action === 'mark_sent' || $action === 'mark_sent_to_broker' || $action === 'mark_skipped' || $action === 'restore_missing') {
        if (!$existing) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            customer_timesheet_json([
                'ok' => false,
                'error' => 'customer-timesheet-not-found',
                'message' => 'No customer timesheet exists for this period and employee.',
            ], 404);
        }

        $existingStatus = (string)$existing['status'];

        if ($action === 'approve') {
            if ($existingStatus !== 'received') {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                customer_timesheet_json([
                    'ok' => false,
                    'error' => 'invalid-customer-timesheet-transition',
                    'message' => 'Alleen een ingediende klanturenstaat kan worden goedgekeurd.',
                ], 409);
            }

            $statusToPersist = 'approved';
            $eventType = 'customer_timesheet.approved';
            $update = $pdo->prepare(
                'UPDATE customer_timesheets
                 SET status = :status,
                     reviewed_at = CURRENT_TIMESTAMP,
                     reviewed_by = :reviewed_by,
                     review_note = NULL
                 WHERE id = :id'
            );
            $update->execute([
                ':status' => $statusToPersist,
                ':reviewed_by' => (int)$currentUser['id'],
                ':id' => (int)$existing['id'],
            ]);
        } elseif ($action === 'request_resubmit') {
            if (!in_array($existingStatus, ['received', 'approved'], true)) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                customer_timesheet_json([
                    'ok' => false,
                    'error' => 'invalid-customer-timesheet-transition',
                    'message' => 'Alleen een ingediende of goedgekeurde klanturenstaat kan opnieuw worden opgevraagd.',
                ], 409);
            }

            $statusToPersist = 'resubmit';
            $eventType = 'customer_timesheet.resubmit_requested';
            $update = $pdo->prepare(
                'UPDATE customer_timesheets
                 SET status = :status,
                     reviewed_at = CURRENT_TIMESTAMP,
                     reviewed_by = :reviewed_by,
                     review_note = :review_note,
                     sent_to_broker_at = NULL
                 WHERE id = :id'
            );
            $update->execute([
                ':status' => $statusToPersist,
                ':reviewed_by' => (int)$currentUser['id'],
                ':review_note' => $reviewNote,
                ':id' => (int)$existing['id'],
            ]);
        } elseif ($action === 'mark_sent') {
            if ($existingStatus !== 'approved') {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                customer_timesheet_json([
                    'ok' => false,
                    'error' => 'invalid-customer-timesheet-transition',
                    'message' => 'Alleen een goedgekeurde klanturenstaat kan als verzonden worden gemarkeerd.',
                ], 409);
            }

            $statusToPersist = 'sent';
            $eventType = 'customer_timesheet.sent';
            $update = $pdo->prepare('UPDATE customer_timesheets SET status = :status WHERE id = :id');
            $update->execute([
                ':status' => $statusToPersist,
                ':id' => (int)$existing['id'],
            ]);
        } elseif ($action === 'mark_sent_to_broker') {
            if (!in_array($existingStatus, ['approved', 'sent'], true)) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                customer_timesheet_json([
                    'ok' => false,
                    'error' => 'invalid-customer-timesheet-transition',
                    'message' => 'Alleen een goedgekeurde of verzonden klanturenstaat kan naar de brokerroute worden gezet.',
                ], 409);
            }

            $statusToPersist = 'sent_to_broker';
            $eventType = 'customer_timesheet.sent_to_broker';
            $update = $pdo->prepare(
                'UPDATE customer_timesheets
                 SET status = :status,
                     sent_to_broker_at = CURRENT_TIMESTAMP
                 WHERE id = :id'
            );
            $update->execute([
                ':status' => $statusToPersist,
                ':id' => (int)$existing['id'],
            ]);
        } elseif ($action === 'mark_skipped') {
            if ((string)$currentUser['role'] !== 'employee') {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                customer_timesheet_json([
                    'ok' => false,
                    'error' => 'forbidden-action',
                    'message' => 'Alleen een medewerker kan een klanturenstaat als rechtstreeks gemaild registreren.',
                ], 403);
            }

            $statusToPersist = 'skipped';
            $eventType = 'customer_timesheet.skipped';
            $update = $pdo->prepare(
                'UPDATE customer_timesheets
                 SET status = :status,
                     review_note = :review_note,
                     reviewed_at = CURRENT_TIMESTAMP,
                     reviewed_by = :reviewed_by
                 WHERE id = :id'
            );
            $update->execute([
                ':status' => $statusToPersist,
                ':review_note' => $reviewNote,
                ':reviewed_by' => (int)$currentUser['id'],
                ':id' => (int)$existing['id'],
            ]);
        } else {
            if ((string)$currentUser['role'] !== 'employee') {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                customer_timesheet_json([
                    'ok' => false,
                    'error' => 'forbidden-action',
                    'message' => 'Alleen een medewerker kan de status terugzetten naar ontbrekend.',
                ], 403);
            }

            if ($existingStatus !== 'skipped') {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                customer_timesheet_json([
                    'ok' => false,
                    'error' => 'invalid-customer-timesheet-transition',
                    'message' => 'Alleen een als rechtstreeks gemaild geregistreerde klanturenstaat kan worden teruggezet naar ontbrekend.',
                ], 409);
            }

            $statusToPersist = 'missing';
            $eventType = 'customer_timesheet.restored';
            $update = $pdo->prepare(
                'UPDATE customer_timesheets
                 SET status = :status,
                     review_note = NULL,
                     reviewed_at = NULL,
                     reviewed_by = NULL
                 WHERE id = :id'
            );
            $update->execute([
                ':status' => $statusToPersist,
                ':id' => (int)$existing['id'],
            ]);
        }

        $timesheetId = (int)$existing['id'];
    }

    $latest = customer_timesheet_find($pdo, $companyId, $periodId, $employeeId, $assignmentId);

    customer_timesheet_audit(
        $pdo,
        $companyId,
        (int)$currentUser['id'],
        (int)$latest['id'],
        $eventType,
        [
            'period' => $period['period_key'],
            'employee_id' => $employeeId,
            'assignment_id' => $assignmentId,
            'status' => (string)$latest['status'],
            'source' => 'webapp',
        ]
    );

    $pdo->commit();

    customer_timesheet_json([
        'ok' => true,
        'period' => $period['period_key'],
        'employee_id' => $employeeId,
        'assignment_id' => $assignmentId,
        'customer_timesheet' => customer_timesheet_payload_from_row($latest, $period['period_key'], $employeeId, $assignmentId),
        'audit_event' => $eventType,
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    $debugMessage = 'Could not store customer timesheet action.';

    customer_timesheet_json([
        'ok' => false,
        'error' => 'customer-timesheet-write-failed',
        'message' => $debugMessage,
    ], 500);
}
