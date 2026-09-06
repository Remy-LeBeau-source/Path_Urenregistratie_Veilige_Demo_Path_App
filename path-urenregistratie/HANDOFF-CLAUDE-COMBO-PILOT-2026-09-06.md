# Handoff voor Claude — 1414 Bento × 1919 procespilot

Datum: 6 september 2026  
Branch: `main`  
Werkgrens: uitsluitend LOCAL en TEST; **geen PROD-promotie**

## Beslissing van de gebruiker

Vervang de vormgeving van de twee bestaande 1919-pilotpagina's door één samenhangende combinatie:

- medewerker: de donkere, menselijke Bento-opzet uit `design-mockups/1414-path-bento-space/medewerker-dashboard.jpg`;
- Backoffice: het verhalende procesoverzicht uit `design-mockups/1919-path-storyline/beheerder-maandoverzicht.jpg`;
- werking en statussen blijven volledig servergestuurd en moeten overeenkomen met FO/TO en de bestaande app.

De vaste pilot-URL's blijven:

- `/pilot/1919-medewerker.html`
- `/pilot/1919-beheerder.html#team`

De bestaande app op `/` en PROD mogen door deze pilot niet veranderen. Gewone pilotbediening mag
niet onverwacht naar de oude vormgeving navigeren. Alleen uitloggen of een verlopen sessie mag naar
de gedeelde loginroute gaan.

## Wat in deze werkstand al is uitgevoerd

- Beide HTML-pagina's dragen `data-pilot-design="combo-1414-1919"`.
- Medewerker heeft een donkere Bento-layout met uren-, voortgangs-, overdrachts- en documentkaart.
- Uren staan per week als directe numerieke invoervelden in beeld; geen popup per werkdag.
- Eén knop `Week opslaan` bewaart de zichtbare week via de bestaande timesheet-API.
- Vorige/volgende week opent alle weken van de gekozen maand; dagen buiten de maand zijn geblokkeerd.
- `Uren indienen` blijft de duidelijke maandactie en toont eerst `Weet je het zeker?`.
- Verlof en ziekte volgen `company.leave_sick_entry_enabled`: uit betekent geblokkeerde invoer met
  uitleg; aan betekent invoerbaar zolang de urenstaat bewerkbaar is.
- De klanturenstaatkaart projecteert de echte serverstatus. Ontbrekend is nooit groen. De medewerker
  krijgt via `Urenstaat aanleveren` de twee bestaande keuzes: PDF/JPG/PNG uploaden of `Al
  rechtstreeks gemaild` registreren.
- `Al rechtstreeks gemaild` blijft amber en blokkerend. Alleen Backoffice `Extern bevestigd` met
  verplichte reden maakt hem groen. `Bevestiging terugdraaien` vraagt opnieuw bevestiging.
- De Backoffice-wachtrij toont per medewerker een horizontale statuslijn. Selectie werkt de
  servergestuurde detailstappen en volgende actie bij.
- De felgroene rechthoeken/cursorringen uit de conceptvideo zijn alleen demonstratie-highlights en
  horen niet in de runtime. Alleen subtiele statuslijnen mogen animeren.
- Gewone links naar `/` zijn uit beide pilotinterfaces verwijderd. De nog niet overgenomen
  factuuractie toont een niet-schrijvende pilotmelding in plaats van een onverwachte routewissel.
- FO, TO, feature en Playwright-regressie zijn aan de nieuwe pilotvorm aangepast.

## Lokale beeldassets — gereed voor Claude

Actief gebruikt:

- `pilot/assets/1919/bento-foliage-v2.png` — donkere menselijke urenhero, vrije tekstruimte;
- `pilot/assets/1919/bento-timesheet-v2.png` — crèmekleurige documentkaart met groene map;
- `pilot/assets/1919/serif.woff2` — lokale serifkoppen.

Herkomst, resolutie, alt-tekst en SHA-256 staan in
`pilot/assets/1919/ASSET-MANIFEST.md`. Externe fonts, CDN's of afbeeldingen zijn niet toegestaan.
De twee PNG's zijn op 6 september met de ingebouwde OpenAI-imagegenerator gemaakt. Voor deze
iteratie zijn geen extra stockfoto's nodig. Medewerkeravatars blijven privacyvriendelijke initialen
zolang er geen servergestuurde profiel- of avatarfunctie is besloten; bouw geen client-only foto-opslag.

## Verplichte functionaliteit die behouden moet blijven

Gebruik uitsluitend de bestaande same-origin sessie en endpoints:

- `server/auth/me.php`, `csrf.php`, `logout.php`;
- `server/api/bootstrap.php`;
- `server/api/timesheets.php`;
- `server/api/customer-timesheets.php`;
- voor beheer `server/api/invoices.php`.

Geen eigen pilotdatabase, localStorage-statusmachine of hardcoded groene vinkjes. `credentials:
same-origin`, CSRF, rol-, organisatie- en medewerker-scoping blijven verplicht. De geselecteerde
maand staat alleen voor de ingelogde sessie in `sessionStorage`; nieuwe login begint in de actuele
maand van `Europe/Amsterdam`.

## Nog te bouwen: fase 2 — volledige 1-op-1 pilotnavigatie

Dit is nadrukkelijk later werk en nog niet gereed in de huidige pilot:

