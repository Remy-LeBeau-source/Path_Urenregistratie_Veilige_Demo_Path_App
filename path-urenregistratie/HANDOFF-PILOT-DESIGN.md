# HANDOFF — 1414/1919 pilot-herontwerp

**Evergreen doc. Wordt tijdens het werk telkens bijgewerkt.**
Laatst bijgewerkt: 2026-09-06 — **Fase D increment 1 gecommit als 1.0.65**.

## → VOOR CODEX / de volgende sessie (usage-overdracht)

**Direct oppakken:**
1. Check CI van de laatste push (`gh run list --branch main --limit 1`). Groen =
   Deploy Test + Publish Live Docs. Als rood: los dat eerst op.
2. **Versie omzetten naar `0.0.1`** (gebruiker koos optie A). Losse commit:
   `npm run version:set 0.0.1` (13 plekken) + `BESLISTABEL.md` W10 aanpassen
   (`0.0.x` per commit; echte productieversie later) + controleer dat geen
   test/veiligheidscontrole een versiedrempel hanteert. Daarna teller `0.0.2`, …
3. **Fase D increment 2 — fundament in `assets/styles-new.css`.** Zie
   "Stappenplan" en "Schermen-inventaris" onderaan. Werkwijze: elke regel
   gescoped onder `html[data-skin="new"]`; layout blijft klassiek, alleen palet/
   typografie/vorm/schaduw wisselen. Lokaal eerst de VOLLEDIGE desktop-e2e-suite
   (`node scripts/run-playwright-e2e.mjs --project=desktop-chromium`) — moet in
   beide skins 100% groen; dan pas pushen. Handoff elke increment bijwerken.

**Regels:** alleen LOCAL + TEST, nooit PROD. NL-commits met
`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Versie via
`npm run version:set`. `git add` met expliciete paden, nooit `-A` (Codex/Claude
delen de werktree). `handoff/` (repo-root) is design-levering, untracked laten.

Pilot Fase C = 1.0.63 + 1.0.64. Fase D increment 1 = 1.0.65.

## ⚠️ Onvastgelegd nu in de working tree — Fase D increment 1

**De skin-schakelaar** (`state.preferences.skin` = `"classic"` | `"new"`).
Nog niet gecommit; wacht op de volledige desktop-e2e-suite (draait lokaal).
`npm run check` groen, `test-design-audit` ok (424 cases), 3/3 `SKIN-*` groen.

Gewijzigd:
- `assets/app.js` — `preferences.skin: "classic"` default; `applySkin()` (zet
  `html[data-skin]`); vroege set direct na `loadState()` tegen flits; call in
  de init-sequence en in het opslaan van Voorkeuren; `showPreferences()` krijgt
  een "Vormgeving"-rij (`#pref-skin`, Klassiek/Nieuw).
- `index.html` — `<link rel="stylesheet" href="assets/styles-new.css">` (zonder
  `?v=`, dus buiten `set-version.mjs` om).
- `assets/styles-new.css` — **NIEUW.** Altijd geladen, elke regel gescoped
  onder `html[data-skin="new"]`. Increment 1: leeg (geen visuele wijziging).
- `assets/styles.css` — één regel toegevoegd:
  `.modal-summary > .preference-list { display:grid; grid-template-columns:1fr; }`
  (anders won `.modal-summary > div { display:flex }` op specificiteit en
  vielen de voorkeurenrijen naast elkaar buiten de dialoog).
- `tests/playwright/skin.spec.ts` + `features/skin.feature` — **NIEUW.**
  `[SKIN-H-001/002/003]`: default classic, wisselen naar new + persistentie,
  terug naar classic. Bedienen via de keuzemenu-widget (`#pref-skin-trigger`
  + `[data-standard-choice-target="pref-skin"][data-standard-choice-value=...]`),
  net als `#pref-theme` in `dashboard.spec.ts`.

Zodra de volle suite groen is: `npm run version:set` (1.0.65), NL-commit, push,
CI volgen. Daarna increment 2 = de vormgeving in `styles-new.css` gaan vullen
(tokens/palet/typografie app-breed via `[data-skin="new"]`-overrides).

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
- [ ] `employee-dashboard` — "Mijn overzicht"
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
