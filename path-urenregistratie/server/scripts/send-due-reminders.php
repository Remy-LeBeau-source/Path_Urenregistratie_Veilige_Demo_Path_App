<?php

declare(strict_types=1);

// Serverplanning voor de vier herinneringstypen uit Instellingen. Bedoeld om
// elke ~15 minuten via een cron-achtige trigger te draaien (zie
// .github/workflows/send-reminders.yml). Idempotent: elk type/medewerker/
// periode wordt via reminder_log maximaal één keer verstuurd, ook als dit
// script binnen hetzelfde tijdvenster twee keer draait.
//
// Vier typen, elk met een eigen "wanneer":
//   - weekly:    elke week op de ingestelde weekdag + tijd; medewerker heeft
//                deze week nog geen enkel uur ingevoerd.
//   - month_end: eenmalig op de laatste werkdag van de maand; medewerker
//                heeft de lopende maand nog niet ingediend (concept/correctie).
//   - overdue:   eenmalig op de eerste werkdag van de nieuwe maand; medewerker
//                heeft de VORIGE maand nog steeds niet ingediend.
//   - approval:  eenmalig op de eerste werkdag van de nieuwe maand; een
//                digest aan Backoffice/approvers met het aantal ingediende
//                urenstaten dat nog op controle wacht.

require_once __DIR__ . '/cli-bootstrap.php';
require_once __DIR__ . '/../mail/queue.php';

/** Is "nu" binnen [tijd, tijd + windowMinutes) op de gegeven dag? */
function reminder_time_due(DateTimeImmutable $now, string $time, int $windowMinutes): bool
{
    $todayAtTime = DateTimeImmutable::createFromFormat('H:i:s', $time, $now->getTimezone())
        ?: DateTimeImmutable::createFromFormat('H:i', substr($time, 0, 5), $now->getTimezone());
    if ($todayAtTime === false) {
        return false;
    }
    $target = $now->setTime((int)$todayAtTime->format('H'), (int)$todayAtTime->format('i'), 0);
    $diffSeconds = $now->getTimestamp() - $target->getTimestamp();
    return $diffSeconds >= 0 && $diffSeconds < $windowMinutes * 60;
}

function reminder_is_workday(DateTimeImmutable $date): bool
{
    return (int)$date->format('N') <= 5;
}

/** Laatste werkdag (ma-vr) van de maand van $now. */
function reminder_is_last_workday_of_month(DateTimeImmutable $now): bool
{
    $lastDay = (int)$now->format('t');
    for ($day = $lastDay; $day >= 1; $day--) {
        $candidate = $now->setDate((int)$now->format('Y'), (int)$now->format('n'), $day);
        if (reminder_is_workday($candidate)) {
            return (int)$now->format('j') === $day;
        }
    }
    return false;
}

/** Eerste werkdag (ma-vr) van de maand van $now. */
function reminder_is_first_workday_of_month(DateTimeImmutable $now): bool
{
    for ($day = 1; $day <= 5; $day++) {
        $candidate = $now->setDate((int)$now->format('Y'), (int)$now->format('n'), $day);
        if (reminder_is_workday($candidate)) {
            return (int)$now->format('j') === $day;
        }
    }
    return false;
}

/** true als dit de eerste keer is dat dit type/medewerker/periode wordt geclaimd. */
function reminder_claim(PDO $pdo, int $companyId, int $userId, string $type, string $periodKey): bool
{
    $stmt = $pdo->prepare(
        'INSERT IGNORE INTO reminder_log (company_id, user_id, reminder_type, period_key) VALUES (:company_id, :user_id, :type, :period_key)'
    );
    $stmt->execute([':company_id' => $companyId, ':user_id' => $userId, ':type' => $type, ':period_key' => $periodKey]);
    return $stmt->rowCount() > 0;
}