### Medewerker

- compact rolmenu met `Dashboard`, `Mijn uren` en `Mededelingen`;
- badges uitsluitend uit echte serverprojecties;
- geen `Facturen`, `Goedkeuringen`, `Medewerkers` of `Instellingen` tonen.

### Backoffice

- volledig rolmenu met `Dashboard`, `Goedkeuringen`, `Facturen`, `Mededelingen`, `Medewerkers` en
  `Instellingen`;
- iedere bestemming moet binnen de nieuwe pilotvorm blijven; geen stille sprong naar oude UI;
- nog niet overgenomen schermen krijgen tijdelijk een duidelijke `Nog niet beschikbaar in pilot`
  toestand, zonder nepwrite.

### Vaste omgevingsbediening

- maandkiezer, vorige/volgende maand, meldingenbel, profiel, rolwissel, uitloggen, hulp & contact en
  zichtbaar versienummer/omgevingslabel;
- LOCAL: `Lokale mailpreview` en veilige demo-`Herstel`;
- TEST: echte serverstatus van de afgeschermde TEST-mailschakelaar en veilige demo-`Herstel`;
- PROD: nooit Herstel, demoaccounts of een gewone mailschakelaar;
- Herstel vereist CSRF en expliciete bevestiging en gebruikt de bestaande serveractie; kopieer de
  resetlogica niet naar de browser.

### Verlof en ziekte

- Backoffice-instelling uit: medewerker kan nergens verlof/ziekte kiezen of schrijven en ziet een
  korte uitleg;
- instelling aan: beide velden zijn beschikbaar in iedere bewerkbare maand;
- submitted/approved/invoiced blijft altijd alleen-lezen;
- voeg positieve en negatieve assertions toe voor aan/uit × draft/submitted.

### Factuurstap

- Neem factuur-, PDF- en mailcontrole pas over als alle bestaande beveiligings- en attachmentregels
  1-op-1 via de server zijn aangesloten;
- medewerker ziet nooit facturen;
- geen tweede clientstatusmachine en geen verkorte nepflow;
- tot die tijd blijft de huidige niet-schrijvende pilotmelding staan.

## UX-acceptatie

- Alle urenvelden van één week zijn zonder modal direct invulbaar.
- `Week opslaan` is zichtbaar naast weeknavigatie; `Uren indienen` is visueel de dominante maandactie.
- Navigeren naar een andere week zonder opslaan mag geen onduidelijke dataverliesroute worden: voeg
  vóór fase-2-oplevering dirty-statebehoud of een heldere waarschuwing toe.
- `0` wist momenteel de urenregel en telt dus niet als geregistreerde werkdag. Verander dit alleen
  met een expliciete bedrijfsbeslissing plus API-, FO- en testwijziging.
- Klanturenstaat ontbreekt: toon `Urenstaat aanleveren`, nooit een vinkje.
- Bestand ontvangen: blauw/actief; rechtstreeks gemaild: amber; extern bevestigd/goedgekeurd/
  verzonden: groen.
- Statuslijn: groen is werkelijk gereed, amber actie vereist, blauw actief/in behandeling, grijs nog
  niet gestart.
- Lijnen mogen bij een echte overgang kort tekenen/gloeien en moeten `prefers-reduced-motion`
  respecteren. Geen grote video-highlights in de runtime.
- Desktop en 390 × 844 mogen geen horizontale overflow hebben; tapdoelen minimaal 42 px.

## Testcontract

Lees vóór vervolgwerk volledig:

1. `AGENTS.md`
2. `WERKWIJZE-PATROON.md`
3. `FUNCTIONEEL-ONTWERP.md`
4. `TECHNISCH-ONTWERP.md`
5. `tests/playwright/features/pilot-page.feature`
6. `tests/playwright/pilot-page.spec.ts`

Minimaal draaien:

```text
node --check pilot/1919-portal.js
node --check pilot/1919-beheerder.js
npm run test:e2e -- --grep "PILOT"
npm run test:gui-smoke
npm run check
npm run build
git diff --check
```

`PILOT-H-001` bewaakt losstaan van de SPA, de combo-marker en afwezigheid van gewone `/`-links.
`PILOT-H-002` bewaakt directe weekinvoer, weeknavigatie, opslaan, maandindiening en overdracht.
`PILOT-H-003` bewaakt rechtstreeks gemaild → verplichte externe bevestiging → terugdraaien.
`PILOT-H-004` bewaakt upload → Backoffice PDF-controle → goedkeuring.
`PILOT-H-005` bewaakt correctie → opnieuw bewerkbare directe invoer.
`PILOT-H-006` bewaakt maandkeuze tijdens sessie en reset na uitloggen.
`PILOT-N-001/-002` bewaken rolscheiding en mobiel zonder overflow.

Voeg voor fase 2 aparte cases toe voor menurollen, geen oude-UI-navigatie, Herstel per omgeving,
mailstatus per omgeving, verlof/ziektebeslissingstabel, mededelingenbadge en alle weekovergangen.

## Oplevergrens

Werk vanaf `main`, commit/push pas als de vereiste lokale controles groen zijn. Deploy automatisch
tot TEST en stop daar. De gebruiker test vervolgens zelf. Alleen de gebruiker promoveert naar PROD.

