<?php

declare(strict_types=1);

// Toetst de opslaglaag van de kwaliteitsstraat op beide achterkanten: het
// bestand en de database. Draait mee in `npm run check`.
//
// Waarom dit een eigen script is en geen browsertest: de keuze tussen bestand en
// database is een serverinstelling. Om die in een browsertest te wisselen zou je
// de gedeelde server/config.local.php moeten omzetten terwijl de testserver
// draait -- dat sleept elke gelijktijdige run mee. Hier gebeurt het met een
// eigen configuratiebestand in de tijdelijke map, dus zonder die bijwerking.
//
// Techniek (TMap/ISTQB): equivalentieklassen over de twee achterkanten, met per
// klasse dezelfde functionele controles (verplaatsen, geschiedenis, bordstand),
// plus een negatieve klasse (database ingesteld maar onbereikbaar) die moet
// terugvallen op het bestand en dat eerlijk moet melden.

require_once __DIR__ . '/cli-bootstrap.php';

$wortel = dirname(__DIR__, 2);
require_once $wortel . '/pilot/path-kwaliteitsstraat-opslag-lib.php';

$fouten = 0;
$controles = 0;

function toets(string $wat, bool $goed, string $detail = ''): void
{
    global $fouten, $controles;
    $controles++;
    if (!$goed) {
        $fouten++;
        fwrite(STDERR, "FOUT: {$wat}" . ($detail !== '' ? " ({$detail})" : '') . PHP_EOL);
    }
}

function schrijfConfig(string $pad, array $config): void
{
    file_put_contents($pad, "<?php\n\nreturn " . var_export($config, true) . ";\n");
}

$tijdelijk = sys_get_temp_dir() . '/kwaliteitsstraat-opslag-check-' . getmypid();
@mkdir($tijdelijk, 0700, true);
$configPad = $tijdelijk . '/config.php';
$standPad = $tijdelijk . '/stand.json';

// ---------------------------------------------------------------------------
// Klasse 1: het bestand
// ---------------------------------------------------------------------------
schrijfConfig($configPad, ['kwaliteitsstraat' => ['opslag' => 'bestand']]);
putenv('PATH_KWALITEITSSTRAAT_CONFIG=' . $configPad);

toets('bestand is de gekozen achterkant', opslag_soort() === 'bestand', opslag_soort());

$leeg = opslag_lees($standPad);
toets('een lege opslag geeft geen items', $leeg['items'] === []);
toets('een lege opslag staat standaard op kanban', ($leeg['bord']['modus'] ?? '') === 'kanban');

$eerste = opslag_zet_status($standPad, 'PATH-900', 'doing', 'todo', 'Controlescript');
toets('verplaatsen lukt', is_array($eerste));
toets('verplaatsen telt als wijziging', ($eerste['changed'] ?? null) === true);
toets('de kolom is opgeslagen', ($eerste['item']['status'] ?? '') === 'doing');

$zelfde = opslag_zet_status($standPad, 'PATH-900', 'doing', 'doing', 'Controlescript');
toets('dezelfde kolom nogmaals is geen wijziging', ($zelfde['changed'] ?? null) === false);

$naZet = opslag_lees($standPad);
toets('de stand is terug te lezen', ($naZet['items']['PATH-900']['status'] ?? '') === 'doing');
toets('er staat precies een geschiedenisregel', count($naZet['historie']) === 1, (string)count($naZet['historie']));
toets('de geschiedenis kent de herkomst', ($naZet['historie'][0]['from'] ?? null) === 'todo');
toets('de geschiedenis kent de bestemming', ($naZet['historie'][0]['to'] ?? null) === 'doing');
toets('de geschiedenis kent de uitvoerder', ($naZet['historie'][0]['by'] ?? null) === 'Controlescript');

