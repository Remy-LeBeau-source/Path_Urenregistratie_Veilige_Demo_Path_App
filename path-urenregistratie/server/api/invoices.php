<?php

declare(strict_types=1);

require __DIR__ . '/common.php';

api_require_get_only();
$pdo = api_pdo();

$period = isset($_GET['period']) ? trim((string)$_GET['period']) : null;
$year = null;
$month = null;

if ($period !== null && $period !== '') {
    if (!preg_match('/^(\\d{4})-(\\d{2})$/', $period, $matches)) {
        api_send_json([
            'ok' => false,
            'error' => 'invalid-period',
            'message' => "period must match YYYY-MM, e.g. 2026-07"
        ], 400);
    }
    $year = (int)$matches[1];
    $month = (int)$matches[2];
    if ($month < 1 || $month > 12) {
        api_send_json([
            'ok' => false,
            'error' => 'invalid-period',
            'message' => "period month must be between 01 and 12"
        ], 400);
    }
}

try {
    $sql = "
        SELECT
            i.invoice_number,
            e.full_name AS employee_name,
            CONCAT(p.year, '-', LPAD(p.month, 2, '0')) AS period_key,
            i.status,
            i.subtotal,
            i.vat_amount,
            i.total
        FROM invoices i
        JOIN timesheets t ON t.id = i.timesheet_id
        JOIN employees e ON e.id = t.employee_id
        JOIN periods p ON p.id = t.period_id
    ";

    if ($year !== null && $month !== null) {
        $sql .= ' WHERE p.year = :year AND p.month = :month';
    }

    $sql .= ' ORDER BY p.year DESC, p.month DESC, i.invoice_number DESC';

    $stmt = $pdo->prepare($sql);
    if ($year !== null && $month !== null) {
        $stmt->bindValue(':year', $year, PDO::PARAM_INT);
        $stmt->bindValue(':month', $month, PDO::PARAM_INT);
    }

    $stmt->execute();
    $rows = $stmt->fetchAll();

    api_send_json([
        'ok' => true,
        'period_filter' => $period,
        'items' => array_map(static function (array $row): array {
            return [
                'invoice_number' => (string)$row['invoice_number'],
                'employee_name' => (string)$row['employee_name'],
                'period_key' => (string)$row['period_key'],
                'status' => (string)$row['status'],
                'subtotal' => (float)$row['subtotal'],
                'vat_amount' => (float)$row['vat_amount'],
                'total' => (float)$row['total'],
            ];
        }, $rows),
    ]);
} catch (Throwable $e) {
    api_send_json([
        'ok' => false,
        'error' => 'invoices-query-failed',
        'message' => $e->getMessage(),
    ], 500);
}
