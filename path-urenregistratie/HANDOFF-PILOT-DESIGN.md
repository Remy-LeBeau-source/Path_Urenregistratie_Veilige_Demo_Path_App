# HANDOFF — 1414/1919 pilot-herontwerp

**Evergreen doc. Wordt tijdens het werk telkens bijgewerkt.**
Laatst bijgewerkt: 2026-09-06 — **Fase D increment 2 lokaal afgerond voor 0.10.1**.

## → VOOR CODEX / de volgende sessie (usage-overdracht)

**Direct oppakken:**
1. Check CI van de laatste push (`gh run list --branch main --limit 1`). Groen =
   Deploy Test + Publish Live Docs. Als rood: los dat eerst op.
2. ~~Versie omzetten~~ **GEDAAN** — increment 2 staat op **`0.10.1`**, vanaf hier `0.10.x`
   per commit. (`0.0.1` bleek onbruikbaar: `set-version.mjs` verving het óók
   binnen `127.0.0.1` → `127.0.0.2`. Hersteld in `f909632`. `BESLISTABEL.md`
   W10 bijgewerkt; **TODO daar**: `set-version.mjs` hardenen met een
   token-grens.)
3. **Fase D increment 3 — gedeelde shell/componenten.** Sluit eerst topbar,
   zijbalk, knoppen, kaarten, formulieren, tabellen, badges, modals en toasts aan
   op de tokens uit `assets/styles-new.css`. Daarna pas de afzonderlijke
   medewerker- en beheerschermen. Elke regel blijft gescoped onder
   `html[data-skin="new"]`; de klassieke skin blijft exact intact. Draai voor
   iedere push de relevante tests, `npm run check` en de VOLLEDIGE desktop-e2e-
   suite (`node scripts/run-playwright-e2e.mjs --project=desktop-chromium`).

**Regels:** alleen LOCAL + TEST, nooit PROD. NL-commits met
`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Versie via
`npm run version:set`. `git add` met expliciete paden, nooit `-A` (Codex/Claude
delen de werktree). `handoff/` (repo-root) is design-levering, untracked laten.

Pilot Fase C = 1.0.63 + 1.0.64. Fase D increment 1 = 0.10.0.
Fase D increment 2 = 0.10.1.

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
- Klanturenstaat toont de echte status: geen groen vinkje vóór ontvangst. De
  medewerker kan een PDF/JPG/PNG toevoegen of expliciet “reeds per e-mail
  verstuurd” kiezen; beheer ziet en verwerkt vervolgens de correcte status.
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