$voortgang = opslag_zet_voortgang($standPad, 'PATH-900', 2, 'Zephyr-case geschreven', 'Controlescript');
toets('voortgang is opgeslagen', is_array($voortgang));
toets('de fase is bewaard', ($voortgang['fase'] ?? null) === 2);
$naVoortgang = opslag_lees($standPad);
toets('de voortgang is terug te lezen', ($naVoortgang['voortgang']['PATH-900']['fase'] ?? null) === 2);
toets('de toelichting is terug te lezen', ($naVoortgang['voortgang']['PATH-900']['toelichting'] ?? '') === 'Zephyr-case geschreven');
// Grenzen: buiten 0..4 hoort de laag niet stilletjes iets raars te bewaren.
opslag_zet_voortgang($standPad, 'PATH-900', 9, '', 'Controlescript');
toets('een te hoge fase wordt op 4 gehouden', (opslag_lees($standPad)['voortgang']['PATH-900']['fase'] ?? null) === 4);
opslag_zet_voortgang($standPad, 'PATH-900', -3, '', 'Controlescript');
toets('een negatieve fase wordt op 0 gehouden', (opslag_lees($standPad)['voortgang']['PATH-900']['fase'] ?? null) === 0);

$bord = opslag_zet_bord($standPad, ['modus' => 'scrum', 'wip' => 3, 'sprint' => 'Sprint 1', 'sprint_eind' => '2026-12-31']);
toets('de bordstand is opgeslagen', is_array($bord));
$naBord = opslag_lees($standPad);
toets('de werkwijze is terug te lezen', ($naBord['bord']['modus'] ?? '') === 'scrum');
toets('de sprintnaam is terug te lezen', ($naBord['bord']['sprint'] ?? '') === 'Sprint 1');

// ---------------------------------------------------------------------------
// Klasse 2: de database
// ---------------------------------------------------------------------------
$app = $wortel . '/server/config.local.php';
$appConfig = is_file($app) ? include $app : [];
$kanDatabase = is_array($appConfig) && ($appConfig['host'] ?? '') !== '' && ($appConfig['database'] ?? '') !== '';

