<?php

declare(strict_types=1);

require __DIR__ . '/common.php';

api_require_get_only();
$pdo = api_auth_pdo();
$currentUser = api_require_authenticated_read_user($pdo);
$isEmployee = (string)$currentUser['role'] === 'employee';
$employee = $isEmployee ? api_require_employee_context($pdo, $currentUser) : null;

$companyId = isset($_GET['company_id']) && ctype_digit((string)$_GET['company_id']) ? (int)$_GET['company_id'] : null;
api_forbidden_company_scope($companyId, $currentUser);
$companyId = (int)$currentUser['company_id'];

try {
    $periodSql = "
        SELECT
            CONCAT(p.year, '-', LPAD(p.month, 2, '0')) AS period_key,
            SUM(CASE WHEN t.status IN ('approved', 'invoiced') THEN 1 ELSE 0 END) AS gecontroleerd,
            SUM(CASE WHEN t.status = 'submitted' THEN 1 ELSE 0 END) AS klaar_voor_controle,
            SUM(CASE WHEN t.status IN ('draft', 'correction', 'rejected') THEN 1 ELSE 0 END) AS uren_blokkades,
            COUNT(DISTINCT t.employee_id) AS medewerkers
        FROM periods p
        LEFT JOIN timesheets t ON t.period_id = p.id
    ";

    if ($isEmployee && $employee) {
        $periodSql .= ' AND t.employee_id = :employee_id';
    }

    $periodSql .= ' WHERE p.company_id = :company_id';

    $periodSql .= ' GROUP BY p.year, p.month ORDER BY p.year, p.month';

    $periodStmt = $pdo->prepare($periodSql);

    $periodStmt->bindValue(':company_id', $companyId, PDO::PARAM_INT);
    if ($isEmployee && $employee) {
        $periodStmt->bindValue(':employee_id', (int)$employee['id'], PDO::PARAM_INT);
    }

    $periodStmt->execute();

    $perMaand = array_map(static function (array $row): array {
        return [
            'period_key' => (string)$row['period_key'],
            'gecontroleerd' => (int)$row['gecontroleerd'],
            'klaar_voor_controle' => (int)$row['klaar_voor_controle'],
            'uren_blokkades' => (int)$row['uren_blokkades'],
            'medewerkers' => (int)$row['medewerkers'],
        ];
    }, $periodStmt->fetchAll());

    api_send_json([
        'ok' => true,
        'per_maand' => $perMaand,
    ]);
} catch (Throwable $e) {
    api_send_json([
        'ok' => false,
        'error' => 'dashboard-query-failed',
        'message' => 'Het dashboard kon niet worden geladen. Ververs de pagina.',
    ], 500);
}
