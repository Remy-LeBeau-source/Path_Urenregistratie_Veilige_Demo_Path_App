<?php

declare(strict_types=1);

// Gedeelde opslag voor de kwaliteitsstraat: waar staat een kaart, en wie heeft
// hem wanneer verplaatst.
//
// Dit bestand gaat alleen over het verzoek: lezen of schrijven, wie mag wat, en
// welke invoer geldig is. WAAR het terechtkomt (bestand of database) staat in
// path-kwaliteitsstraat-opslag-lib.php, zodat de keuze tussen "eigen database"
// en "tabellen in de bestaande database" een configuratieregel is en geen
// verbouwing.
//
// Wat hier NIET gebeurt: inhoud wijzigen. Titels, omschrijvingen en criteria
// blijven uit de projectstand komen. Deze opslag gaat alleen over de stand.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/path-kwaliteitsstraat-intake-lib.php';
require_once __DIR__ . '/path-kwaliteitsstraat-auth-lib.php';
require_once __DIR__ . '/path-kwaliteitsstraat-opslag-lib.php';

const STORE_MAX_BODY_BYTES = 4096;
const STORE_KOLOMMEN = ['todo', 'doing', 'done'];

function store_antwoord(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/** Zelfde plek en zelfde afscherming als de intakewachtrij. */
function store_pad(): array
{
    [$omgeving, $wachtrijPad] = intake_omgeving_en_pad();
    return [$omgeving, dirname($wachtrijPad) . '/path-kwaliteitsstraat-stand.json'];
}

[$omgeving, $pad] = store_pad();

if ($omgeving === 'production') {
    store_antwoord(404, ['error' => 'Deze opslag bestaat alleen op TEST.']);
}

$methode = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($methode === 'GET') {
    $stand = opslag_lees($pad);
    store_antwoord(200, [
        'environment' => $omgeving,
        // Welke achterkant dit antwoord leverde. Zichtbaar maken is het punt:
        // bij een ingestelde maar onbereikbare database hoort dat op te vallen,
        // niet stilletjes op het bestand terug te vallen.
        'opslag' => $stand['bron'],
        'items' => $stand['items'],
        'bord' => $stand['bord'],
        // Waar elke wens in de straat staat. Hiermee toont de pagina echte
        // voortgang in plaats van een gesimuleerde.
        'voortgang' => $stand['voortgang'] ?? [],
        'historie' => array_slice($stand['historie'], 0, 50),
    ]);
}

if ($methode !== 'POST') {
    header('Allow: GET, POST');
    store_antwoord(405, ['error' => 'Alleen GET en POST.']);
}

$ruweBody = file_get_contents('php://input');
if ($ruweBody === false) {
    $ruweBody = '';
}
if (strlen($ruweBody) > STORE_MAX_BODY_BYTES) {
    store_antwoord(413, ['error' => 'Te veel gegevens in een keer.']);
}
$invoer = json_decode($ruweBody, true);
if (!is_array($invoer)) {
    store_antwoord(400, ['error' => 'Onleesbare invoer.']);
}

// De pijplijn zelf is de tweede schrijver. Die heeft geen browsersessie, dus
// geen login; hij meldt zich met een sleutel die alleen op de server staat
// (server/config.local.php, `kwaliteitsstraat.agent_sleutel`). Staat die sleutel
// er niet, dan bestaat deze weg niet -- geen sleutel, geen ingang.
//
// Waarom niet gewoon openbaar schrijfbaar, zoals bij het indienen van een wens:
// een wens indienen voegt iets toe dat daarna door een mens wordt beoordeeld,
// maar voortgang melden verandert wat de pagina beweert over werk dat al loopt.
// Als iedereen dat kan schrijven, kan iedereen laten zien dat iets "op TEST
// staat" terwijl dat niet zo is, en dan is de pagina geen administratie meer.
function store_is_pijplijn(): bool
{
    $ingesteld = (string)(opslag_instellingen()['agent_sleutel'] ?? '');
    if ($ingesteld === '') {
        return false;
    }
    $meegestuurd = (string)($_SERVER['HTTP_X_PATH_AGENT'] ?? '');
    if ($meegestuurd === '') {
        return false;
    }

    // Tekenvergelijking met vaste looptijd: een gewone vergelijking verraadt met
    // zijn snelheid hoeveel tekens klopten.
    return hash_equals($ingesteld, $meegestuurd);
}

$pijplijn = store_is_pijplijn();

// Schrijven mag alleen ingelogd. Lezen blijft open zolang deze pagina openbaar
// is en er geen persoons- of klantgegevens in staan; schrijven niet, want
// anders kan elke voorbijganger het bord van een ander door elkaar gooien.
$gebruiker = kwaliteitsstraat_gebruiker();
if ($gebruiker === null && !$pijplijn) {
    store_antwoord(401, [
        'error' => 'niet-ingelogd',
        'message' => 'Log in bij Uren & Facturatie om een kaart te verplaatsen.',
    ]);
}

$map = dirname($pad);
if (!is_dir($map) || !is_writable($map)) {
    store_antwoord(503, ['error' => 'De opslag is nu niet beschikbaar.']);
}

// ---- Bordinstelling (werkwijze, WIP-limiet, sprint) -------------------------
if (($invoer['action'] ?? '') === 'bord') {
    $modus = intake_tekst($invoer['modus'] ?? '', 10);
    if (!in_array($modus, ['kanban', 'scrum'], true)) {
        store_antwoord(422, ['error' => 'Onbekende werkwijze. Toegestaan: kanban, scrum.']);
    }
    // 0 betekent geen limiet; boven de 50 is het geen limiet meer maar een getal.
    $wip = max(0, min(50, isset($invoer['wip']) ? (int)$invoer['wip'] : 0));
    $sprintNaam = intake_tekst($invoer['sprint'] ?? '', 60);
    // Een sprint zonder einddatum blijft bewust open staan (vraag Gio): dan is
    // het feitelijk Kanban met een sprintnaam, en dat mag -- zolang het zichtbaar is.
    $sprintEind = intake_tekst($invoer['sprint_eind'] ?? '', 10);
    if ($sprintEind !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $sprintEind)) {
        store_antwoord(422, ['error' => 'Een einddatum hoort als jjjj-mm-dd.']);
    }

    $bord = opslag_zet_bord($pad, [
        'modus' => $modus,
        'wip' => $wip,
        'sprint' => $sprintNaam,
        'sprint_eind' => $sprintEind,
    ]);
    if ($bord === null) {
        store_antwoord(503, ['error' => 'De instelling kon niet worden opgeslagen.']);
    }
    store_antwoord(200, ['environment' => $omgeving, 'bord' => $bord]);
}

