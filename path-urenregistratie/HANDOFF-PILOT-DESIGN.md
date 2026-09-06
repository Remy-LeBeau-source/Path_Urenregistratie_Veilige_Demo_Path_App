# HANDOFF — 1414/1919 pilot-herontwerp

**Evergreen doc. Wordt tijdens het werk telkens bijgewerkt.**
Laatst bijgewerkt: 2026-09-06 — **overdracht aan Claude na afronding van de
0.10.2-fixes; TEST-pipeline is de volgende gezaghebbende volledige run**.

## → VOOR CLAUDE / direct verdergaan

De releasewijzigingen staan op `main`. Laat het losstaande, untracked
`HANDOFF-CODEX.md` ongemoeid: dat bestand hoort niet in Git.

**Bewezen in de laatste lokale ronde:**

1. De vier fouten uit de eerdere 460-case regressierun zijn opgelost en gericht
   opnieuw groen: `DASH-H-013`, `SKIN-H-002`, `SKIN-H-003` en
   `TS-REV-UI-H-012`. De laatste case bewaart verlof `4` én ziekte `2` na F5.
2. `HELP-H-004` is opnieuw groen: de Hulp & contact-tekst volgt beide standen
   van de beheerdertoggle voor handmatige verlof-/ziekte-invoer.
3. Maandgrenzen zijn zowel in de UI als server-side gesloten. `DASH-H-006` en
   `DASH-H-007` bewijzen huidige maand, geen toekomst en historie alleen vanaf de
   persoonlijke startdatum. `ROLE-N-005` bewijst dat ook directe GET/POST-calls
   voor uren en klanturenstaten buiten die grens `403 period-not-accessible` geven.
4. De beheerder mag de startdatum eerder zetten. `DASH-H-024` bewijst de volledige
   toestandsovergang: een eerder beschikbare maand krijgt uren plus een open
   klanturenstaatactie; een latere startdatum verbergt maand en acties zonder data
   te wissen; terugzetten herstelt waarden, statussen en acties exact.
   `ADM-WR-H-019` bewijst de zichtbare waarschuwing en expliciete tweede write;
   `ADM-WR-H-020` gebruikt de echte server en echte seeded historie voor de
   `409 employment-start-hides-history`-impactberekening.
5. De volledige inhoud van `npm run check` is na de laatste wijzigingen groen:
   433 uitvoerbare én gemapte cases (293 happy, 140 negative), BDD-ontwerp,
   DB-config en alle operationele/deploymentcontracten. Ook `npm run build`,
   `npm run test:db:crud` en `npm run security:deps` zijn groen (0 kwetsbaarheden).
   De volledige lokale
   Playwright-run is niet nogmaals uitgevoerd; de push/TEST-pipeline is daarvoor
   de gezaghebbende eindrun.
6. TEST publiceert de pilotpagina's; de productie-archieven sluiten `pilot/`
   aantoonbaar uit via deployment-contracttests. PROD blijft Classic-only en mag
   uitsluitend na handmatige environment-goedkeuring worden uitgerold.
7. Geef na groen TEST altijd alle drie URL's:
   - `https://uren-test.pathconsultancy.nl/` — echte app, beide rollen;
   - `https://uren-test.pathconsultancy.nl/pilot/1919-medewerker.html`;
   - `https://uren-test.pathconsultancy.nl/pilot/1919-beheerder.html`.
8. Na expliciete TEST-acceptatie: alleen via `npm run version:set 1.0.0`
   verhogen, opnieuw volledig valideren en pushen. De gebruiker keurt daarna
   zelf de beschermde PROD-environment goed. Nooit de eenmalige
   `migrate-test-masterdata-to-production.php` opnieuw draaien.
9. PROD is Classic-only. Nieuw/pilot blijven verborgen/afwezig. Echte mail is
   pas releaseklaar als de live relay/config expliciet actief én door preflight
   en smoke bevestigd is; zet geen secrets in Git en noem alleen TEST-groen
   nooit bewijs dat de externe relay werkelijk verzendt.

