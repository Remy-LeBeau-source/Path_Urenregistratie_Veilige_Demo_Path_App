<?php

declare(strict_types=1);

// Waar bewaart de kwaliteitsstraat zijn stand: in een bestand of in een database?
//
// Waarom deze laag bestaat: de keuze tussen "eigen database" en "tabellen in de
// bestaande database" ligt bij Gio, en zolang die keuze openstaat wil je niet
// vastlopen. Daarom staat hier één vorm met twee achterkanten. Overstappen is
// dan een regel in de configuratie, geen verbouwing.
//
// Belangrijk: de databasekant beheert zijn EIGEN tabellen met CREATE TABLE IF
// NOT EXISTS, en loopt dus NIET via de migratierunner van de urenregistratie.
// Dat is met opzet: die runner draait ook op de productie van de urenapp, en
// daar hoort geen tabel van een ander product bij te komen. Wijst de verbinding
// naar dezelfde database, dan staan de tabellen er netjes naast; wijst hij naar
// een eigen database, dan is er helemaal geen raakvlak.
//
// Instellen in server/config.local.php:
//   'kwaliteitsstraat' => [
//     'opslag' => 'bestand',           // of 'mysql'
//     'database' => [                  // alleen nodig bij 'mysql'
//       'dsn' => 'mysql:host=...;dbname=...;charset=utf8mb4',
//       'user' => '...', 'password' => '...',
//     ],
//   ],
// Zonder instelling geldt 'bestand': een omgeving die niets heeft ingesteld
// hoort te werken, niet leeg te blijven.

require_once __DIR__ . '/path-kwaliteitsstraat-intake-lib.php';

const OPSLAG_TABEL_ITEMS = 'kwaliteitsstraat_items';
const OPSLAG_TABEL_HISTORIE = 'kwaliteitsstraat_historie';
const OPSLAG_TABEL_BORD = 'kwaliteitsstraat_bord';
const OPSLAG_TABEL_VOORTGANG = 'kwaliteitsstraat_voortgang';
const OPSLAG_MAX_HISTORIE = 500;

/** @return array<string,mixed> */
function opslag_instellingen(): array
{
    // Een eigen configuratiebestand kan worden meegegeven met
    // PATH_KWALITEITSSTRAAT_CONFIG. Dat bestaat puur om de databasekant te
    // kunnen toetsen zonder de gedeelde server/config.local.php aan te raken:
    // die wordt door de lokale testserver gebruikt, en die tijdelijk omzetten
    // zou elke gelijktijdige testrun meesleuren.
    $vanBuiten = getenv('PATH_KWALITEITSSTRAAT_CONFIG');
    $configPad = is_string($vanBuiten) && $vanBuiten !== '' && is_file($vanBuiten)
        ? $vanBuiten
        : __DIR__ . '/../server/config.local.php';
    $config = is_file($configPad) ? include $configPad : [];
    if (!is_array($config)) {
        $config = [];
    }
    $blok = $config['kwaliteitsstraat'] ?? [];

    return is_array($blok) ? $blok : [];
}

function opslag_soort(): string
{
    $soort = strtolower(trim((string)(opslag_instellingen()['opslag'] ?? 'bestand')));

    return $soort === 'mysql' ? 'mysql' : 'bestand';
}

/**
 * De databaseverbinding, of null als hij niet bruikbaar is. Een kapotte
 * verbinding mag nooit de pagina slopen: dan valt de opslag terug op het
 * bestand en staat dat ook in het antwoord, in plaats van een lege pagina
 * zonder uitleg.
 */