// ---- Voortgang in de straat (fase 1 t/m 4) ----------------------------------
if (($invoer['action'] ?? '') === 'voortgang') {
    $sleutel = intake_tekst($invoer['key'] ?? '', 40);
    if ($sleutel === '') {
        store_antwoord(422, ['error' => 'Zonder sleutel is niet te zeggen welke wens je bedoelt.']);
    }
    // 0 betekent "nog niet opgepakt"; 4 is op TEST met de Living Doc bij. Een
    // getal daarbuiten is geen fase maar een vergissing, en die hoort te botsen
    // in plaats van stil afgerond te worden.
    if (!isset($invoer['fase']) || !is_numeric($invoer['fase'])) {
        store_antwoord(422, ['error' => 'Een fase hoort een getal van 0 tot en met 4 te zijn.']);
    }
    $fase = (int)$invoer['fase'];
    if ($fase < 0 || $fase > 4) {
        store_antwoord(422, ['error' => 'Een fase hoort een getal van 0 tot en met 4 te zijn.']);
    }
    $toelichting = intake_tekst($invoer['toelichting'] ?? '', 200);

    $uitkomst = opslag_zet_voortgang(
        $pad,
        $sleutel,
        $fase,
        $toelichting,
        $pijplijn ? 'Pijplijn' : kwaliteitsstraat_naam($gebruiker)
    );
    if ($uitkomst === null) {
        store_antwoord(503, ['error' => 'De opslag is nu niet beschikbaar.']);
    }
    store_antwoord(200, ['environment' => $omgeving, 'opslag' => $uitkomst['bron'], 'voortgang' => $uitkomst]);
}

// ---- Kaart verplaatsen ------------------------------------------------------
$sleutel = intake_tekst($invoer['key'] ?? '', 40);
$kolom = intake_tekst($invoer['status'] ?? '', 10);
// Waar de kaart vandaan kwam weet alleen de client: de opslag kent hooguit zijn
// eigen vorige waarde, en die is leeg zodra een kaart voor het eerst verplaatst
// wordt. Zonder deze waarde staat er "van: niets" in de geschiedenis.
$vanClient = intake_tekst($invoer['from'] ?? '', 10);

if ($sleutel === '') {
    store_antwoord(422, ['error' => 'Zonder sleutel is niet te zeggen welke kaart je bedoelt.']);
}
if (!in_array($kolom, STORE_KOLOMMEN, true)) {
    store_antwoord(422, ['error' => 'Onbekende kolom. Toegestaan: ' . implode(', ', STORE_KOLOMMEN) . '.']);
}

$uitkomst = opslag_zet_status(
    $pad,
    $sleutel,
    $kolom,
    in_array($vanClient, STORE_KOLOMMEN, true) ? $vanClient : '',
    // Wie het deed komt van de server, niet uit het verzoek: een client die zijn
    // eigen naam mag invullen maakt de geschiedenis waardeloos. De pijplijn
    // verschijnt onder zijn eigen naam, zodat in de geschiedenis te zien blijft
    // wat een mens deed en wat vanzelf ging.
    $pijplijn ? 'Pijplijn' : kwaliteitsstraat_naam($gebruiker)
);
if ($uitkomst === null) {
    store_antwoord(503, ['error' => 'De opslag is nu niet beschikbaar.']);
}

store_antwoord(200, [
    'environment' => $omgeving,
    'opslag' => $uitkomst['bron'],
    'item' => $uitkomst['item'],
    'changed' => $uitkomst['changed'],
]);
