<?php

declare(strict_types=1);

// De begeleidende tekst per soort ontvanger.
//
// Deze staan apart omdat twee kanten ze nodig hebben: de mailmodule om ze te
// versturen, en de API om ze in het instellingenscherm te laten zien. Zonder
// dat laatste kun je alleen zien wat er verstuurd wordt door het daadwerkelijk
// te versturen -- en dat is precies hoe een verouderde tekst maanden kan blijven
// staan zonder dat iemand het merkt.
//
// Welke tekst een ontvanger krijgt, in deze volgorde:
//
//   1. de tekst die bij die ene ontvanger is ingevuld -- die wint altijd
//   2. de tekst bij de opdracht
//   3. de standaardtekst hieronder
//
// Met een uitzondering: de boekhouder en de salarisadministratie slaan stap 2
// over. De opdrachttekst is aan de broker gericht en las bij hen als een bericht
// aan de verkeerde persoon.

const MAIL_CHANNEL_TEMPLATES = [
    'broker' => [
        'subject' => 'Factuur {factuurnummer} – {periode}',
        'body' =>
            "Geachte relatie,\n\n"
            . "Bijgevoegd ontvangt u factuur {factuurnummer} voor de periode {periode}.\n\n"
            . "Medewerker: {medewerker}\nUren: {uren}\n"
            . "Subtotaal: € {subtotaal}\nBtw: € {btw}\nTotaal: € {bedrag}",
    ],
    'accountant' => [
        // Het factuurnummer staat vooraan in het onderwerp: een boekhouder zoekt
        // daarop terug, niet op een naam. De bedragen staan uitgesplitst in het
        // bericht, zodat de administratie klopt zonder de bijlage te openen.
        'subject' => 'Factuur {factuurnummer} · {medewerker} · {periode}',
        'body' =>
            "Goedemiddag,\n\n"
            . "Hierbij de factuur van {medewerker} over {periode}.\n\n"
            . "Factuurnummer: {factuurnummer}\n"
            . "Gewerkte uren: {uren}\n"
            . "Subtotaal: € {subtotaal}\n"
            . "Btw: € {btw}\n"
            . "Totaal: € {bedrag}",
    ],
    'payroll' => [
        // Bewust geen bedragen en geen factuurnummer: de salarisadministratie
        // hoort alleen de ureninformatie te krijgen, en er gaat hier ook geen
        // factuur als bijlage mee. Dat staat zo in het instellingenscherm.
        'subject' => 'Uren {medewerker} · {periode}',
        'body' =>
            "Goedemiddag,\n\n"
            . "Hierbij de goedgekeurde uren van {medewerker} over {periode}.\n\n"
            . "Gewerkte uren: {uren}",
    ],
    // The settings screen offers 'Overig' as a category, and a recipient with it
    // used to be dropped silently: the channel had no template, so the queue loop
    // skipped it. Someone ticked "Ontvangt mail" and nothing ever arrived. Neutral
    // wording that holds for any recipient; no attachment, same as payroll.
    'other' => [
        'subject' => 'Ureninformatie {medewerker} - {periode}',
        'body' =>
            "Goedemiddag,\n\n"
            . "Hierbij de ureninformatie van {medewerker} over {periode}.\n\n"
            . "Goedgekeurde uren: {uren}",
    ],
    // De eerste e-mail die een nieuwe of gemigreerde medewerker krijgt: een
    // uitnodiging om zelf een wachtwoord in te stellen. Stond eerder hard in
    // server/auth/password-reset-service.php; nu hier zodat een bedrijf hem bij
    // Instellingen kan aanpassen. Andere tokens dan de factuurkanalen:
    // {naam} {app} {bedrijf} {link} {geldigheid}. De afzender-handtekening
    // wordt door de mailmodule toegevoegd, dus geen eigen afsluiting hier.
    'account_invitation' => [
        'subject' => 'Welkom bij {app} - stel je wachtwoord in',
        'body' =>
            "Hoi {naam},\n\n"
            . "Je account voor {app} van {bedrijf} staat klaar. Stel via de persoonlijke link hieronder je wachtwoord in, dan kun je meteen aan de slag.\n\n"
            . "{link}\n\n"
            . "De link werkt {geldigheid} en kan een keer worden gebruikt. Heb je hier niet om gevraagd? Dan mag je deze e-mail negeren.",
    ],
];

/**
 * De teksten zoals ze werkelijk gelden voor een bedrijf.
 *
 * MAIL_CHANNEL_TEMPLATES hierboven is wat we meeleveren. Een bedrijf kan dat per
 * kanaal overschrijven bij Instellingen. Er wordt bewust geen rij aangemaakt bij
 * het opzetten van een bedrijf: ontbreekt de rij, of is het veld leeg, dan geldt
 * de meegeleverde tekst. Zo loopt wie niets aanpast mee met verbeteringen daaraan,
 * en houdt wie wel aanpast zijn eigen tekst.
 *
 * @return array<string, array{subject: string, body: string}>
 */
function mail_channel_templates_for(PDO $pdo, int $companyId): array
{
    $uit = MAIL_CHANNEL_TEMPLATES;

    try {
        $stmt = $pdo->prepare(
            'SELECT channel, subject_template, body_template FROM mail_channel_templates WHERE company_id = :company_id'
        );
        $stmt->execute([':company_id' => $companyId]);
        $rijen = $stmt->fetchAll();
    } catch (Throwable $e) {
        // De tabel komt met migratie 024. Draait die nog niet, dan zijn de
        // meegeleverde teksten het antwoord -- geen reden om de mail te stoppen.
        return $uit;
    }

    foreach ($rijen as $rij) {
        $kanaal = (string)($rij['channel'] ?? '');
        if (!isset($uit[$kanaal])) {
            continue;
        }
        $onderwerp = trim((string)($rij['subject_template'] ?? ''));
        $tekst = trim((string)($rij['body_template'] ?? ''));
        if ($onderwerp !== '') {
            $uit[$kanaal]['subject'] = $onderwerp;
        }
        if ($tekst !== '') {
            $uit[$kanaal]['body'] = $tekst;
        }
    }

    return $uit;
}

/**
 * Welke kanalen een eigen tekst hebben staan.
 *
 * Dit is niet hetzelfde als 'wijkt af van de meegeleverde tekst'. Een opgeslagen
 * tekst die toevallig gelijk is aan de meegeleverde, is nog steeds een eigen tekst:
 * hij bevriest die tekst, zodat een latere verbetering aan de meegeleverde versie
 * niet meer doorkomt. Dat verschil is aan de uitkomst niet te zien, en juist daarom
 * moet het apart worden gemeld.
 *
 * @return array<int, string>
 */
function mail_channel_customised_for(PDO $pdo, int $companyId): array
{
    try {
        $stmt = $pdo->prepare(
            'SELECT channel FROM mail_channel_templates WHERE company_id = :company_id'
        );
        $stmt->execute([':company_id' => $companyId]);
    } catch (Throwable $e) {
        return [];
    }

    $uit = [];
    foreach ($stmt->fetchAll() as $rij) {
        $kanaal = (string)($rij['channel'] ?? '');
        if (isset(MAIL_CHANNEL_TEMPLATES[$kanaal])) {
            $uit[] = $kanaal;
        }
    }
    return $uit;
}
