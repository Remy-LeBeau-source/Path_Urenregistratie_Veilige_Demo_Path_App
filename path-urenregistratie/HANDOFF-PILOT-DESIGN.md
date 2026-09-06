# HANDOFF — 1414/1919 pilot-herontwerp

**Evergreen doc. Wordt tijdens het werk telkens bijgewerkt.**
Laatst bijgewerkt: 2026-09-06, na Fase B (beheerder-interactie).

## Waar we staan

Twee **statische voorbeeldpagina's** naast de ongewijzigde app op `/`:

| Bestand | Wat |
|---|---|
| `pilot/1919-medewerker.html` + `pilot/1919-medewerker-ui.js` | Medewerkerdashboard, 1:1 na `design-mockups/1414-path-bento-space/medewerker-dashboard.jpg`. Lichte demo-interactie. |
| `pilot/1919-beheerder.html` + `pilot/1919-beheerder-ui.js` | "Path Storyline — Admin", 1:1 na `beheerder-maandoverzicht.jpg`. Lichte demo-interactie. |

Beide: inline CSS, lokaal `@font-face` → `assets/1919/serif.woff2`, CSP-veilig (script-src 'self'; geen inline script, geen externe bronnen). Alle data vast in de `-ui.js`-bestanden, alleen in het geheugen van de tab.

## ⚠️ Onvastgelegde staat

**Er staat een grote onvastgelegde stapel in de working tree** (nog niet gecommit; CI-groen = 1.0.62). Bij hervatten: `git status` + hieronder.

Gewijzigd t.o.v. `main`:
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
- **Fase C — vastleggen** ⏳
  - `tests/playwright/pilot-page.spec.ts` + `features/pilot-page.feature` weer groen zetten. Breekt nu: `[PILOT-H-002]` (7,30→7,50, totaal 30,30→30,50, dropdown weg), `[PILOT-H-006]` (totalen), `[PILOT-H-007]` (maand-dropdown → nu ‹ › knoppen: `.monthpick` is geen button meer, `.monthmenu` bestaat niet). `[PILOT-H-004/005]` beheerder: check of `.emp-row.is-selected`/`.story .card`/`.story-cta button` nog kloppen (JS rendert default = shawn, zou moeten passen).
  - `node scripts/test-design-audit.mjs` (assertion-counts bijwerken), `npm run check`.
  - `npm run version:set <x.y.z>` (1.0.63+), NL-commit(s), push, CI volgen tot **Deploy Test to TransIP + Publish Live Docs** groen.
  - Dan test-URL's aan de gebruiker (`.../pilot/1919-medewerker.html`, `.../pilot/1919-beheerder.html`), nooit PROD.
- **Fase D — look → in de app**: klassiek↔nieuw-schakelaar (`data-skin`), alle menu's per rol nalopen, regressietest per scherm.
- **Fase E — dekkingsronde** op `skin=new` (desktop + iOS + Android + DB). Gebruiker test → gebruiker promoveert PROD.

## Nog open / "later"

- Losse look-punten van de gebruiker per iteratie.
- Getekende avatars: nu initialen. Zodra portret-bestanden in `assets/1919/` staan → `.emp .av` / `.story-head .av` / medewerker-topbar naar `<img>`.

## Regels

- Alleen LOCAL en TEST. Nooit PROD (geen deploy, geen SQL, geen promotie).
- Commits: Nederlands, eindigen met `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Versie via `npm run version:set` (13 plekken), nooit met de hand.
- `git add` altijd met expliciete paden — **nooit `git add -A`** (werktree kan Codex-WIP bevatten).
- Claude beheert `pilot/1919-medewerker.*` en `pilot/1919-beheerder.*`; Codex blijft eraf.
