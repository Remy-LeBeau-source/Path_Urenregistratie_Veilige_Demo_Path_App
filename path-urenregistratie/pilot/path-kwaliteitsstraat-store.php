<?php

declare(strict_types=1);

// Gedeelde opslag voor de kwaliteitsstraat: de stand van een kaart (kolom en
// volgorde) en de geschiedenis daarvan.
//
// Waarom dit bestaat: tot nu toe stond de stand van het bord vast in
// GIO-WENSEN.md, en alles wat een bezoeker zelf deed bleef in zijn eigen
// browser. Daardoor kon een kaart niet echt verplaatst worden -- slepen zou een
// stand tonen die niemand anders ziet. Opdracht Gio (17 sep): dit wordt het
// product, dus slepen moet de stand echt veranderen.
//
// Waarom een bestand en (nog) geen database: deze omgeving heeft alleen een
// MySQL-stuurprogramma, geen SQLite. Een eigen database aanmaken vraagt
// provisioning op de server; tabellen in de bestaande database toevoegen
// betekent migraties die ook op de productie van de urenregistratie draaien --
// precies wat de intakewachtrij destijds bewust vermeed. Tot die keuze gemaakt
// is, gebruikt deze opslag hetzelfde beproefde patroon als die wachtrij: een
// bestand buiten de webroot, met een exclusieve vergrendeling per schrijfactie.
// De vorm hieronder (items + historie) is bewust al tabelachtig, zodat de
// overstap naar echte tabellen een verhuizing is en geen herontwerp.
//
// Wat hier NIET gebeurt: inhoud wijzigen. Titels, omschrijvingen en criteria
// blijven uit de projectstand komen. Deze opslag gaat alleen over de stand:
// waar staat de kaart, in welke volgorde, en wie heeft dat wanneer gedaan.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/path-kwaliteitsstraat-intake-lib.php';

const STORE_MAX_BODY_BYTES = 4096;
const STORE_MAX_HISTORIE = 500;
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

function store_leeg(): array
{
    return ['version' => 1, 'items' => [], 'historie' => []];
}

function store_lees(string $pad): array
{
    if (!is_file($pad)) {
        return store_leeg();
    }
    $ruw = file_get_contents($pad);
    if ($ruw === false || trim($ruw) === '') {
        return store_leeg();
    }
    $data = json_decode($ruw, true);
    if (!is_array($data) || !isset($data['items']) || !is_array($data['items'])) {
        return store_leeg();
    }
    if (!isset($data['historie']) || !is_array($data['historie'])) {
        $data['historie'] = [];
    }
    return $data;
}

[$omgeving, $pad] = store_pad();

if ($omgeving === 'production') {
    store_antwoord(404, ['error' => 'Deze opslag bestaat alleen op TEST.']);
}

$methode = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($methode === 'GET') {
    $stand = store_lees($pad);
    store_antwoord(200, [
        'environment' => $omgeving,
        'items' => $stand['items'],
        // Alleen het recente deel: de volledige geschiedenis hoort bij het item,
        // niet bij elke paginalading.
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

$sleutel = intake_tekst($invoer['key'] ?? '', 40);
$kolom = intake_tekst($invoer['status'] ?? '', 10);
$door = intake_tekst($invoer['by'] ?? '', 60);
// Waar de kaart vandaan kwam weet alleen de client: de opslag kent hooguit zijn
// eigen vorige waarde, en die is leeg zodra een kaart voor het eerst verplaatst
// wordt. Zonder deze waarde staat er "van: niets" in de geschiedenis, en dan is
// de regel onbruikbaar om later na te vertellen wat er gebeurd is.
$vanClient = intake_tekst($invoer['from'] ?? '', 10);
$volgorde = isset($invoer['order']) && is_array($invoer['order'])
    ? array_slice(array_map(static fn($k): string => intake_tekst($k, 40), $invoer['order']), 0, 200)
    : null;

if ($sleutel === '') {
    store_antwoord(422, ['error' => 'Zonder sleutel is niet te zeggen welke kaart je bedoelt.']);
}
if (!in_array($kolom, STORE_KOLOMMEN, true)) {
    store_antwoord(422, ['error' => 'Onbekende kolom. Toegestaan: ' . implode(', ', STORE_KOLOMMEN) . '.']);
}

$map = dirname($pad);
if (!is_dir($map) || !is_writable($map)) {
    store_antwoord(503, ['error' => 'De opslag is nu niet beschikbaar.']);
}

// Een schrijver tegelijk: twee mensen die op hetzelfde moment een kaart
// verplaatsen mogen elkaars wijziging niet overschrijven.
$slot = fopen($pad, 'c+');
if ($slot === false || !flock($slot, LOCK_EX)) {
    if (is_resource($slot)) {
        fclose($slot);
    }
    store_antwoord(503, ['error' => 'De opslag is nu niet beschikbaar.']);
}

$inhoud = stream_get_contents($slot);
$stand = is_string($inhoud) && trim($inhoud) !== '' ? (json_decode($inhoud, true) ?: store_leeg()) : store_leeg();
if (!isset($stand['items']) || !is_array($stand['items'])) {
    $stand = store_leeg();
}
if (!isset($stand['historie']) || !is_array($stand['historie'])) {
    $stand['historie'] = [];
}

$nu = time();
$vorige = $stand['items'][$sleutel]['status']
    ?? (in_array($vanClient, STORE_KOLOMMEN, true) ? $vanClient : null);
$stand['items'][$sleutel] = [
    'key' => $sleutel,
    'status' => $kolom,
    'updated_ts' => $nu,
    'updated_at' => gmdate('c', $nu),
];
if ($volgorde !== null) {
    $stand['order'] = $volgorde;
}

// Alleen een echte wijziging komt in de geschiedenis: een kaart die op zijn
// eigen plek wordt losgelaten is geen gebeurtenis om te bewaren.
if ($vorige !== $kolom) {
    array_unshift($stand['historie'], [
        'key' => $sleutel,
        'from' => $vorige,
        'to' => $kolom,
        'by' => $door !== '' ? $door : 'onbekend',
        'at' => gmdate('c', $nu),
    ]);
    if (count($stand['historie']) > STORE_MAX_HISTORIE) {
        $stand['historie'] = array_slice($stand['historie'], 0, STORE_MAX_HISTORIE);
    }
}

$nieuweInhoud = json_encode($stand, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if ($nieuweInhoud === false) {
    flock($slot, LOCK_UN);
    fclose($slot);
    store_antwoord(500, ['error' => 'De stand kon niet worden opgeslagen.']);
}

rewind($slot);
ftruncate($slot, 0);
fwrite($slot, $nieuweInhoud . "\n");
fflush($slot);
flock($slot, LOCK_UN);
fclose($slot);

store_antwoord(200, [
    'environment' => $omgeving,
    'item' => $stand['items'][$sleutel],
    'changed' => $vorige !== $kolom,
]);