**Werkregels:** NL-commits met
`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Versie via
`npm run version:set`. `git add` met expliciete paden, nooit `-A` (Codex/Claude
delen de werktree). `handoff/` (repo-root) is design-levering, untracked laten.

Pilot Fase C = 1.0.63 + 1.0.64. Fase D increment 1 = 0.10.0.
Fase D increment 2 = 0.10.1. Echte medewerkerbento + releasebeveiliging = 0.10.2.

## Wat 0.10.2 toevoegt

- De echte medewerkerroute gebruikt in `skin=new` het 1919-bentodashboard met
  directe weekinvoer, weekwissel, concept opslaan, hele maand indienen, een
  werkdagenmeter zonder fictieve `/160` en een afzonderlijke klanturenstaatkaart.
- De urenhoofdlijn is vier stappen; de klanturenstaat is bewust geen vaste stap
  2 en mag apart oranje openblijven.
- Rechtstreeks gemaild door de medewerker blijft oranje. De nieuwe zichtbare
  Backoffice-taak **Extern bevestigen** maakt hem pas met reden/acteur/tijd groen;
  intrekken heropent de taak. Dit is afgedekt door `INV-H-020`.
- Medewerkers kunnen geen toekomstmaand openen en geen maand vóór de persoonlijke
  startdatum. Een door Beheer opgeslagen eerdere startdatum verruimt die historie;
  een latere datum met bestaande data vereist impactwaarschuwing plus bevestiging
  en verbergt zonder te verwijderen.
- Snelle Licht/Donker- en Klassiek/Nieuw-knoppen zijn herkenbaar en persistent.
  Nieuw is fail-closed verborgen op PROD (`SKIN-N-007`).
- De gedeelde footer toont copyright, Team Path en het actuele versienummer.
- De eerste 1.0.0-PROD-run heeft een eenmalige read-only baselinegate:
  2 beheerders, 5 medewerkers, start 1 september, exacte pilotsinks en lege
  operationele tabellen. Afwijking stopt vóór backup/migratie/cutover. Latere
  releases gebruiken de gewone preflight, zodat echte data niet wordt geblokkeerd.

## Fase D increment 2 — visueel fundament

Lokaal afgerond en klaar om als versie `0.10.1` vast te leggen:

- `assets/styles-new.css`: 1414/1919 licht- en donkerpalet, semantische
  componenttokens, grotere radius/schaduw, lokale `Path Editorial`-serif en
  app-canvas. Alles uitsluitend onder `html[data-skin="new"]`.
- `[SKIN-H-004]`: bewijst dat de nieuwe tokens, radius, achtergrond en serif
  alleen in de nieuwe skin actief zijn en Classic niet lekken.
- Gerichte skin-suite: **4/4 groen**. `npm run check`: **groen**; designaudit
  **425 cases**. Volledige desktop-suite: **365/366 groen**; alleen
  `[TS-REV-UI-H-012]` faalde eenmaal onder de 24-minutenrun doordat ziekte na
  F5 tijdelijk `0` las. Gerichte herhaling direct erna: **1/1 groen**. Dit is
  als timingfluctuatie vastgelegd, niet als geaccepteerde regressie.
- Visuele desktopcontrole op het admin-dashboard uitgevoerd: canvas, contrast,
  lokale serif, navigatie en kaarten renderen coherent; geen horizontale
  overflow waargenomen.

## Waar we staan

Twee **statische voorbeeldpagina's** naast de ongewijzigde app op `/`:

| Bestand | Wat |
|---|---|
| `pilot/1919-medewerker.html` + `pilot/1919-medewerker-ui.js` | Medewerkerdashboard, 1:1 na `design-mockups/1414-path-bento-space/medewerker-dashboard.jpg`. Lichte demo-interactie. |
| `pilot/1919-beheerder.html` + `pilot/1919-beheerder-ui.js` | "Path Storyline — Admin", 1:1 na `beheerder-maandoverzicht.jpg`. Lichte demo-interactie. |

Beide: inline CSS, lokaal `@font-face` → `assets/1919/serif.woff2`, CSP-veilig (script-src 'self'; geen inline script, geen externe bronnen). Alle data vast in de `-ui.js`-bestanden, alleen in het geheugen van de tab.

## Wat er in 1.0.63 + 1.0.64 is geland
- `pilot/1919-medewerker.html` — design-handoff v2 samengevoegd (hero-plaat als gemaskeerde hoek, warmere crème, klanturenstaat opnieuw gekadreerd, donkerder knop) + Claude's interactie: maandpijltjes ‹ ›, dynamische 4-stappenstrip (`.is-done`/`.is-current`, groene lijn + ✓ + gloed), snelkeuze-CSS, Opslaan-knop, `.week li{flex-wrap:wrap}`, vlagtekst "niet alle knoppen zijn actief", mobiel breekpunt 720→**900px** + topbar `flex-order` (overflowfix 390/768).
- `pilot/1919-medewerker-ui.js` — maandkeuze met ‹ › (`buildMonthNav`), weeknavigatie, uren invullen (veld + `−`/`+` 30 min), **snelkeuze `QUICK=['8','9']`**, **Opslaan** (flitst "✓ Opgeslagen"), **klanturenstaat toevoegen**-actie (upload-icoon), `renderSteps` met ✓-icoonwissel, DO week 36 = **7,50** (was 7,30).
- `pilot/1919-beheerder.html` — vlagtekst "knoppen zijn illustratief"; `.emp-row` klikbaar (`data-emp`, `role=button`, `tabindex=0`, hover/focus); maand-`.nav` → `<button class="nav mprev|mnext">`; `.mbox` label in `<span class="mlabel">`; `<script src="1919-beheerder-ui.js">`.
- `pilot/1919-beheerder-ui.js` — **NIEUW.** Rij aanklikken → `.story`-paneel (head + 4 kaarten + evt. CTA) toont dat verhaal; maand ‹ › wisselt `.mbox .mlabel` + footer-filterchip. Data voor 4 medewerkers (shawn/marc/brian/stasjo).
- `pilot/README.md`, `pilot/assets/1919/ASSET-MANIFEST.md` — herschreven (beschreven nog de oude "servergestuurde" pilots).
- **Verwijderd:** `pilot/1919-portal.js`, `pilot/1919-portal.css`, `pilot/1919-medewerker.js` (Codex-restanten), `pilot/assets/1919/hero.jpg`, `document.jpg` (ongebruikt), `HANDOFF-1919-PILOTS-TEST-2026-09-06.md`, `HANDOFF-CLAUDE-COMBO-PILOT-2026-09-06.md`, `HANDOFF-CODEX-REDESIGNS-2026-09-06.md` (stale).
- `handoff/` (repo-root) = design-leveringmap, **untracked, niet committen**.

## Lokaal draaien

`php -S 127.0.0.1:8000 -t path-urenregistratie` → `http://localhost:8000/pilot/1919-medewerker.html` / `1919-beheerder.html`.
Screenshot-scriptje: chromium via `path-urenregistratie/node_modules/@playwright/test` (run vanuit `path-urenregistratie/`).