function reminder_send(PDO $pdo, array $config, int $companyId, int $userId, string $email, string $notificationType, string $title, string $message, string $targetRoute, string $mailSubject, string $mailBody): void
{
    $pdo->prepare(
        "INSERT INTO notifications (company_id, user_id, notification_type, title, message, target_route) VALUES (:cid, :uid, :type, :title, :message, :route)"
    )->execute([
        ':cid' => $companyId,
        ':uid' => $userId,
        ':type' => $notificationType,
        ':title' => $title,
        ':message' => $message,
        ':route' => $targetRoute,
    ]);

    $deliveryId = mail_insert_delivery(
        $pdo,
        null,
        'reminder',
        $email,
        null,
        $mailSubject,
        rtrim($mailBody) . "\n\nMet vriendelijke groet,\n\nRobot Path IT",
        'none',
        mail_is_dry_run($config),
        null,
        $userId,
        null
    );
    if (!mail_is_dry_run($config)) {
        mail_dispatch_created($pdo, [['id' => $deliveryId]], $config);
    }
}

function reminder_month_label(int $year, int $month): string
{
    $maanden = [1 => 'januari', 2 => 'februari', 3 => 'maart', 4 => 'april', 5 => 'mei', 6 => 'juni', 7 => 'juli', 8 => 'augustus', 9 => 'september', 10 => 'oktober', 11 => 'november', 12 => 'december'];
    return ($maanden[$month] ?? (string)$month) . ' ' . $year;
}

function send_weekly_reminders(PDO $pdo, array $config, array $company, DateTimeImmutable $now, array $counts): array
{
    $companyId = (int)$company['id'];
    $isoYear = (int)$now->format('o');
    $isoWeek = (int)$now->format('W');
    $periodKey = sprintf('%04d-W%02d', $isoYear, $isoWeek);
    $weekStart = $now->setTime(0, 0, 0)->modify('monday this week');
    $weekEnd = $weekStart->modify('+7 days');

    $stmt = $pdo->prepare(
        'SELECT e.id AS employee_id, e.full_name, u.id AS user_id, u.email
         FROM employees e
         JOIN users u ON u.id = e.user_id
         LEFT JOIN user_preferences up ON up.user_id = u.id
         WHERE e.company_id = :company_id AND e.active = 1 AND u.active = 1
           AND COALESCE(up.hour_reminders, 1) = 1
           AND NOT EXISTS (
             SELECT 1 FROM time_entries te
             JOIN timesheets t ON t.id = te.timesheet_id
             WHERE t.employee_id = e.id AND te.work_date >= :week_start AND te.work_date < :week_end AND te.hours > 0
           )'
    );
    $stmt->execute([':company_id' => $companyId, ':week_start' => $weekStart->format('Y-m-d'), ':week_end' => $weekEnd->format('Y-m-d')]);

    foreach ($stmt->fetchAll() as $row) {
        $userId = (int)$row['user_id'];
        if (!reminder_claim($pdo, $companyId, $userId, 'weekly', $periodKey)) {
            continue;
        }
        reminder_send(
            $pdo, $config, $companyId, $userId, (string)$row['email'],
            'timesheet_reminder', 'Uren invullen deze week',
            'Je hebt deze week nog geen uren ingevuld. Vul je uren in voordat de week wordt afgesloten.',
            'timesheet',
            'Herinnering: uren invullen deze week',
            "Beste " . (string)$row['full_name'] . ",\n\nJe hebt deze week nog geen uren ingevuld. Vul je uren in via de app."
        );
        $counts['weekly']++;
    }
    return $counts;
}

