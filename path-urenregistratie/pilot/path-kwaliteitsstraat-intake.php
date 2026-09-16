<?php

declare(strict_types=1);

// Intakewachtrij voor de demo-pagina (pilot/path-kwaliteitsstraat.html).
//
// Waarom dit bestand bestaat: Gio vulde een wens in en werd daarna naar GitHub
// gestuurd om daar zelf op "Submit new issue" te klikken. Die klik hoort niet
// bij hem thuis; hij vult in, slaat op, en de keten loopt door. De vraag was dus
// waar een opgeslagen wens landt zonder dat er een GitHub-token in een publieke
// pagina komt te staan. Antwoord: hier, in een eigen wachtrij.
//
// Waarom in pilot/ en niet in de app-database: een tabel betekent een migratie,
// en migraties draaien ook op productie. Dan staat er demo-plumbing in het
// productieschema voor iets dat alleen op TEST bestaat. pilot/ is structureel
// afgeschermd -- scripts/deployment-contract-check.mjs eist dat het
// productie-archief pilot uitsluit, controleert daarna in de tar dat er geen
// pilot-pad is doorgeglipt, en eist dat het TEST-archief pilot juist wel
// meeneemt. Dit bestand kan productie dus niet bereiken.
//
// Tweede slot, voor het geval het ooit toch ergens anders belandt: hieronder
// weigert alles zodra de omgeving 'production' is, en dat is ook de uitkomst als
// er helemaal geen omgeving is ingesteld.
//
// Wat hier NIET gebeurt: statussen bijwerken. Een opgeslagen wens is alleen toe
// te voegen en te lezen, nooit te wijzigen of te verwijderen. Dat "opgepakt" en
// "geleverd" worden zichtbaar via pilot/path-kwaliteitsstraat-data.json, dat de
// agent genereert en meestuurt met de gewone uitrol. Zo hoeft er geen sleutel te
// bestaan waarmee een voorbijganger de wachtrij kan veranderen.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/path-kwaliteitsstraat-intake-lib.php';

function intake_antwoord(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

[$omgeving, $wachtrijPad] = intake_omgeving_en_pad();

if ($omgeving === 'production') {
    intake_antwoord(404, ['error' => 'Deze demo-wachtrij bestaat alleen op TEST.']);
}

$methode = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($methode === 'GET') {
    intake_antwoord(200, [
        'environment' => $omgeving,
        'wishes' => intake_publieke_wensen(intake_lees($wachtrijPad)),
    ]);
}

if ($methode !== 'POST') {
    header('Allow: GET, POST');
    intake_antwoord(405, ['error' => 'Alleen GET en POST.']);
}

$ruweBody = file_get_contents('php://input');
if ($ruweBody === false) {
    $ruweBody = '';
}
if (strlen($ruweBody) > INTAKE_MAX_BODY_BYTES) {
    intake_antwoord(413, ['error' => 'De wens is te lang. Houd het bij een paar zinnen per veld.']);
}

$invoer = json_decode($ruweBody, true);
if (!is_array($invoer)) {
    intake_antwoord(400, ['error' => 'Onleesbare invoer.']);
}

$titel = intake_tekst($invoer['title'] ?? '', 120);
$doel = intake_tekst($invoer['goal'] ?? '', 400);
$criterium = intake_tekst($invoer['criterion'] ?? '', 400);
$stakeholder = intake_tekst($invoer['stakeholder'] ?? '', 60);
$type = intake_tekst($invoer['type'] ?? '', 20);

if ($titel === '' || $doel === '' || $criterium === '') {
    intake_antwoord(422, ['error' => 'Samenvatting, gewenste waarde en acceptatiecriterium zijn alle drie nodig.']);
}
// Dezelfde vier waarden als de keuzelijst in pilot/path-pipeline.html; een
// onbekende waarde wordt niet geweigerd maar teruggezet, zodat een oude pagina
// in een geopend tabblad blijft werken.
if (!in_array($type, ['feature', 'bug', 'chore', 'ci'], true)) {
    $type = 'feature';
}
if ($stakeholder === '') {
    $stakeholder = 'Product Owner';
}

$map = dirname($wachtrijPad);
if (!is_dir($map) || !is_writable($map)) {
    intake_antwoord(503, ['error' => 'De wachtrij is nu niet beschikbaar.']);
}

// Een schrijver tegelijk: twee wensen op hetzelfde moment mogen elkaar niet
// overschrijven en mogen niet hetzelfde PATH-nummer krijgen.
$slot = fopen($wachtrijPad, 'c+');
if ($slot === false || !flock($slot, LOCK_EX)) {
    if (is_resource($slot)) {
        fclose($slot);
    }
    intake_antwoord(503, ['error' => 'De wachtrij is nu niet beschikbaar.']);
}

$inhoud = stream_get_contents($slot);
$wachtrij = is_string($inhoud) && trim($inhoud) !== '' ? intake_uit_json($inhoud) : intake_lege_wachtrij();

$nu = time();
$ipSleutel = intake_ip_sleutel((string)($_SERVER['REMOTE_ADDR'] ?? 'onbekend'));
$limietFout = intake_limiet_overschreden($wachtrij, $ipSleutel, $nu);
if ($limietFout !== null) {
    flock($slot, LOCK_UN);
    fclose($slot);
    intake_antwoord(429, ['error' => $limietFout]);
}

$nummer = max((int)$wachtrij['sequence'], INTAKE_EERSTE_NUMMER);
$wachtrij['sequence'] = $nummer + 1;

$wens = [
    'key' => 'PATH-' . $nummer,
    'title' => $titel,
    'type' => $type,
    'stakeholder' => $stakeholder,
    'goal' => $doel,
    'criterion' => $criterium,
    'status' => 'aangenomen',
    'submitted_ts' => $nu,
    'submitted_at' => gmdate('c', $nu),
    'ip_hash' => $ipSleutel,
];

array_unshift($wachtrij['wishes'], $wens);
if (count($wachtrij['wishes']) > INTAKE_MAX_WENSEN) {
    $wachtrij['wishes'] = array_slice($wachtrij['wishes'], 0, INTAKE_MAX_WENSEN);
}

$nieuweInhoud = json_encode($wachtrij, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if ($nieuweInhoud === false) {
    flock($slot, LOCK_UN);
    fclose($slot);
    intake_antwoord(500, ['error' => 'De wens kon niet worden opgeslagen.']);
}

rewind($slot);
ftruncate($slot, 0);
fwrite($slot, $nieuweInhoud . "\n");
fflush($slot);
flock($slot, LOCK_UN);
fclose($slot);

unset($wens['ip_hash']);
intake_antwoord(201, ['environment' => $omgeving, 'wish' => $wens]);
