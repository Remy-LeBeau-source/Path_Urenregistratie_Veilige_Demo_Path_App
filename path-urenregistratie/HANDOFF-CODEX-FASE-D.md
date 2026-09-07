# HANDOFF — Codex, Fase D vervolg (herontwerp)

**Voor Codex. Laatst herschreven door Claude Code, 2026-09-07 avond, vanuit
`C:\Path-herontwerp`.** Evergreen doc — bijwerken per increment, niet
laten aangroeien met tegenstrijdige oudere secties (dit is een volledige
herschrijving van de vorige versie, die stukken bevatte die elkaar
tegenspraken na de automatische merge-wachtrij van vanavond).

## 1. Waar je bent

Git-worktree `C:\Path-herontwerp`, vast op branch **`herontwerp`**. Aparte
checkout naast de hoofdmap `C:\Path_Urenregistratie_Veilige_Demo_Path_App`
(vast op `main`, andere chat/sessie — de go-live-lijn). Werk gewoon door in
`C:\Path-herontwerp`; de worktree bestaat al, `npm ci` is al gedraaid.

**Drie machine-lokale, gitignored bestanden** ontbraken hier en zijn door
Claude gekopieerd vanuit de hoofdmap zodat de e2e-runner kan draaien:
`.env.local`, `server/.php-path`, `server/config.local.php`. Staan er al.
Ontbreken ze op een andere machine/worktree: kopieer opnieuw, of zet ze op
volgens `dev-environment-this-machine`-memory (native MySQL 8.0.40 op
127.0.0.1:3306, root/root, db `path_urenregistratie_test`, PHP 8.4 via
winget).

## 2. Wat dit werk is

Fase D = een tweede vormgeving ("nieuw", 1414 Bento × 1919 Storyline) naast
de bestaande ("klassiek"), omschakelbaar via Voorkeuren → Vormgeving
(`state.preferences.skin`, toegepast door `applySkin()` in `assets/app.js`,
zet `html[data-skin]`). Kern zit in **`assets/styles-new.css`**, elke regel
gescoped onder `html[data-skin="new"]`. Classic (het bestaande uiterlijk) mag
niet veranderen door skin-werk. Op PROD is `skin=new` fail-closed verborgen
(`[SKIN-N-007]`) — die guard niet aanraken.

Functionele pilotbediening (zoals de admin-verhaallijn/topnav die vanavond is
toegevoegd) mag wél gedeelde HTML/JavaScript gebruiken, zolang **beide skins
en beide rollen aantoonbaar blijven werken** en er geen nieuwe naamsbotsingen
ontstaan met bestaande selectors (zie §5 — dat ging vanavond mis en is
gefixt).

De schermen-inventaris (increment 1–11) is **compleet**: login, mededelingen,
goedkeuringen, mijn uren, facturen, medewerkers, instellingen, modals,
mobiel — allemaal op het fundament aangesloten. Zie `HANDOFF-PILOT-DESIGN.md`
§3–4 voor de volledige geschiedenis per increment.

## 3. De automatische merge-wachtrij naar `main` (nieuw, vanavond, LIVE)