function send_month_end_reminders(PDO $pdo, array $config, array $company, DateTimeImmutable $now, array $counts): array
{
    $companyId = (int)$company['id'];
    $year = (int)$now->format('Y');
    $month = (int)$now->format('n');
    $periodKey = sprintf('%04d-%02d', $year, $month);

    $stmt = $pdo->prepare(
        "SELECT e.id AS employee_id, e.full_name, u.id AS user_id, u.email
         FROM employees e
         JOIN users u ON u.id = e.user_id
         LEFT JOIN user_preferences up ON up.user_id = u.id
         JOIN periods p ON p.company_id = e.company_id AND p.year = :year AND p.month = :month
         JOIN timesheets t ON t.employee_id = e.id AND t.period_id = p.id
         WHERE e.company_id = :company_id AND e.active = 1 AND u.active = 1
           AND COALESCE(up.hour_reminders, 1) = 1
           AND t.status IN ('draft', 'correction')"
    );
    $stmt->execute([':company_id' => $companyId, ':year' => $year, ':month' => $month]);

    foreach ($stmt->fetchAll() as $row) {
        $userId = (int)$row['user_id'];
        if (!reminder_claim($pdo, $companyId, $userId, 'month_end', $periodKey)) {
            continue;
        }
        $periodLabel = reminder_month_label($year, $month);
        reminder_send(
            $pdo, $config, $companyId, $userId, (string)$row['email'],
            'timesheet_reminder', 'Maand nog niet ingediend',
            "De maand $periodLabel loopt bijna af en je urenstaat is nog niet ingediend.",
            'timesheet',
            "Herinnering: dien je uren in voor $periodLabel",
            "Beste " . (string)$row['full_name'] . ",\n\nDe maand $periodLabel loopt bijna af en je urenstaat staat nog niet als ingediend geregistreerd. Dien 'm in via de app zodra je klaar bent."
        );
        $counts['month_end']++;
    }
    return $counts;
}

function send_overdue_reminders(PDO $pdo, array $config, array $company, DateTimeImmutable $now, array $counts): array
{
    $companyId = (int)$company['id'];
    $previousMonth = $now->modify('first day of last month');
    $year = (int)$previousMonth->format('Y');
    $month = (int)$previousMonth->format('n');
    $periodKey = sprintf('%04d-%02d', $year, $month);

    $stmt = $pdo->prepare(
        "SELECT e.id AS employee_id, e.full_name, u.id AS user_id, u.email
         FROM employees e
         JOIN users u ON u.id = e.user_id
         LEFT JOIN user_preferences up ON up.user_id = u.id
         JOIN periods p ON p.company_id = e.company_id AND p.year = :year AND p.month = :month
         JOIN timesheets t ON t.employee_id = e.id AND t.period_id = p.id
         WHERE e.company_id = :company_id AND e.active = 1 AND u.active = 1
           AND COALESCE(up.hour_reminders, 1) = 1
           AND t.status IN ('draft', 'correction')"
    );
    $stmt->execute([':company_id' => $companyId, ':year' => $year, ':month' => $month]);

    foreach ($stmt->fetchAll() as $row) {
        $userId = (int)$row['user_id'];
        if (!reminder_claim($pdo, $companyId, $userId, 'overdue', $periodKey)) {
            continue;
        }
        $periodLabel = reminder_month_label($year, $month);
        reminder_send(
            $pdo, $config, $companyId, $userId, (string)$row['email'],
            'timesheet_reminder', 'Urenstaat staat nog open',
            "Je urenstaat voor $periodLabel staat nog steeds niet als ingediend geregistreerd.",
            'timesheet',
            "Achterstand: uren $periodLabel nog niet ingediend",
            "Beste " . (string)$row['full_name'] . ",\n\nJe urenstaat voor $periodLabel is nog niet ingediend, terwijl de maand al is afgesloten. Dien deze zo snel mogelijk in via de app."
        );
        $counts['overdue']++;
    }
    return $counts;
}

function send_approval_reminders(PDO $pdo, array $config, array $company, DateTimeImmutable $now, array $counts): array
{
    $companyId = (int)$company['id'];
    $periodKey = $now->format('Y-m-d');

    $stmt = $pdo->prepare(
        "SELECT COUNT(*) AS n FROM timesheets t
         JOIN periods p ON p.id = t.period_id
         WHERE p.company_id = :company_id AND t.status = 'submitted'"
    );
    $stmt->execute([':company_id' => $companyId]);
    $pendingCount = (int)($stmt->fetch()['n'] ?? 0);
    if ($pendingCount === 0) {
        return $counts;
    }

    $approvers = $pdo->prepare(
        "SELECT u.id AS user_id, u.email, u.display_name
         FROM users u
         LEFT JOIN user_preferences up ON up.user_id = u.id
         WHERE u.company_id = :company_id AND u.active = 1 AND u.role IN ('administrator', 'approver')
           AND COALESCE(up.approval_notifications, 1) = 1"
    );
    $approvers->execute([':company_id' => $companyId]);

    foreach ($approvers->fetchAll() as $row) {
        $userId = (int)$row['user_id'];
        if (!reminder_claim($pdo, $companyId, $userId, 'approval', $periodKey)) {
            continue;
        }
        reminder_send(
            $pdo, $config, $companyId, $userId, (string)$row['email'],
            'timesheet_reminder', 'Urenstaten wachten op controle',
            "Er staan $pendingCount ingediende urenstaten klaar voor controle.",
            'approvals',
            'Goedkeuring: urenstaten wachten op controle',
            "Beste " . (string)$row['display_name'] . ",\n\nEr staan $pendingCount ingediende urenstaten klaar voor controle bij Backoffice."
        );
        $counts['approval']++;
    }
    return $counts;
}