## Stappenplan

- **Fase A — medewerker afmaken** ✅ (7,50 · maandpijltjes · stappenlijn · Opslaan · snelkeuze 8/9 · klanturenstaat toevoegen · vlag/cursor)
- **Fase B — beheerder lichte interactie** ✅ (rij → verhaalpaneel, maand ‹ ›)
- **Fase C — vastleggen** ✅ 1.0.63 + 1.0.64 gepusht. PILOT-specs 11/11 groen
  (`[PILOT-H-008]` snelkeuze+Opslaan en `[PILOT-H-009]` rij→verhaalpaneel
  toegevoegd), audit ok (421), `npm run check` groen. CI volgen tot
  **Deploy Test to TransIP + Publish Live Docs** groen, dan test-URL's aan de
  gebruiker (`.../pilot/1919-medewerker.html`, `.../pilot/1919-beheerder.html`),
  nooit PROD.
- **Fase D — look → in de app**: klassiek↔nieuw-schakelaar (`data-skin`), alle menu's per rol nalopen, regressietest per scherm.
- **Fase E — dekkingsronde** op `skin=new` (desktop + iOS + Android + DB). Gebruiker test → gebruiker promoveert PROD.

### Functionele acceptatie voor de uiteindelijke nieuwe skin

- Medewerker en beheer blijven op dezelfde bestaande API/database werken; de
  nieuwe skin mag nooit naar een statische pilot of oude/verkeerde pagina
  navigeren.
- De topbar geeft twee directe, persistente schakelaars: Licht/Donker en
  Klassiek/Nieuw. Dezelfde keuzes blijven ook onder Voorkeuren beschikbaar.
- Uren zijn rechtstreeks en snel handmatig invoerbaar, per dag én voor alle
  weken van de gekozen maand; de primaire knop voor week/maand indienen is
  onmiskenbaar.
- `0` uur is een geldige ingevulde waarde en moet visueel te onderscheiden zijn
  van “nog niet ingevuld”. Er wordt geen fictief maandmaximum zoals `160 uur`
  geïntroduceerd wanneer de applicatie dat contract niet kent.
- Maand wisselen gebruikt het bestaande servergedrag en ververst alle relevante
  week-, uren-, status- en klanturenstaatgegevens.
- Verlof/ziekte **uit** bij beheer: medewerker kan dit niet kiezen. **Aan**:
  medewerker kan het snel invoeren zonder een trage popup per dag; opslag en F5-
  persistentie blijven aantoonbaar werken.
- De klanturenstaat is verplicht, maar geen vaste stap 2: urencontrole en — als
  de opdracht dit toestaat — factuur/verzending mogen al afgerond zijn terwijl
  het document later komt. Het dossier blijft dan wel open/oranje.