Er staat een GitHub Actions-workflow op `main`:
`.github/workflows/pilot-merge-queue.yml` (gemerged via PR #41). Die doet
voortaan zelf wat vroeger een bewuste handmatige merge was:

1. Draait bij elke afronding van de `CI`-workflow op `herontwerp`.
2. Gaat alleen verder als die CI-run **groen** eindigde.
3. Controleert of `herontwerp` de actuele `main` al bevat (dezelfde check als
   `ci.yml` zelf ook doet bij elke push). Zo niet: geen merge, alleen een
   waarschuwing — dan moet eerst iemand `main` in `herontwerp` opnemen.
4. Zo ja: wacht (poll elke 60s, max 3 uur) tot `main` geen actieve Release
   Pipeline-run meer heeft — **rood of groen bij afronding maakt niet uit**,
   alleen de status (actief/klaar) telt.
5. Fast-forwardt `main` naar die groene `herontwerp`-commit zodra `main` vrij
   is. Dat triggert de gewone Release Pipeline → TEST-deploy.

**Wat dit niet doet:** PROD promoten. Die stap blijft achter de handmatige
GitHub-environment-reviewerpoort op `prod`, altijd, ongeacht deze workflow.

**Wat dit betekent voor jou:** je hoeft `herontwerp` → `main` niet meer zelf
te pushen of te mergen zodra je CI groen staat — dat gebeurt vanzelf. **Jij
hoeft dus ook nooit zelf naar `main` te pushen of daar iets op te mergen**;
laat dat aan de workflow (of, voor iets wat de workflow niet dekt, aan de
gebruiker) over. De enige voorwaarde die mensen-/agentwerk blijft: als
`herontwerp` achter raakt op `main` (bv. na een hotfix rechtstreeks op main),
moet iemand `main` eerst weer in `herontwerp` mergen — de precheck in stap 3
hierboven blokkeert anders elke verdere doorstroom, stil, met alleen een
`::warning::` in de CI-log.

## 4. Actuele stand bij deze overdracht

- `herontwerp` HEAD: `3662543` ("docs: handoff bijgewerkt met selector-fix en
  openstaande functionele bug").
- Laatste inhoudelijke commits: `6e763b4` ("beveilig indienen en bouw
  beheerstoryline" — groot, 980 regels, voegde de admin-topnav/verhaallijn
  toe) → `cf3da25` (Claude, selector-fix, zie §5) → `3662543` (dit doc).
- Versie: `1.0.9` (package.json). Geen aparte `0.11.x`-lijn gestart op deze
  branch; laat het nummer met rust tot een release-beslissing, of overleg met
  de gebruiker.
- **CI-status op dit moment: rood.** Zie §5 — 18 tests falen nog, dat is de
  eerste taak hieronder.

## 5. EERSTE TAAK: de 18 openstaande testfouten oplossen

`herontwerp`-CI op `6e763b4` faalde breed: 3 van de 4 shards rood, verspreid
over facturatie/autorisatie/documentflows/employees/settings. Claude heeft één
deel van de oorzaak gevonden en gefixt (commit `cf3da25`); een ander deel is
een echte functionele regressie die **jij** moet oplossen, want jij hebt de
onderliggende logica geschreven.

**Al gefixt (`cf3da25`) — de selector-botsing:**
`.new-admin-topnav` (pilot-topbar) en `.new-admin-storyline`
(beheerverhaallijn), beide toegevoegd in `6e763b4`, hertekenden dezelfde
`data-view`/actie-attributen (`data-view="employees"`, `data-review-
customer-timesheet`, `data-admin-hours-detail`, `data-go`, ...) als de echte
sidebar-navigatie en werkvoorraadkaarten. `display:none` verbergt ze visueel,
maar de elementen bestonden wél in de DOM — ook in Classic. Elke bestaande
Playwright-`[data-view="..."]`-locator werd daardoor dubbelzinnig
(strict-mode violation) of klikte het verkeerde, onzichtbare element. Fix:
de pilot-topnav gebruikt nu `data-pilot-view` i.p.v. `data-view` (de
generieke navigatieklik in `app.js` luistert naar beide, gedrag ongewijzigd);
`renderNewAdminStoryline()` vult zijn containers alleen nog als `skin=new`
actief is. Bevestigd weg: de employees/settings-strict-mode-fouten en heel
`user-management.spec.ts`.

**Nog open — dit is voor jou, geen selector-issue meer:**
na de selector-fix faalden bij een volledige hertest (`node
scripts/run-playwright-e2e.mjs --project=desktop-chromium`, lokaal, 360
passed / 18 failed) nog:

- `E2E-N-019` — duidelijkste foutmelding, begin hier:
  ```
  Error: de urenstaat hoort goedgekeurd te zijn
  Expected: "approved"   Received: "correction"
  ```
  Dit wijst op een gedragswijziging in de "beveilig indienen"-logica die je
  in `6e763b4` aan `app.js` hebt toegevoegd (257 regels): een urenstaat komt
  op `correction` te staan waar de bestaande keten `approved` verwacht.
- `E2E-N-020` (autorisatie), `E2E-N-018` (documentlinks), `E2E-H-003`
  (herindiening), `E2E-H-017`/`E2E-H-019` (statusketen/idempotentie),
  `E2E-H-023`/`024`/`025`/`026`/`027` (mail/facturen), `E2E-N-017`/`021`
  (lock/deactivatie), `DASH-N-010`/`DASH-H-008` (F5-herstel/GUI-closeout),
  `SKIN-H-008` (navigatie in skin=new), `TS-REV-UI-H-008` (browserflow).

Draai de suite opnieuw om de actuele lijst te zien — die kan intussen
verschoven zijn. Zolang deze cases rood staan, fast-forwardt de wachtrij uit
§3 `main` niet: precies zoals bedoeld. Pas als `herontwerp`'s CI hier weer
100% groen is, stroomt dit vanzelf door.

## 6. Wat daarna rest (fijnslijpen, na §5)

1. **Handmatige mobiele doorloop** op een echt toestel (iOS + Android PWA)
   van elk scherm in `skin=new`. Kan niet door een agent alleen — vraag de
   gebruiker om mee te testen of terugkoppeling te geven.
2. **Verdere fijnslijping per scherm** waar de 1414/1919-mockups
   (`design-mockups/1414-path-bento-space/*.jpg`) dat nog vragen. Voorbeelden,
   geen uitputtende lijst: factuurdetail-modal + PDF-preview, week/maand-
   layout van "Mijn uren", lijst-polish in Goedkeuringen, per-subsectie
   fijnslijpen in Instellingen.
3. Zodra de gebruiker het herontwerp op TEST accepteert: PROD-toggle vrijgeven
   is een **aparte, bewuste wijziging** van de gebruiker — dat doe jij niet
   zelf, en de wachtrij uit §3 raakt die guard nooit aan.

## 7. Werkregels (verplicht)

1. Werk op **`herontwerp`**. Push/merge nooit zelf naar `main` (zie §3 —
   dat hoort nu bij de workflow) en nooit `Promote Prod`.
2. Skin-werk (uiterlijk) blijft in `assets/styles-new.css`, gescoped onder
   `html[data-skin="new"]`. Functionele/gedeelde wijzigingen (zoals §5) mogen
   in `app.js`/`index.html`, maar controleer expliciet op naamsbotsing met
   bestaande `data-*`-attributen en selectors voordat je iets toevoegt dat in
   de DOM blijft staan (ook als het `display:none` is).
3. Lokaal verifiëren: `php -S 127.0.0.1:8000 -t path-urenregistratie`, bekijk
   met `skin=new` (Voorkeuren → Vormgeving of `localStorage`). Draai
   `npm run check` + relevante specs; vóór een grotere wijziging de volledige
   suite (`node scripts/run-playwright-e2e.mjs --project=desktop-chromium`)
   in **beide** skins 100% groen.
4. NL-commit, eindig met
   `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` (harnas-eis van
   de huidige sessie-instructies, overschrijft een oudere "geen trailer"-
   afspraak).
5. `git add` met **expliciete paden**, **nooit** `-A`.
6. `git push origin herontwerp` na elke increment.
7. Werk dit bestand en/of `HANDOFF-PILOT-DESIGN.md` bij per increment.
8. Versie via `npm run version:set` — nooit met de hand (13 plekken).
9. **Pilot-bestandseigendom**: `pilot/1919-medewerker.*` en
   `pilot/1919-beheerder.*` zijn van Claude — daar niet aankomen. Dit handoff
   gaat over de in-app skin, niet de losse pilotpagina's.

## 8. Valkuilen

- `set-version.mjs` is een kale string-replace — kies geen versie die
  substring is van een IP/getal (`0.0.1` botste met `127.0.0.1`).
- Windows/Bash: CWD kan tussen tool-calls terugvallen naar de repo-root —
  gebruik bij twijfel het absolute pad
  `cd /c/Path-herontwerp/path-urenregistratie && ...`.
- Poort 8000 vrij maken: `taskkill //F //IM php.exe`.
- `--grep "A|B"` breekt op de shell-pipe onder Windows; geef bij voorkeur
  losse spec-bestandspaden mee in plaats van een grep-regex.
- `<select>` in een modal wordt opgewaardeerd naar een keuzemenu-widget
  (`initializeStandardChoiceMenus`) — bedien via `#<id>-trigger` +
  `[data-standard-choice-*]`.
- Geen harde time-outs op transiënte UI-meldingen; toets de blijvende
  uitkomst.
- `skin=new` op PROD moet fail-closed verborgen blijven (`SKIN-N-007`) —
  die guard niet aanraken.
- **Nieuw uit vanavond:** voeg nooit een element toe met een bestaand
  `data-*`-attribuut/waarde-combinatie (zoals `data-view="employees"`) tenzij
  het er functioneel exact hetzelfde element voor moet zijn. `display:none`
  maakt een element onzichtbaar, niet onvindbaar voor een generieke
  Playwright-locator — dat brak vanavond in één klap tientallen ongerelateerde
  tests.

## 9. Als je vastloopt

`git fetch && git checkout herontwerp` (of werk gewoon door in
`C:\Path-herontwerp`, die staat er al op), lees `HANDOFF-PILOT-DESIGN.md`
vanaf het begin, dan dit bestand, dan §5 hierboven als eerste actie.
