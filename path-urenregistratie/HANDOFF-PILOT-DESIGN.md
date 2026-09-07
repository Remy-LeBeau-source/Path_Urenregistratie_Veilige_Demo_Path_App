# HANDOFF — 1414/1919 herontwerp

**Evergreen doc. Wordt tijdens het werk telkens bijgewerkt.**
Laatst bijgewerkt: 2026-09-07 — **status.** Twee vaste branches: `main`
(go-live) en `herontwerp` (deze — Fase D). Er is een **git worktree**:
`C:\Path-herontwerp` = deze branch, `C:\Path_Urenregistratie_Veilige_Demo_Path_App`
blijft op `main`. Werk aan de pilot in de worktree-map; `npm ci` is daar al
gedraaid. Eén chat per baan (go-live vs pilot). Wie stopt: commit + push + dit
doc bijwerken. Worktree weghalen: `git worktree remove ../Path-herontwerp`.
Release `1.0.1`–`1.0.9` staan op `main` (kruisje- en PWA-fixes,
PROD-normalisatiescript en zelf-normaliserende cutover). `herontwerp` heeft de
actuele main-kop `ac7ca6c`
op 7 september zonder conflict opgenomen. **De schermen-inventaris in §4 is compleet
(increment 1–11).**

**Controle en uitrolafspraak 2026-09-07.** De volledige desktopset is lokaal
serieel bevestigd: **375/375 groen**. De mobiele Playwright-set is eveneens
volledig groen: **Android/Chrome 45/45** en **iPhone/WebKit 45/45**; een eenmalige
laad-time-out is afzonderlijk groen herhaald. `npm run build` en `npm run check`
zijn groen. GitHub CI-run `34118945695` op `18bff33` is volledig groen.
De pilot-CI is vanaf de volgende push vierdelig gesharded en controleert eerst
dat de actuele `main` in `herontwerp` zit. De main-release toont voortaan het
niet-blokkerende blok `Inspect pilot branch` met de onderlinge commitstand.
Na groen op de met actuele main gecombineerde branch mag `herontwerp` bewust
naar `main` worden gemerged zodat de
gecombineerde app op `https://uren-test.pathconsultancy.nl/` kan worden getest.
PROD blijft daarbij fail-closed op Klassiek en zonder `pilot/`; de PROD-toggle
wordt pas na acceptatie als afzonderlijke wijziging vrijgegeven, standaard op
Klassiek. De GitHub-environment `prod` heeft verplichte reviewergoedkeuring.

## → WAT ER NOG MOET (Fase D)

1. **Gecombineerde branch na main-sync bevestigen** — de pilotbasis is lokaal
   volledig groen (desktop 375/375, Android 45/45, iPhone/WebKit 45/45). Draai
   na iedere nieuwe main-sync build/check, gerichte skin- en mobiele regressie
   en laat de volledige GitHub-CI groen worden voordat terug naar main wordt
   gemerged.
2. **Handmatige mobiele doorloop** op een echt toestel (iOS + Android PWA) van
   elk scherm in `skin=new`.
3. Verdere fijnslijping per scherm waar de mockups dat vragen (blijft additief,
   blijft gescoped, blijft beide skins groen, NL-commit, dit doc bijwerken).
4. Na volledig groene lokale controles: één bewuste merge `herontwerp` →
   `main`, zodat beide skins op dezelfde TEST-URL kunnen worden geaccepteerd.
   De PROD-toggle blijft tot die acceptatie geblokkeerd; vrijgave daarvan is
   een aparte wijziging en promote-beslissing van de gebruiker.

**Mocht Claude wegvallen:** `git fetch && git checkout herontwerp`, dan stap 1
hierboven, daarna de rest van deze lijst.

**2026-09-07 — uitvoering door Codex.** De volledige lokale regressie is
afgerond: desktop 375/375, Android 45/45 en iPhone/WebKit 45/45 groen. Daarna is
main-kop `c37fd23` zonder conflict in `herontwerp` opgenomen en door CI-run
`34126046882` groen bevestigd. Main verschoof tijdens die run met een PWA-fix;
de herstelde kop `ac7ca6c` is daarna eveneens zonder conflict opgenomen.
Daarop zijn `DASH-N-010`, `DASH-N-026`, `MOB-H-024` en alle negen
`SKIN-*`-cases groen; `SKIN-H-008/009` bewaken expliciet de functionele
gelijkheid van Klassiek en Nieuw voor Backoffice en medewerker. Volgende poort
is groene GitHub-CI en de bewuste merge naar main voor TEST.