if (!$kanDatabase) {
    echo "kwaliteitsstraat-opslag-check: databasekant overgeslagen (geen lokale databaseconfiguratie).\n";
} else {
    // Eigen tabelnamen in dezelfde testdatabase: de laag maakt ze zelf aan en
    // raakt de migratierunner van de urenregistratie niet.
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        (string)$appConfig['host'],
        (int)($appConfig['port'] ?? 3306),
        (string)$appConfig['database'],
        (string)($appConfig['charset'] ?? 'utf8mb4')
    );
    schrijfConfig($configPad, ['kwaliteitsstraat' => [
        'opslag' => 'mysql',
        'database' => [
            'dsn' => $dsn,
            'user' => (string)($appConfig['username'] ?? ''),
            'password' => (string)($appConfig['password'] ?? ''),
        ],
    ]]);

    $pdo = opslag_pdo();
    if ($pdo === null) {
        echo "kwaliteitsstraat-opslag-check: databasekant overgeslagen (database niet bereikbaar).\n";
    } else {
        toets('mysql is de gekozen achterkant', opslag_soort() === 'mysql', opslag_soort());
        // Schoon beginnen: dit script is de enige gebruiker van deze tabellen.
        $pdo->exec('DELETE FROM ' . OPSLAG_TABEL_HISTORIE);
        $pdo->exec('DELETE FROM ' . OPSLAG_TABEL_ITEMS);
        $pdo->exec('DELETE FROM ' . OPSLAG_TABEL_BORD);
        $pdo->exec('DELETE FROM ' . OPSLAG_TABEL_VOORTGANG);

        $dbEerste = opslag_zet_status($standPad, 'PATH-901', 'done', 'doing', 'Controlescript');
        toets('verplaatsen lukt in de database', is_array($dbEerste));
        toets('de database meldt zichzelf als bron', ($dbEerste['bron'] ?? '') === 'mysql');
        toets('verplaatsen telt als wijziging in de database', ($dbEerste['changed'] ?? null) === true);

        $dbZelfde = opslag_zet_status($standPad, 'PATH-901', 'done', 'done', 'Controlescript');
        toets('dezelfde kolom nogmaals is ook in de database geen wijziging', ($dbZelfde['changed'] ?? null) === false);

        $dbStand = opslag_lees($standPad);
        toets('de databasestand is terug te lezen', ($dbStand['items']['PATH-901']['status'] ?? '') === 'done');
        toets('de database levert precies een geschiedenisregel', count($dbStand['historie']) === 1, (string)count($dbStand['historie']));
        toets('de databasegeschiedenis kent de herkomst', ($dbStand['historie'][0]['from'] ?? null) === 'doing');
        toets('de databasegeschiedenis kent de uitvoerder', ($dbStand['historie'][0]['by'] ?? null) === 'Controlescript');

        opslag_zet_voortgang($standPad, 'PATH-901', 3, 'Regressie draait', 'Controlescript');
        $dbVoortgang = opslag_lees($standPad);
        toets('de voortgang komt uit de database', ($dbVoortgang['voortgang']['PATH-901']['fase'] ?? null) === 3);
        toets('de toelichting komt uit de database', ($dbVoortgang['voortgang']['PATH-901']['toelichting'] ?? '') === 'Regressie draait');
        opslag_zet_voortgang($standPad, 'PATH-901', 4, 'Op TEST', 'Controlescript');
        toets('een tweede melding overschrijft de eerste', (opslag_lees($standPad)['voortgang']['PATH-901']['fase'] ?? null) === 4);

        opslag_zet_bord($standPad, ['modus' => 'scrum', 'wip' => 2, 'sprint' => 'DB-sprint', 'sprint_eind' => '']);
        $dbBord = opslag_lees($standPad);
        toets('de werkwijze komt uit de database', ($dbBord['bord']['modus'] ?? '') === 'scrum');
        toets('de sprintnaam komt uit de database', ($dbBord['bord']['sprint'] ?? '') === 'DB-sprint');

        // Dezelfde vorm als het bestand: dat is het hele punt van deze laag.
        toets('beide achterkanten leveren dezelfde sleutels', array_keys($dbStand) === array_keys($naBord), implode(',', array_keys($dbStand)));

        $pdo->exec('DELETE FROM ' . OPSLAG_TABEL_HISTORIE);
        $pdo->exec('DELETE FROM ' . OPSLAG_TABEL_ITEMS);
        $pdo->exec('DELETE FROM ' . OPSLAG_TABEL_BORD);
        $pdo->exec('DELETE FROM ' . OPSLAG_TABEL_VOORTGANG);
    }

    // -----------------------------------------------------------------------
    // Klasse 3 (negatief): database ingesteld maar onbereikbaar
    // -----------------------------------------------------------------------
    schrijfConfig($configPad, ['kwaliteitsstraat' => [
        'opslag' => 'mysql',
        'database' => ['dsn' => 'mysql:host=127.0.0.1;port=59999;dbname=bestaat_niet', 'user' => 'x', 'password' => 'x'],
    ]]);
    $terugval = opslag_lees($standPad);
    toets('een onbereikbare database valt terug op het bestand', str_contains((string)$terugval['bron'], 'bestand'), (string)$terugval['bron']);
    toets('en meldt dat eerlijk in plaats van stil te vallen', str_contains((string)$terugval['bron'], 'niet bereikbaar'), (string)$terugval['bron']);
    toets('de stand uit het bestand blijft leesbaar', ($terugval['items']['PATH-900']['status'] ?? '') === 'doing');
}

putenv('PATH_KWALITEITSSTRAAT_CONFIG');
@unlink($configPad);
@unlink($standPad);
@rmdir($tijdelijk);

if ($fouten > 0) {
    fwrite(STDERR, "kwaliteitsstraat-opslag-check: {$fouten} van {$controles} controles mislukt.\n");
    exit(1);
}

echo "kwaliteitsstraat-opslag-check: {$controles} controles groen (bestand en database leveren dezelfde vorm, onbereikbare database valt eerlijk terug).\n";
