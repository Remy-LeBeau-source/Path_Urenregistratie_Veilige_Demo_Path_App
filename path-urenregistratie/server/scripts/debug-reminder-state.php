<?php

declare(strict_types=1);

// Tijdelijk diagnose-script voor de intermitterende REM-H-001-mislukking op
// CI (sent.weekly blijft 0 terwijl de opzet lokaal altijd werkt). Print de
// ruwe company/employee/user-rijen plus de exacte SELECT die
// send_weekly_reminders() gebruikt, zodat we kunnen zien welke voorwaarde
// niet klopt in plaats van te blijven gissen. Wordt verwijderd zodra de
// oorzaak gevonden en gefixt is.

require_once __DIR__ . '/cli-bootstrap.php';

$options = ops_options($argv);
try {
    $config = ops_load_config($options);
    $dbConfig = ops_database_config($config);
    $pdo = ops_pdo($config);
    $email = (string)($options['email'] ?? '');

    $connInfo = $pdo->query("SELECT DATABASE() AS db_name, @@hostname AS server_hostname, @@port AS server_port, CONNECTION_ID() AS connection_id, NOW() AS db_now")->fetch();
    $dbInfo = $connInfo;
    $userCount = (int)($pdo->query('SELECT COUNT(*) AS n FROM users')->fetch()['n'] ?? -1);
    $likeStmt = $pdo->prepare("SELECT id, email FROM users WHERE email LIKE :pattern ORDER BY id DESC LIMIT 5");
    $likeStmt->execute([':pattern' => 'rem-h-001-%']);
    $recentRemUsers = $likeStmt->fetchAll();

    $userRow = null;
    $employeeRow = null;
    $companyRow = null;
    if ($email !== '') {
        $stmt = $pdo->prepare('SELECT id, company_id, email, active, role FROM users WHERE email = :email');
        $stmt->execute([':email' => $email]);
        $userRow = $stmt->fetch() ?: null;

        if ($userRow) {
            $stmt = $pdo->prepare('SELECT id, company_id, user_id, full_name, active FROM employees WHERE user_id = :uid');
            $stmt->execute([':uid' => $userRow['id']]);
            $employeeRow = $stmt->fetch() ?: null;

            $stmt = $pdo->prepare(
                'SELECT id, weekly_reminder_enabled, weekly_reminder_day, weekly_reminder_time FROM companies WHERE id = :cid'
            );
            $stmt->execute([':cid' => $userRow['company_id']]);
            $companyRow = $stmt->fetch() ?: null;
        }
    }

    $selectMatch = null;
    if ($employeeRow && $companyRow) {
        $now = isset($options['now']) ? (new DateTimeImmutable((string)$options['now']))->setTimezone(new DateTimeZone('Europe/Amsterdam')) : new DateTimeImmutable('now', new DateTimeZone('Europe/Amsterdam'));
        $weekStart = $now->setTime(0, 0, 0)->modify('monday this week');
        $weekEnd = $weekStart->modify('+7 days');
        $stmt = $pdo->prepare(
            'SELECT e.id AS employee_id, e.full_name, u.id AS user_id, u.email, e.active AS e_active, u.active AS u_active,
                    up.hour_reminders AS pref_hour_reminders,
                    (SELECT COUNT(*) FROM time_entries te JOIN timesheets t ON t.id = te.timesheet_id
                       WHERE t.employee_id = e.id AND te.work_date >= :week_start AND te.work_date < :week_end AND te.hours > 0) AS hours_this_week
             FROM employees e
             JOIN users u ON u.id = e.user_id
             LEFT JOIN user_preferences up ON up.user_id = u.id
             WHERE e.id = :employee_id'
        );
        $stmt->execute([':employee_id' => $employeeRow['id'], ':week_start' => $weekStart->format('Y-m-d'), ':week_end' => $weekEnd->format('Y-m-d')]);
        $selectMatch = $stmt->fetch() ?: null;

        $isoYear = (int)$now->format('o');
        $isoWeek = (int)$now->format('W');
        $periodKey = sprintf('%04d-W%02d', $isoYear, $isoWeek);
        $stmt = $pdo->prepare('SELECT * FROM reminder_log WHERE company_id = :cid AND user_id = :uid AND reminder_type = :type AND period_key = :pk');
        $stmt->execute([':cid' => $userRow['company_id'], ':uid' => $userRow['id'], ':type' => 'weekly', ':pk' => $periodKey]);
        $existingClaim = $stmt->fetch() ?: null;

        ops_print([
            'ok' => true,
            'now' => $now->format('c'),
            'weekday_N' => (int)$now->format('N'),
            'week_start' => $weekStart->format('Y-m-d'),
            'week_end' => $weekEnd->format('Y-m-d'),
            'period_key' => $periodKey,
            'user' => $userRow,
            'employee' => $employeeRow,
            'company' => $companyRow,
            'select_match' => $selectMatch,
            'existing_claim' => $existingClaim,
        ]);
    }

    ops_print([
        'ok' => true,
        'connected_via' => ['host' => $dbConfig['host'], 'port' => $dbConfig['port'], 'name' => $dbConfig['name'], 'user' => $dbConfig['user']],
        'server_hostname' => $connInfo['server_hostname'] ?? null,
        'server_port' => $connInfo['server_port'] ?? null,
        'connection_id' => $connInfo['connection_id'] ?? null,
        'db_now' => $connInfo['db_now'] ?? null,
        'db_name' => $dbInfo['db_name'] ?? null,
        'user_count' => $userCount,
        'recent_rem_users' => $recentRemUsers,
        'user' => $userRow,
        'employee' => $employeeRow,
        'company' => $companyRow,
        'select_match' => $selectMatch,
    ]);
} catch (Throwable $error) {
    ops_print(['ok' => false, 'error' => $error->getMessage()], 1);
}
