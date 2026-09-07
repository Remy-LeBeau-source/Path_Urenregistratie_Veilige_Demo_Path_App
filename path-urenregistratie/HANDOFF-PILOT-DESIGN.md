# HANDOFF — 1414/1919 herontwerp

**Evergreen doc. Wordt tijdens het werk telkens bijgewerkt.**
Laatst bijgewerkt: 2026-09-07 — **overdracht aan Codex.** Release `1.0.0` staat
groen op TEST (Promote Prod wacht op de gebruiker). Fase D loopt op branch
`herontwerp` t/m increment 6 (`6ff56b5`).

## → EERSTE TAAK VOOR CODEX

`git fetch && git checkout herontwerp`. Increments **3, 4, 5 en 6** (login,
Mededelingen, Goedkeuringen-proceslijn, Mijn uren-urentabel) zijn gecommit maar
de **volledige regressie is er nog niet overheen geweest** — de laatste
`npm run check` liep nog toen de sessie eindigde. Doe daarom eerst:
`npm run check` + `node scripts/run-playwright-e2e.mjs --project=desktop-chromium`
(volledig, beide skins moeten 100% groen). Alle vier increments zijn puur
additieve CSS in `assets/styles-new.css` gescoped onder `html[data-skin="new"]`
— Classic kan er niet door raken — maar bevestig het. Pas daarna verder met de
schermen-inventaris.

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

**`main` blijft met rust.** Geen Fase D-werk op `main`. Alleen een echte,
bewuste hotfix hoort daar nog thuis, en dan als aparte `1.0.x`.

### 2. Fase D gaat verder op branch `herontwerp`

- Branch `herontwerp` is afgetakt van `1.0.0` (`fb2d712`).
- HEAD `herontwerp` = `ccad481` "loginscherm op de nieuwe tokens
  (Fase D increment 3)".
- **Alles wat je in `herontwerp` doet raakt `main`/PROD niet.** Een push van
  `herontwerp` start géén Release Pipeline (die is `main`-getriggerd). PROD
  blijft bevroren op `1.0.0` tot de gebruiker een expliciete merge +
  promote doet.
- Als het herontwerp af en geaccepteerd is: één bewuste merge
  `herontwerp` → `main` = de `1.1.0`-release, en dat is weer een aparte
  promote-beslissing van de gebruiker.

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
  uurwaarden in de serif, groene focus, zachtere lijnen/kopcel. **Nog niet
  volledig geverifieerd** (zie EERSTE TAAK).

### 4. Wat er nog moet (schermen-inventaris)

Elk scherm in `skin=new` op het fundament aansluiten + in **beide** skins
door de eigen `[*-*]`-cases blijven. Volgorde-suggestie:

- [x] `employee-dashboard` — "Mijn overzicht" (bento; verdere polish kan)
- [x] Loginscherm
- [x] `announcements` + `employee-announcements` — "Mededelingen" / "Mijn mededelingen"
- [x] `approvals` — "Goedkeuringen" (4-fasen-proceslijn; verdere lijst-polish kan)
- [x] `timesheet` — "Mijn uren" (urentabel op tokens; week/maand-layout-polish kan)
- [ ] `invoices` — "Facturen" (lijst + badges, factuurdetail, finaliseren,
      PDF, klanturenstaat controleren, extern bevestigen)
- [ ] `employees` — "Medewerkers" (grotendeels al gedekt door de gedeelde
      `.panel`/`.employee-card`-tokens; alleen serif-kop + `--shadow` resteren)
- [ ] `settings` — "Instellingen" (6 subsecties: Organisatie · Facturatie ·
      Mailroutes · Teksten · Herinneringen · Veiligheid)
- [ ] Modal-detailschermen (goedkeuring-detail, factuurdetail, correctie,
      klanturenstaat-review, extern bevestigen, medewerker toevoegen/bewerken)
- [ ] Mobiel (iOS/Android PWA) — elk bovenstaand scherm op telefoonbreedte

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
5. NL-commit, eindig met
   `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
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
