<?php

declare(strict_types=1);

/**
 * Het opslaan van de vaste mailontvangers.
 *
 * Dit stond twee keer: in settings.php en in staff.php, allebei zo'n zeventig
 * regels die hetzelfde deden. Dat bleef onopgemerkt tot een fout in beide moest
 * worden gerepareerd -- de lijst teruggeven zoals hij binnenkwam wiste stil de
 * naam en de soort van elke ontvanger, en daarmee welke mailtekst iemand kreeg.
 * Twee kopieën betekent twee kansen om er maar één te repareren.
 *
 * De twee aanroepers verschilden op één punt en dat verschil is bewust bewaard:
 * settings.php weigert een onjuist e-mailadres met een foutmelding, staff.php
 * sloeg zo'n ontvanger over. Deze functie kiest niet -- hij geeft de overgeslagen
 * adressen terug en laat de aanroeper beslissen.
 */

/**
 * @param array<int, mixed> $items ontvangers zoals de browser ze stuurt
 * @return array{keys: array<string, int>, invalid: array<int, string>}
 *         keys: sleutel of id => database-id, invalid: overgeslagen adressen
 */
function mail_recipients_upsert(PDO $pdo, int $companyId, array $items): array
{
    $byKey = [];
    $invalid = [];

    $existingStmt = $pdo->prepare('SELECT id, recipient_key, email FROM mail_recipients WHERE company_id = :company_id');
    $existingStmt->execute([':company_id' => $companyId]);

    $existingById = [];
    $existingByKey = [];
    foreach ($existingStmt->fetchAll() as $row) {
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

        $rawId = mail_recipients_string($item['id'] ?? '', 80);
        $numericId = ctype_digit($rawId) ? (int)$rawId : 0;
        $recipientKey = $numericId > 0 ? '' : $rawId;

        $email = mail_recipients_string($item['email'] ?? '', 190);
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            if ($email !== '') {
                $invalid[] = $email;
            }
            continue;
        }

        // De browser stuurt name/category, maar bootstrap.php geeft dezelfde
        // ontvanger terug als display_name/recipient_category. Wie de lijst teruggaf
        // zoals hij hem kreeg -- en dat doet elk scherm dat één ontvanger wijzigt en
        // de rest meestuurt -- wiste zo de naam, die het e-mailadres werd, en de
        // soort, die terugviel op 'other'. Daarmee kreeg de boekhouder de algemene
        // mailtekst, zonder enig signaal. Beide schrijfwijzen worden geaccepteerd.
        $name = mail_recipients_string($item['name'] ?? $item['display_name'] ?? '', 160);
        if ($name === '') {
            $name = $email;
        }
        $category = mail_recipients_string($item['category'] ?? $item['recipient_category'] ?? 'other', 60);
        if ($category === '') {
            $category = 'other';
        }

        $active = ($item['active'] ?? true) === null ? 1 : (((bool)($item['active'] ?? true)) ? 1 : 0);
        $deactivatedAt = $active === 1 ? null : date('Y-m-d H:i:s');

        $matched = null;
        if ($numericId > 0 && isset($existingById[$numericId])) {
            $matched = $existingById[$numericId];
        } elseif ($recipientKey !== '' && isset($existingByKey[$recipientKey])) {
            $matched = $existingByKey[$recipientKey];
        }

        if ($matched) {
            $recipientId = (int)$matched['id'];
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
        $byKey[$recipientKey !== '' ? $recipientKey : (string)$insertedId] = $insertedId;
    }

    // De aanroeper koppelt routes aan ontvangers die hij niet zelf heeft
    // meegestuurd, dus de volledige stand gaat terug -- op sleutel en op id.
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

    return ['keys' => $byKey, 'invalid' => $invalid];
}

/**
 * Tekst afkappen op lengte. Stond onder drie namen in evenveel bestanden:
 * settings_string, staff_string en deze.
 */
function mail_recipients_string(mixed $value, int $maxLength = 0): string
{
    $text = trim((string)($value ?? ''));
    if ($maxLength > 0 && strlen($text) > $maxLength) {
        return substr($text, 0, $maxLength);
    }
    return $text;
}
