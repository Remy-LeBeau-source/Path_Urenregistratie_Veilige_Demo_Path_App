# Handoff — functionele 1919-pilots naar TEST

Datum: 6 september 2026

Versie: `1.0.54`

Branch: `main`

Grens: deploy naar TEST; **geen PROD-promotie uitvoeren**

## Resultaat

De bestaande applicatie op `/` blijft ongewijzigd beschikbaar. Daarnaast staan twee functionele,
same-origin pilotportals klaar:

- medewerker: `/pilot/1919-medewerker.html`
- Backoffice: `/pilot/1919-beheerder.html`

Beide pilots gebruiken dezelfde bestaande sessie, CSRF-beveiliging, API's en TEST-database. Ze
hebben geen eigen statusmachine of pilotdata. Een wijziging in de pilot is daardoor na opnieuw laden
zichtbaar in de bestaande app en andersom.

Voor een medewerker- en beheerderssessie tegelijk zijn twee browserprofielen nodig, bijvoorbeeld
een normaal venster en een incognitovenster. Eén browserprofiel deelt namelijk dezelfde
same-origin sessiecookie.

## Functionele grenzen

- Iedere nieuwe login start in de actuele maand in `Europe/Amsterdam`: nu september 2026.
- Een zelfgekozen maand blijft gedurende de ingelogde sessie actief.
- Uitloggen wist de keuze; opnieuw inloggen opent weer de actuele maand.
- De medewerker ziet uitsluitend eigen uren en de eigen klanturenstaat, nooit facturen.
- Uren kunnen per dag als normaal, verlof of ziekte worden vastgelegd als de bedrijfsinstelling dit
  toestaat. Ook `0 uur` is een bewust ingevulde dag.
- Indienen toont eerst `Weet je het zeker?`; daarna wordt de maand alleen-lezen en ziet de
  medewerker de geanimeerde overdracht `Backoffice neemt het over`.
- Een PDF/JPG/PNG van maximaal 2 MB kan als klanturenstaat worden ingediend.
- `Al rechtstreeks gemaild` vereist een reden en blijft oranje/blokkerend.
- Alleen Backoffice kan daarna `Extern bevestigd` met verplichte reden vastleggen; pas dan wordt de
  status terecht groen.
- `Bevestiging terugdraaien` heeft een tweede expliciete waarschuwing en zet de urenstaat weer op
  ontbrekend.
- Uren goedkeuren, correctie vragen, PDF beoordelen en opnieuw aanleveren vragen werken in de
  beheerpilot. Factuurfinalisatie en echte mail blijven bewust in de bestaande app op `/`.

## Belangrijkste bestanden

- `pilot/1919-medewerker.html`
- `pilot/1919-medewerker.js`
- `pilot/1919-portal.css`
- `pilot/1919-portal.js`
- `pilot/1919-beheerder.html`
- `pilot/1919-beheerder.css`
- `pilot/1919-beheerder.js`
- `pilot/assets/1919/ASSET-MANIFEST.md`
- `tests/playwright/pilot-page.spec.ts`
- `tests/playwright/features/pilot-page.feature`

De assetmanifest bevat per gebruikte foto en font het pad, formaat, uitsnede, alt-tekst en SHA-256.
Daardoor kan een volgende agent de visuals wijzigen zonder te raden welke bron in gebruik is.

## Video

De uitgebreide Kanban-demovideo staat hier:

`design-mockups/videos/1010-kanban-medewerker-beheer-60s.webm`

Het renderscript staat in:

`design-mockups/videos/render-scripts/render-1010-kanban.mjs`

De video is alleen een ontwerpdemonstratie en wijzigt de applicatie niet. Hij toont maandkeuze,
uren vastleggen, indienen met waarschuwing, rechtstreeks gemaild, de geanimeerde overdracht,
Backoffice-selectie en extern bevestigen.

## Geautomatiseerde bewijzen

- `npm run check`: groen
- `npm run build`: groen
- `tests/playwright/pilot-page.spec.ts`: 8/8 groen op desktop Chromium, inclusief 390×844
- `DASH-H-022`: groen in een echte browser
- Living Documentation: 418/418 uitvoerbare cases gekoppeld, 280 positief en 138 negatief
- Versiecontrole: `1.0.54` op alle 13 verwachte plekken
- `git diff --check`: groen

De Living Doc-generator herkent nu ook testtitels met gewone aanhalingstekens en template-literals.
De eerder ontbrekende suites voor de 1919-pilot, het hulpvenster en relationele databasecontrole
zijn aan de generator en Allure-mapping toegevoegd.

## Handmatige TEST-acceptatie

1. Open de medewerkerpilot en log in als een medewerker.
2. Controleer dat september 2026 opent en dat geen factuur of `160 uur`-doel zichtbaar is.
3. Vul een dag in, dien de maand in en controleer waarschuwing, lock en overdrachtsanimatie.
4. Registreer `Al rechtstreeks gemaild` met reden; controleer dat de status oranje blijft.
5. Open in een ander browserprofiel de beheerpilot en log in als beheerder.
6. Selecteer dezelfde medewerker, leg `Extern bevestigd` met reden vast en controleer groen.
7. Draai de bevestiging terug; controleer de tweede waarschuwing en de ontbrekende status.
8. Test apart de PDF-route: medewerker uploadt, Backoffice opent eerst de PDF en keurt goed.
9. Vraag een urencorrectie met verplichte reden; controleer in het medewerkersprofiel dat de maand
   opnieuw bewerkbaar is.
10. Kies een andere maand, herlaad, log uit en in; de keuze blijft tijdens de sessie en reset daarna
    naar september 2026.

Stop na deze menselijke acceptatie. De gebruiker beslist zelf of en wanneer er verder naar PROD
wordt gepromoveerd.
