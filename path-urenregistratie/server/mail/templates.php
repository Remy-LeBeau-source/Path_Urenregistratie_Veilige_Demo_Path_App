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
];