function opslag_pdo(): ?PDO
{
    $database = opslag_instellingen()['database'] ?? [];
    if (!is_array($database) || trim((string)($database['dsn'] ?? '')) === '') {
        return null;
    }
    try {
        $pdo = new PDO(
            (string)$database['dsn'],
            (string)($database['user'] ?? ''),
            (string)($database['password'] ?? ''),
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
        opslag_zorg_voor_tabellen($pdo);
        return $pdo;
    } catch (Throwable $fout) {
        return null;
    }
}

/**
 * Eigen tabellen, buiten de migratierunner van de urenregistratie om. Bewust
 * idempotent: elke aanroep mag draaien zonder iets kapot te maken.
 */
function opslag_zorg_voor_tabellen(PDO $pdo): void
{
    $pdo->exec('CREATE TABLE IF NOT EXISTS ' . OPSLAG_TABEL_ITEMS . ' (
        sleutel VARCHAR(64) NOT NULL PRIMARY KEY,
        status VARCHAR(16) NOT NULL,
        bijgewerkt DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    $pdo->exec('CREATE TABLE IF NOT EXISTS ' . OPSLAG_TABEL_HISTORIE . ' (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        sleutel VARCHAR(64) NOT NULL,
        van VARCHAR(16) NULL,
        naar VARCHAR(16) NOT NULL,
        door VARCHAR(120) NOT NULL,
        wanneer DATETIME NOT NULL,
        INDEX idx_sleutel (sleutel),
        INDEX idx_wanneer (wanneer)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    // Eén rij met de bordinstelling; de sleutel houdt hem uniek.
    $pdo->exec('CREATE TABLE IF NOT EXISTS ' . OPSLAG_TABEL_BORD . ' (
        id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        modus VARCHAR(16) NOT NULL,
        wip SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        sprint VARCHAR(120) NOT NULL DEFAULT "",
        sprint_eind VARCHAR(10) NOT NULL DEFAULT "",
        bijgewerkt DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    // Waar een wens in de straat staat: fase 1 t/m 4, of 0 als hij nog niet
    // opgepakt is. Eén rij per wens, want alleen de huidige stand telt; wie de
    // geschiedenis wil ziet die al in de historietabel en in de Living Doc.
    $pdo->exec('CREATE TABLE IF NOT EXISTS ' . OPSLAG_TABEL_VOORTGANG . ' (
        sleutel VARCHAR(64) NOT NULL PRIMARY KEY,
        fase TINYINT UNSIGNED NOT NULL,
        toelichting VARCHAR(200) NOT NULL DEFAULT "",
        door VARCHAR(120) NOT NULL DEFAULT "",
        bijgewerkt DATETIME NOT NULL,
        INDEX idx_bijgewerkt (bijgewerkt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
}

function opslag_standaard_bord(): array
{
    return ['modus' => 'kanban', 'wip' => 0, 'sprint' => '', 'sprint_eind' => ''];
}

/**
 * De hele stand lezen, in dezelfde vorm ongeacht de achterkant. Die gelijke
 * vorm is het punt van deze laag: de rest van de code hoeft niet te weten waar
 * het vandaan komt.
 *
 * @return array{items:array<string,mixed>,historie:list<array<string,mixed>>,bord:array<string,mixed>,bron:string}
 */
function opslag_lees(string $bestandsPad): array
{
    if (opslag_soort() === 'mysql') {
        $pdo = opslag_pdo();
        if ($pdo !== null) {
            $items = [];
            foreach ($pdo->query('SELECT sleutel, status, bijgewerkt FROM ' . OPSLAG_TABEL_ITEMS) as $rij) {
                $items[(string)$rij['sleutel']] = [
                    'key' => (string)$rij['sleutel'],
                    'status' => (string)$rij['status'],
                    'updated_at' => (string)$rij['bijgewerkt'],
                ];
            }
            $historie = [];
            $stmt = $pdo->query('SELECT sleutel, van, naar, door, wanneer FROM ' . OPSLAG_TABEL_HISTORIE . ' ORDER BY id DESC LIMIT ' . OPSLAG_MAX_HISTORIE);
            foreach ($stmt as $rij) {
                $historie[] = [
                    'key' => (string)$rij['sleutel'],
                    'from' => $rij['van'] !== null ? (string)$rij['van'] : null,
                    'to' => (string)$rij['naar'],
                    'by' => (string)$rij['door'],
                    'at' => (string)$rij['wanneer'],
                ];
            }
            $bord = opslag_standaard_bord();
            $bordRij = $pdo->query('SELECT modus, wip, sprint, sprint_eind FROM ' . OPSLAG_TABEL_BORD . ' WHERE id = 1')->fetch();
            if (is_array($bordRij)) {
                $bord = [
                    'modus' => (string)$bordRij['modus'],
                    'wip' => (int)$bordRij['wip'],
                    'sprint' => (string)$bordRij['sprint'],
                    'sprint_eind' => (string)$bordRij['sprint_eind'],
                ];
            }
            $voortgang = [];
            foreach ($pdo->query('SELECT sleutel, fase, toelichting, door, bijgewerkt FROM ' . OPSLAG_TABEL_VOORTGANG) as $rij) {
                $voortgang[(string)$rij['sleutel']] = [
                    'key' => (string)$rij['sleutel'],
                    'fase' => (int)$rij['fase'],
                    'toelichting' => (string)$rij['toelichting'],
                    'by' => (string)$rij['door'],
                    'at' => (string)$rij['bijgewerkt'],
                ];
            }
            return ['items' => $items, 'historie' => $historie, 'bord' => $bord, 'voortgang' => $voortgang, 'bron' => 'mysql'];
        }
        // Ingesteld op mysql maar niet bereikbaar: terugvallen op het bestand en
        // dat eerlijk melden, in plaats van doen alsof er niets aan de hand is.
        $uitBestand = opslag_lees_bestand($bestandsPad);
        $uitBestand['bron'] = 'bestand (database niet bereikbaar)';
        return $uitBestand;
    }

    return opslag_lees_bestand($bestandsPad);
}

function opslag_lees_bestand(string $pad): array
{
    $leeg = ['items' => [], 'historie' => [], 'bord' => opslag_standaard_bord(), 'voortgang' => [], 'bron' => 'bestand'];
    if (!is_file($pad)) {
        return $leeg;
    }
    $ruw = file_get_contents($pad);
    if ($ruw === false || trim($ruw) === '') {
        return $leeg;
    }
    $data = json_decode($ruw, true);
    if (!is_array($data)) {
        return $leeg;
    }

    return [
        'items' => is_array($data['items'] ?? null) ? $data['items'] : [],
        'historie' => is_array($data['historie'] ?? null) ? $data['historie'] : [],
        'bord' => is_array($data['bord'] ?? null) ? array_merge(opslag_standaard_bord(), $data['bord']) : opslag_standaard_bord(),
        'voortgang' => is_array($data['voortgang'] ?? null) ? $data['voortgang'] : [],
        'bron' => 'bestand',
    ];
}

/**
 * Een kaart verplaatsen. Geeft terug wat er is opgeslagen en of het echt een
 * wijziging was, zodat de aanroeper daar niet zelf naar hoeft te raden.
 *
 * @return array{item:array<string,mixed>,changed:bool,bron:string}|null null bij een opslagfout
 */
function opslag_zet_status(string $bestandsPad, string $sleutel, string $kolom, ?string $vanClient, string $door): ?array
{
    if (opslag_soort() === 'mysql') {
        $pdo = opslag_pdo();
        if ($pdo !== null) {
            try {
                $pdo->beginTransaction();
                $huidig = $pdo->prepare('SELECT status FROM ' . OPSLAG_TABEL_ITEMS . ' WHERE sleutel = :sleutel FOR UPDATE');
                $huidig->execute([':sleutel' => $sleutel]);
                $vorige = $huidig->fetchColumn();
                $vorige = $vorige === false ? ($vanClient !== '' ? $vanClient : null) : (string)$vorige;

                $pdo->prepare('INSERT INTO ' . OPSLAG_TABEL_ITEMS . ' (sleutel, status, bijgewerkt)
                    VALUES (:sleutel, :status, NOW())
                    ON DUPLICATE KEY UPDATE status = VALUES(status), bijgewerkt = VALUES(bijgewerkt)')
                    ->execute([':sleutel' => $sleutel, ':status' => $kolom]);

                $gewijzigd = $vorige !== $kolom;
                if ($gewijzigd) {
                    $pdo->prepare('INSERT INTO ' . OPSLAG_TABEL_HISTORIE . ' (sleutel, van, naar, door, wanneer)
                        VALUES (:sleutel, :van, :naar, :door, NOW())')
                        ->execute([':sleutel' => $sleutel, ':van' => $vorige, ':naar' => $kolom, ':door' => $door]);
                }
                $pdo->commit();

                return [
                    'item' => ['key' => $sleutel, 'status' => $kolom, 'updated_at' => gmdate('c')],
                    'changed' => $gewijzigd,
                    'bron' => 'mysql',
                ];
            } catch (Throwable $fout) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                return null;
            }
        }
    }

    return opslag_zet_status_bestand($bestandsPad, $sleutel, $kolom, $vanClient, $door);
}

function opslag_zet_status_bestand(string $pad, string $sleutel, string $kolom, ?string $vanClient, string $door): ?array
{
    $slot = fopen($pad, 'c+');
    if ($slot === false || !flock($slot, LOCK_EX)) {
        if (is_resource($slot)) {
            fclose($slot);
        }
        return null;
    }
    $inhoud = stream_get_contents($slot);
    $stand = is_string($inhoud) && trim($inhoud) !== '' ? (json_decode($inhoud, true) ?: []) : [];
    if (!is_array($stand) || !isset($stand['items']) || !is_array($stand['items'])) {
        $stand = ['version' => 1, 'items' => [], 'historie' => []];
    }
    if (!isset($stand['historie']) || !is_array($stand['historie'])) {
        $stand['historie'] = [];
    }

    $nu = time();
    $vorige = $stand['items'][$sleutel]['status'] ?? ($vanClient !== '' ? $vanClient : null);
    $stand['items'][$sleutel] = [
        'key' => $sleutel,
        'status' => $kolom,
        'updated_ts' => $nu,
        'updated_at' => gmdate('c', $nu),
    ];
    $gewijzigd = $vorige !== $kolom;
    if ($gewijzigd) {
        array_unshift($stand['historie'], [
            'key' => $sleutel,
            'from' => $vorige,
            'to' => $kolom,
            'by' => $door,
            'at' => gmdate('c', $nu),
        ]);
        if (count($stand['historie']) > OPSLAG_MAX_HISTORIE) {
            $stand['historie'] = array_slice($stand['historie'], 0, OPSLAG_MAX_HISTORIE);
        }
    }

    $nieuw = json_encode($stand, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($nieuw === false) {
        flock($slot, LOCK_UN);
        fclose($slot);
        return null;
    }
    rewind($slot);
    ftruncate($slot, 0);
    fwrite($slot, $nieuw . "\n");
    fflush($slot);
    flock($slot, LOCK_UN);
    fclose($slot);

    return ['item' => $stand['items'][$sleutel], 'changed' => $gewijzigd, 'bron' => 'bestand'];
}

/** @return array<string,mixed>|null */
function opslag_zet_bord(string $bestandsPad, array $bord): ?array
{
    if (opslag_soort() === 'mysql') {
        $pdo = opslag_pdo();
        if ($pdo !== null) {
            try {
                $pdo->prepare('INSERT INTO ' . OPSLAG_TABEL_BORD . ' (id, modus, wip, sprint, sprint_eind, bijgewerkt)
                    VALUES (1, :modus, :wip, :sprint, :eind, NOW())
                    ON DUPLICATE KEY UPDATE modus = VALUES(modus), wip = VALUES(wip),
                        sprint = VALUES(sprint), sprint_eind = VALUES(sprint_eind), bijgewerkt = VALUES(bijgewerkt)')
                    ->execute([
                        ':modus' => $bord['modus'],
                        ':wip' => $bord['wip'],
                        ':sprint' => $bord['sprint'],
                        ':eind' => $bord['sprint_eind'],
                    ]);
                return array_merge($bord, ['bron' => 'mysql']);
            } catch (Throwable $fout) {
                return null;
            }
        }
    }

    $slot = fopen($bestandsPad, 'c+');
    if ($slot === false || !flock($slot, LOCK_EX)) {
        if (is_resource($slot)) {
            fclose($slot);
        }
        return null;
    }
    $inhoud = stream_get_contents($slot);
    $stand = is_string($inhoud) && trim($inhoud) !== '' ? (json_decode($inhoud, true) ?: []) : [];
    if (!is_array($stand) || !isset($stand['items']) || !is_array($stand['items'])) {
        $stand = ['version' => 1, 'items' => [], 'historie' => []];
    }
    $stand['bord'] = array_merge($bord, ['updated_at' => gmdate('c')]);
    $nieuw = json_encode($stand, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($nieuw === false) {
        flock($slot, LOCK_UN);
        fclose($slot);
        return null;
    }
    rewind($slot);
    ftruncate($slot, 0);
    fwrite($slot, $nieuw . "\n");
    fflush($slot);
    flock($slot, LOCK_UN);
    fclose($slot);

    return array_merge($stand['bord'], ['bron' => 'bestand']);
}

/**
 * Waar een wens in de straat staat: fase 0 (nog niet opgepakt) tot en met 4
 * (op TEST, Living Doc bij). Dit is de enige plek waar die stand vandaan komt;
 * de pagina verzint hem niet meer zelf.
 *
 * Alleen de huidige stand wordt bewaard, bewust. Wie wil weten wat er eerder
 * gebeurde, heeft daar de kolomhistorie en de Living Doc al voor; een tweede
 * geschiedenis die net iets anders vertelt is erger dan geen.
 *
 * @return array<string,mixed>|null null bij een opslagfout
 */
function opslag_zet_voortgang(string $bestandsPad, string $sleutel, int $fase, string $toelichting, string $door): ?array
{
    $fase = max(0, min(4, $fase));
    $regel = [
        'key' => $sleutel,
        'fase' => $fase,
        'toelichting' => $toelichting,
        'by' => $door,
        'at' => gmdate('c'),
    ];

    if (opslag_soort() === 'mysql') {
        $pdo = opslag_pdo();
        if ($pdo !== null) {
            try {
                $pdo->prepare('INSERT INTO ' . OPSLAG_TABEL_VOORTGANG . ' (sleutel, fase, toelichting, door, bijgewerkt)
                    VALUES (:sleutel, :fase, :toelichting, :door, NOW())
                    ON DUPLICATE KEY UPDATE fase = VALUES(fase), toelichting = VALUES(toelichting),
                        door = VALUES(door), bijgewerkt = VALUES(bijgewerkt)')
                    ->execute([
                        ':sleutel' => $sleutel,
                        ':fase' => $fase,
                        ':toelichting' => $toelichting,
                        ':door' => $door,
                    ]);
                return array_merge($regel, ['bron' => 'mysql']);
            } catch (Throwable $fout) {
                return null;
            }
        }
    }

    $slot = fopen($bestandsPad, 'c+');
    if ($slot === false || !flock($slot, LOCK_EX)) {
        if (is_resource($slot)) {
            fclose($slot);
        }
        return null;
    }
    $inhoud = stream_get_contents($slot);
    $stand = is_string($inhoud) && trim($inhoud) !== '' ? (json_decode($inhoud, true) ?: []) : [];
    if (!is_array($stand)) {
        $stand = [];
    }
    if (!isset($stand['items']) || !is_array($stand['items'])) {
        $stand['items'] = [];
    }
    if (!isset($stand['voortgang']) || !is_array($stand['voortgang'])) {
        $stand['voortgang'] = [];
    }
    $stand['voortgang'][$sleutel] = $regel;
    $nieuw = json_encode($stand, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($nieuw === false) {
        flock($slot, LOCK_UN);
        fclose($slot);
        return null;
    }
    rewind($slot);
    ftruncate($slot, 0);
    fwrite($slot, $nieuw . "\n");
    fflush($slot);
    flock($slot, LOCK_UN);
    fclose($slot);

    return array_merge($regel, ['bron' => 'bestand']);
}