$options = ops_options($argv);
try {
    $config = ops_load_config($options);
    $pdo = ops_pdo($config);
    $environment = strtolower((string)($config['environment'] ?? ($config['app']['environment'] ?? '')));
    $nowOverride = isset($options['now']) && is_string($options['now']) ? $options['now'] : null;
    if ($nowOverride !== null && $environment === 'production') {
        // --now is voor tests en TEST-verificatie; PROD gebruikt altijd de echte klok.
        $nowOverride = null;
    }
    // Let op: als $nowOverride zelf een offset/tijdzone bevat (bv. een ISO-string
    // met "+00:00"), negeert PHP de meegegeven DateTimeZone bij het bepalen van
    // het moment -- het resultaat blijft dan in die andere tijdzone staan. Een
    // expliciete setTimezone() erna dwingt Europe/Amsterdam alsnog af, zodat de
    // opgeslagen wandkloktijden (weekly_reminder_time e.d.) correct vergeleken worden.
    $now = ($nowOverride !== null
        ? new DateTimeImmutable($nowOverride)
        : new DateTimeImmutable('now'))
        ->setTimezone(new DateTimeZone('Europe/Amsterdam'));
    $windowMinutes = (int)($options['window-minutes'] ?? 15);

    $companies = $pdo->query(
        'SELECT id, weekly_reminder_enabled, weekly_reminder_day, weekly_reminder_time,
                month_end_reminder_enabled, month_end_reminder_time,
                overdue_reminder_enabled, overdue_reminder_time,
                approval_reminder_enabled, approval_reminder_time
         FROM companies'
    )->fetchAll();

    $counts = ['weekly' => 0, 'month_end' => 0, 'overdue' => 0, 'approval' => 0];
    foreach ($companies as $company) {
        if ((int)$company['weekly_reminder_enabled'] === 1
            && (int)$now->format('N') === (int)$company['weekly_reminder_day']
            && reminder_time_due($now, (string)$company['weekly_reminder_time'], $windowMinutes)
        ) {
            $counts = send_weekly_reminders($pdo, $config, $company, $now, $counts);
        }
        if ((int)$company['month_end_reminder_enabled'] === 1
            && reminder_is_last_workday_of_month($now)
            && reminder_time_due($now, (string)$company['month_end_reminder_time'], $windowMinutes)
        ) {
            $counts = send_month_end_reminders($pdo, $config, $company, $now, $counts);
        }
        if ((int)$company['overdue_reminder_enabled'] === 1
            && reminder_is_first_workday_of_month($now)
            && reminder_time_due($now, (string)$company['overdue_reminder_time'], $windowMinutes)
        ) {
            $counts = send_overdue_reminders($pdo, $config, $company, $now, $counts);
        }
        if ((int)$company['approval_reminder_enabled'] === 1
            && reminder_is_first_workday_of_month($now)
            && reminder_time_due($now, (string)$company['approval_reminder_time'], $windowMinutes)
        ) {
            $counts = send_approval_reminders($pdo, $config, $company, $now, $counts);
        }
    }

    ops_print(['ok' => true, 'now' => $now->format('c'), 'sent' => $counts]);
} catch (Throwable $error) {
    ops_print(['ok' => false, 'error' => $error->getMessage()], 1);
}
