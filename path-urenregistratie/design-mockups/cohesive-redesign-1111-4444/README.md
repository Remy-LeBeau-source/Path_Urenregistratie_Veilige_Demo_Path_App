# Samenhangend redesign 1111–4444

Vier schermen uit één ontwerpserie. Dit zijn alleen JPG-concepten; de applicatiecode en TEST zijn niet gewijzigd.

> **Vervallen voor implementatie:** de oude medewerkerconcepten `1111` en `2222` tonen ten onrechte
> factuurinformatie en te veel navigatie. Gebruik daarvoor uitsluitend de gecorrigeerde pakketten in
> `../redesign-packages-2026-09/`. `3333` en `4444` blijven bruikbare referenties.

## Schermen

- `1111-START-medewerker-dashboard.jpg` — medewerkerdashboard met actuele maand, volgende actie, maandvoortgang, proceslijn, weekstrip en statussen.
- `2222-UREN-medewerker-invoer.jpg` — ureninvoer met weekrooster, concept opslaan, indienen en alleen-lezen document-/factuurstatussen.
- `3333-REGIE-beheerder-maandoverzicht.jpg` — Backoffice-maandoverzicht met echte septembercases en een contextpaneel voor externe bevestiging.
- `4444-PROFIEL-avatar-foto-keuze.jpg` — keuze uit vaste diverse avatars, eigen JPG/PNG uploaden, bijsnijden, initialen gebruiken of foto verwijderen.

## Vast functioneel contract

De vormgeving verandert de bestaande rollen en procesverantwoordelijkheden niet:

1. De medewerker vult uren in en dient ze binnen de app in. De verdere routing gebeurt automatisch; de medewerker verstuurt geen losse urenmail.
2. De medewerker voegt de klanturenstaat toe of registreert dat deze al rechtstreeks is gemaild.
3. Backoffice kan `Extern bevestigen` met verplichte reden wanneer een klanturenstaat buiten de app is bevestigd.
4. Backoffice maakt, controleert en verstuurt de factuur. De medewerker ziet geen facturen of factuurstatus.
5. Bij opnieuw inloggen opent de actuele maand; binnen de sessie mag een andere maand gekozen worden.

## Septembercases in 3333

- Marc de Roon — uren `Concept`, klanturenstaat `Ontbreekt`, factuur `Nog niet`, wacht op medewerker.
- Brian Hek — uren `Ingediend`, klanturenstaat `Extern bevestigd`, uren controleren.
- Stasjo van Bakel — uren `Goedgekeurd`, klanturenstaat `Extern bevestigd`, factuur nog niet aangemaakt.
- Shawn-Douglas Nahar — uren `Goedgekeurd`, klanturenstaat `Rechtstreeks gemaild`, conceptfactuur, Backoffice moet extern bevestigen.

## Ontwerpsysteem en promptset

Gegenereerd met de ingebouwde image-generationmodus als high-fidelity `ui-mockup`. Alle vier gebruiken: Path-navy navigatie, off-white canvas, donkere serif-koppen, moderne sans-serif tekst, mint voor primair/succes, amber voor actie, rood alleen voor blokkades, fijne randen, subtiele schaduw en een vast 8px-ritme. De prompts vereisten Nederlandse labels, september 2026, behoud van de bestaande uren-/klanturenstaat-/factuurflow, geen gradients, geen glassmorphism, geen watermerk en geen nieuwe businessmodules.