- De klanturenstaat heeft een eigen statusspoor: verwacht → ontvangen of door de
  medewerker als rechtstreeks gemaild geregistreerd → door Backoffice
  goedgekeurd/extern bevestigd → eventuele brokerroute gecontroleerd. Een
  medewerkerregistratie “rechtstreeks gemaild” blijft oranje en blokkerend; pas
  de aparte beheeractie **Extern bevestigen**, met verplichte reden, acteur en
  tijdstip, maakt het document groen. Dit bevestigen verzendt de factuur niet
  opnieuw.
- Dit statusgat is in 0.10.2 gesloten: `skipped` zonder het serverprefix
  `Extern bevestigd:` staat in `adminOpenTasks()` en `openPeriodSummaries()` als
  zichtbare beheeractie; bevestigen en intrekken blijven beide beschikbaar.
- Proceslijnen zijn statusgedreven: alleen afgeronde stappen en het lijnstuk tot
  de actuele stap zijn groen; toekomststappen blijven neutraal en wacht/actie is
  amber. Animaties visualiseren de echte statuswijziging en respecteren
  `prefers-reduced-motion`.
- Alle huidige beheerfuncties blijven bereikbaar: dashboard, goedkeuringen,
  facturen, mededelingen, medewerkers, instellingen, maanddetail, herstel,
  meldingen, profiel/rol en hulp/contact.
- Na iedere TEST-deploy worden de volledige klikbare TEST-URL's plus concrete
  teststappen aan de gebruiker gegeven. Nooit automatisch naar PROD promoveren.

## Schermen-inventaris voor Fase D (niks vergeten)

Bron: `index.html` nav + `<section class="view">` + het modal-systeem.
Elk scherm moet in `styles-new.css` (of per-view) de nieuwe vormgeving krijgen
én in beide skins door zijn `[*-*]`-cases blijven. Afvinken per scherm.

**Backoffice / admin (`role-admin-only`):**
- [ ] `dashboard` — "Urenoverzicht" (KPI-tegels, wachtrij, maandkiezer)
- [ ] `approvals` — "Goedkeuringen" (uren beoordelen, correctie vragen)
- [ ] `invoices` — "Facturen" (lijst + badges, factuurdetail, finaliseren, PDF,
      klanturenstaat controleren, extern bevestigen)
- [ ] `announcements` — "Mededelingen" (opstellen/versturen)
- [ ] `employees` — "Medewerkers" (lijst, toevoegen/bewerken, uitnodigen)
- [ ] `settings` — "Instellingen" — 6 subsecties: Organisatie · Facturatie ·
      Mailroutes · Teksten · Herinneringen · Veiligheid

**Medewerker (`role-employee-only`):**
- [x] `employee-dashboard` — "Mijn overzicht" (eerste echte 1919-bento; verdere polish na 1.0.0)
- [ ] `timesheet` — "Mijn uren" (week/maand-invoer — vergelijk met de pilot)
- [ ] `employee-announcements` — "Mijn mededelingen"

**Gedeeld / buiten de hoofdnav:**
- [ ] Loginscherm (`#login-screen`, account/rol kiezen)
- [ ] Topbar + zijbalk-nav + merk-header
- [ ] Profielmenu-modals: Mijn profiel · Wachtwoord wijzigen · Voorkeuren ·
      Hulp & contact
- [ ] Modal-systeem (`#modal`) — één opmaak dekt veel workflows:
      goedkeuring-detail, factuurdetail/finalisatie, correctieverzoek,
      klanturenstaat-review, extern bevestigen, medewerker toevoegen/bewerken,
      mededeling opstellen
- [ ] Meldingen-paneel, toasts, hulp-widget, PWA-installatieprompt
- [ ] Mobiel (iOS/Android PWA) — elk bovenstaand scherm op telefoonbreedte

## Nog open / "later"

- Losse look-punten van de gebruiker per iteratie.
- Getekende avatars: nu initialen. Zodra portret-bestanden in `assets/1919/` staan → `.emp .av` / `.story-head .av` / medewerker-topbar naar `<img>`.

## Regels

- Alleen LOCAL en TEST. Nooit PROD (geen deploy, geen SQL, geen promotie).
- Commits: Nederlands, eindigen met `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Versie via `npm run version:set` (13 plekken), nooit met de hand.
- `git add` altijd met expliciete paden — **nooit `git add -A`** (werktree kan Codex-WIP bevatten).
- Claude beheert `pilot/1919-medewerker.*` en `pilot/1919-beheerder.*`; Codex blijft eraf.