**2026-09-07 avond — automatische merge-wachtrij naar `main` (Claude Code).**
Nieuwe workflow `.github/workflows/pilot-merge-queue.yml`: zodra `herontwerp`'s
eigen `CI` groen is én `herontwerp` de actuele `main` al bevat, wacht hij tot
`main` géén actieve Release Pipeline-run meer heeft (rood of groen bij
afronding maakt niet uit, alleen de status telt) en fast-forwardt `main` dan
zelf naar die groene commit. Geen "bewuste merge" van een mens meer nodig voor
de TEST-integratie zelf — wél blijft het main-in-herontwerp-syncmoment
mensen-/agentwerk zodra `herontwerp` achterloopt. PROD blijft ongemoeid, altijd
achter de handmatige reviewerpoort. **Moet nog geactiveerd worden:** het
bestand staat op een losse branch in PR
[#41](https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/pull/41)
— pas na het mergen daarvan (door de gebruiker; agents kunnen niet naar `main`
pushen/mergen) draait de wachtrij echt. Vlak na het bouwen bleek
`herontwerp`-CI op `6e763b4` trouwens echt rood (e2e-regressies rond
facturatie/autorisatie) — precies zo'n commit zou dus terecht niet zijn
doorgestroomd. Zie `HANDOFF-CODEX-FASE-D.md` §0a en `../COPILOT_HANDOFF.md`
voor het volledige verhaal.

## → VOOR CODEX / de volgende sessie

### 1. Releasestand (`main`)

- `main` HEAD = `fb2d712` "release: versie 1.0.0 — eerste productierelease".
- CI van `1.0.0` is **groen op TEST**: Validate ×4, Promote Test ×4,
  Deploy Test to TransIP → allemaal success. De job **Promote Prod** staat
  op `waiting` (de handmatige gate).
- **Alleen de gebruiker drukt op Promote Prod.** Nooit door een agent.
  Daarna: environment-goedkeuring → eenmalige read-only baseline-gate
  (2 beheerders, 5 medewerkers, start 1 sep, lege operationele tabellen) →
  cutover. Stopt de gate met een melding: niks forceren, melden.
- `skin=new` is fail-closed verborgen op PROD (`SKIN-N-007`). PROD is
  Classic-only. De `pilot/`-map is aantoonbaar uit het PROD-archief
  uitgesloten (deployment-contracttest).
- TEST-URL's (na groen altijd geven): `https://uren-test.pathconsultancy.nl/`
  (echte app, beide rollen), `.../pilot/1919-medewerker.html`,
  `.../pilot/1919-beheerder.html`.

**`main` blijft met rust tot de lokale poorten groen zijn.** Daarna mag de
gecontroleerde Fase D-merge naar `main` om de volledige app via de bestaande
releasepipeline op TEST te zetten. Los werk blijft eerst op de eigen branch;
`herontwerp` haalt nieuwe `main`-wijzigingen binnen vóór een volgende merge.

### 2. Fase D gaat verder op branch `herontwerp`

- Branch `herontwerp` is afgetakt van `1.0.0` (`fb2d712`).
- HEAD `herontwerp` = `ccad481` "loginscherm op de nieuwe tokens
  (Fase D increment 3)".
- **Alles wat je in `herontwerp` doet raakt `main`/PROD niet.** Een push van
  `herontwerp` start géén Release Pipeline (die is `main`-getriggerd). PROD
  blijft bevroren op `1.0.0` tot de gebruiker een expliciete merge +
  promote doet.
- Na volledig groene lokale controles: één bewuste merge `herontwerp` →
  `main` voor acceptatie van beide skins op TEST. PROD blijft dan Classic-only;
  de toggle op PROD wordt pas na acceptatie apart vrijgegeven.

### 3. Waar Fase D staat

`assets/styles-new.css` — alles gescoped onder `html[data-skin="new"]`,
Classic blijft exact intact. Al gedaan:

- **Increment 1** (`0.10.0`): de vormgevingsschakelaar (Voorkeuren →
  Vormgeving; `state.preferences.skin`; `applySkin()` zet `html[data-skin]`).
- **Increment 2** (`0.10.1`/`0.10.2`): visueel fundament — 1414/1919 licht-
  en donkerpalet, semantische componenttokens, `Path Editorial`-serif voor
  koppen, app-canvas; gedeelde componenten aangesloten (topbar, zijbalk,
  nav, knoppen, kaarten/panelen, formulieren, tabellen, modal, toast,
  footer). Plus de echte medewerker-bento (`#view-employee-dashboard`) en
  de directe topbar-schakelaars `#quick-theme-toggle` / `#quick-skin-toggle`.
- **Increment 3** (`herontwerp` `ccad481`): loginscherm op de tokens.
  `[SKIN-*]` 7/7 groen, `npm run check` groen.
- **Increment 4** (`herontwerp` `f86b59d`): Mededelingen (admin + medewerker) —
  lijst als kaartenstapel, koppen op de serif, "ingetrokken" als zachte ring
  i.p.v. balk links. `npm run check` groen.
- **Increment 5** (`herontwerp` `79f591a`): Goedkeuringen — de 4-fasen-track
  (`.workflow-step`/`.workflow-line`) als doorlopende groene lijn met gloed op
  afgeronde/huidige stap, zoals de pilot. `npm run check` groen.
- **Increment 6** (`herontwerp` `6ff56b5`): Mijn uren — `.hours-table`
  uurwaarden in de serif, groene focus, zachtere lijnen/kopcel. `npm run check`
  groen (taak `b3f6fuqdk`, exit 0). Volledige desktop-e2e over 3–6 nog te doen
  (zie EERSTE TAAK).
- **Increment 7** (`herontwerp` `32cac1a`): Facturen — `.invoice-month-overview`
  als crème-paneel met groene rail, `.invoice-status-guide`-kaarten met groene
  ring op actief/huidig, nummerbadge in het groen, `.status-pill` met hairline
  (kleur blijft semantisch), zoekveld + segmentschakelaar op de tokens,
  `.invoice-identity-preview` als crème-groen blok met serif-bedrijfsnaam.
  `[SKIN-*]` 7/7 groen lokaal.
- **Increment 8** (`herontwerp` `20f6118`): Medewerkers/Teambeheer —
  `.employee-card` op crème + `--shadow`, naam in de serif, `.employee-details`-
  tegels met hairline, `.mini-avatar` als ronde tegel in `--mint-dark-tekst`,
  `.team-account-overview`-kop serif, `.team-account-group` op de tokens.
  `[SKIN-*]` 7/7 groen lokaal.
- **Increment 9** (`herontwerp` `afa8de0`): Instellingen — `.settings-section-nav`
  -knoppen met groene focus/hover-ring, `.reminder-rule` + `.reminder-choice-
  trigger` + `.reminder-choice-panel` op de tokens met groene focus,
  `.template-item` en `.mail-recipient-setting`/`.mail-route-choice` met zachtere
  radius/lijn. `[SKIN-*]` 7/7 groen lokaal.
- **Increment 10** (`herontwerp` `3f2322d`): Modal-detailschermen —
  `.modal-summary` met hairline + zachtere radius, `.correction-banner` op
  tokengrenzen i.p.v. harde hex, `.correction-banner-icon` ronde tegel. De
  dialoog zelf stond al op het fundament. `[SKIN-*]` + `[A11Y-*]` 12/12 groen
  lokaal.
- **Increment 11** (`herontwerp`): Mobiel — `@media (max-width: 720px)`-blok
  onder `html[data-skin="new"]`: de zware bureaubladschaduw en de ruime radius
  op panelen/kaarten worden op telefoonbreedte lichter/strakker, `.announcement-
  item`-padding en `.hours-table input`-grootte iets kleiner. De token-restyling
  van 3–10 loopt zelf al op elke breedte door. `[SKIN-*]` 7/7 groen lokaal.

### 4. Wat er nog moet (schermen-inventaris)

Elk scherm in `skin=new` op het fundament aansluiten + in **beide** skins
door de eigen `[*-*]`-cases blijven. Volgorde-suggestie:

- [x] `employee-dashboard` — "Mijn overzicht" (bento; verdere polish kan)
- [x] Loginscherm
- [x] `announcements` + `employee-announcements` — "Mededelingen" / "Mijn mededelingen"
- [x] `approvals` — "Goedkeuringen" (4-fasen-proceslijn; verdere lijst-polish kan)
- [x] `timesheet` — "Mijn uren" (urentabel op tokens; week/maand-layout-polish kan)
- [x] `invoices` — "Facturen" (maandkaart, statuswegwijzer, chips, zoekbalk,
      identiteitspreview op de tokens; factuurdetail-modal + PDF-preview kunnen
      nog polish gebruiken)
- [x] `employees` — "Medewerkers" (kaarten op crème + `--shadow`, serif-namen,
      ronde avatartegels, accountoverzicht-strook op de tokens)
- [x] `settings` — "Instellingen" (onderdelennavigatie, herinneringsregels,
      keuzemenu's, sjabloon- en mailroute-rijen op de tokens; per-subsectie
      fijnslijpen kan nog)
- [x] Modal-detailschermen (`.modal-summary` + `.correction-banner` op de
      tokens; dialoog-shell al gedekt in increment 2)
- [x] Mobiel (iOS/Android PWA) — telefoon-`@media`-blok voor de nieuwe skin;
      handmatige doorloop op een echt toestel is nog aan te raden

**De schermen-inventaris is compleet.** Volgende stap: de volledige
desktop-e2e over increment 3–11 in beide skins (zie EERSTE TAAK), een
handmatige mobiele doorloop, en dan de bewuste merge `herontwerp` → `main`
= `1.1.0` (beslissing van de gebruiker).

### 5. Werkwijze per increment

1. Werk op **`herontwerp`**, niet `main`.
2. Wijzig alleen `assets/styles-new.css` (of voeg per-view een blok toe),
   altijd onder `html[data-skin="new"]`.
3. Lokaal: `php -S 127.0.0.1:8000 -t path-urenregistratie` + bekijk met
   `skin=new` (Voorkeuren → Vormgeving, of `localStorage`), en draai
   `npm run check` + de relevante specs. Vóór een grotere increment de
   volledige suite:
   `node scripts/run-playwright-e2e.mjs --project=desktop-chromium`
   — moet in **beide** skins 100% groen.
4. Versie via `npm run version:set`. Op `herontwerp` een eigen `0.11.x`-lijn
   of het nummer met rust laten tot de merge — spreek dit met de gebruiker af.
5. Gebruik een korte Nederlandse commitboodschap zonder `Co-Authored-By`-trailer.
6. `git add` met **expliciete paden**, nooit `-A`.
7. Werk dit doc bij per increment.
8. `handoff/` (repo-root) = design-levering, untracked laten. De losse
   `path-urenregistratie/HANDOFF-CODEX.md` (untracked) mag weg.

### 6. Valkuilen

- **`set-version.mjs`** doet een kale string-replace. `0.0.1` botste met
  `127.0.0.1`. Kies nooit een versie die substring is van een IP/getal.
  TODO in `BESLISTABEL.md` W10: hardenen met een token-grens.
- **Windows/Bash:** CWD valt terug naar de repo-root tussen tool-calls —
  prefix met
  `cd /c/Path_Urenregistratie_Veilige_Demo_Path_App/path-urenregistratie &&`.
  Poort 8000 vrij: `taskkill //F //IM php.exe`. `--grep "A|B"` breekt op de
  shell-pipe.
- **`<select>` in een modal** wordt opgewaardeerd naar een keuzemenu-widget
  (`initializeStandardChoiceMenus`); de native select is dan `hidden`.
  Bedien 'm via `#<id>-trigger` + `[data-standard-choice-*]`-knoppen.
- **Transient UI in tests:** assert geen kort zichtbare melding met een
  harde time-out; toets de blijvende uitkomst.
- **`skin=new` op PROD:** moet verborgen blijven (`SKIN-N-007`). Raak die
  fail-closed niet aan.

## Pilotpagina's (`pilot/1919-*`)

Statische 1-op-1 reproducties van `design-mockups/1414-path-bento-space/*.jpg`,
naast de app op `/`. CSP-veilig. Interactielaag: `1919-medewerker-ui.js`
(maandkeuze ‹ ›, weeknavigatie, uren invullen, snelkeuze 8/9, Opslaan,
klanturenstaat toevoegen, dynamische 4-stappenstrip) en
`1919-beheerder-ui.js` (rij → verhaalpaneel, maand ‹ ›). Regressie:
`tests/playwright/pilot-page.spec.ts` + `features/pilot-page.feature`
(`PILOT-H-001..009`, `PILOT-N-001..002`).

## Versiegeschiedenis

Pilot Fase C = 1.0.63/1.0.64. Fase D increment 1 = 0.10.0. Increment 2 =
0.10.1/0.10.2. **Release = 1.0.0 (`fb2d712`, groen op TEST, wacht op
Promote Prod).** Fase D increment 3 (login) = branch `herontwerp` `ccad481`.
