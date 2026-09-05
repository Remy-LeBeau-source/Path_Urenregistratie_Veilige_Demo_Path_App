# Opdracht: 1919 Path Storyline — medewerker-dashboard als pilotpagina

## Doel
Bouw een **losstaande statische pilotpagina** die richting **1919 Path Storyline**
(medewerker-dashboard) zo getrouw mogelijk nabouwt t.o.v.
`design-mockups/1919-medewerkers/01-1919-medewerker-storyline-overzicht.jpg`.

Er ligt al een eerste versie: `path-urenregistratie/pilot/1919-medewerker.html`.
Uitbreiden/vervangen mag; de opzet en de constraints hieronder moeten blijven.

## Wat "1:1" hier betekent (eerlijk)
Een live, responsieve pagina wordt nooit pixel-identiek aan een vaste
1536px-mockup-plaat: echte data, herschikking op andere breedtes, meerdere
toestanden, fontrendering per OS. Streef naar **getrouw**: identieke layout,
kleuren (pipetteer uit de JPG), typografische hiërarchie, componenten, witruimte
en teksten. De twee foto-vlakken worden 1:1 zodra de echte beeldbestanden
aangeleverd zijn (zie "Beeld & font").

## Harde constraints (niet overtreden)

1. **Raakt de app niet.** Geen wijziging aan / import van
   `path-urenregistratie/index.html`, `assets/`, `server/`, `manifest.php`,
   `sw.js`. De pilot deelt geen CSS/JS/data/routing met de app. De app op `/`
   moet volledig werkend en klikbaar blijven.
2. **CSP op TEST** (`path-urenregistratie/.htaccess`):
   `script-src 'self'` → **geen inline `<script>`**, alleen same-origin `.js`.
   `style-src 'self' 'unsafe-inline'` → inline `<style>` mag, **geen externe stylesheet** (dus geen Google Fonts `<link>`).
   `font-src 'self' data:` → fonts alleen als same-origin bestand (`@font-face` naar een `.woff2` in de pilotmap) of data:-URI.
   `img-src 'self' data: blob:` → afbeeldingen alleen als committed bestand of data:-URI.
3. **Deploy** neemt de hele `path-urenregistratie/`-boom mee via
   `git archive` (zie `scripts/deploy-test-transip.sh`). Alles wat je onder
   `path-urenregistratie/pilot/` commit, komt live op
   `https://uren-test.pathconsultancy.nl/pilot/…`. Geen extra pipeline-config nodig.
4. **Tests & audit**:
   - `tests/playwright/pilot-page.spec.ts` (`[PILOT-H-001]`) moet blijven slagen —
     pas hem aan als je selectors/teksten wijzigt.
   - `tests/playwright/features/pilot-page.feature` moet in sync blijven: het
     project heeft `scripts/test-design-audit.mjs` dat voor elke `test(` in een
     spec een matchende `Scenario` eist met **Given + When + Then** in de body,
     een `# Testtechniek:`-regel en `# Aantoonbare Playwright-assertions in deze case: N`
     (N = exact aantal `expect(...)` in de test).
   - Playwright draaien: `node scripts/run-playwright-e2e.mjs --project=desktop-chromium --grep PILOT-H-001`
     (start zelf een PHP-server + migreert de test-DB; nooit `npx playwright test` direct).
   - `npm run check` moet groen zijn vóór elke commit.
5. **Versie**: bump met `npm run version:set <x.y.z>` (raakt 13 plekken automatisch),
   nooit met de hand. Commitberichten in het Nederlands, **geen** `Co-Authored-By`-trailer,
   geen versienummer in de subjectregel.

## Beeld & font (dit is het "1:1"-knelpunt)
Codex kan net als elke code-agent **geen foto's genereren**. Aanpak:

- De gebruiker levert aan in `path-urenregistratie/pilot/assets/1919/`:
  - `hero.jpg` — de duin/zonsopgang-hero uit de mockup. Verhouding ± **4:3**, minstens 1200×900, geoptimaliseerd (< 300 KB).
  - `document.jpg` — de geprinte klanturenstaat op donkere ondergrond met plant. Verhouding ± **3:2**, minstens 1000×700, < 300 KB.
  - `serif.woff2` — de display-serif uit de mockup (of, als onbekend, een OFL-serif die er dicht bij ligt: **Fraunces**, **Spectral** of **Source Serif 4**; subset latin, `font-display: swap`).
- Zolang die er niet zijn: gebruik de bestaande inline-SVG-benadering als placeholder,
  maar zet de `<img>`/`@font-face` al klaar zodat het wisselen één regel is.
- Portret-avatars: geen fotobron → gestileerde initialen-cirkel (SB), passend bij de stijl.

## Layout-spec (uit de JPG)

**Rail (donker, ± 264px, volledige hoogte)**
- Boven: P-merk (groene outline) + "Path Consultancy" (wit).
- Verticale tijdlijn met verbindingslijn, 5 stops (kleine caps groene eyebrow +
  serif-titel + gedempte sub):
  1. `START` — "Je maand begint" — "Een frisse start." — icoon: play.
  2. `WEEK 1` — "31 aug – 6 sep" — "Vul 20 uur aan" — **actief**: amber ring/gloed, amber tekst — icoon: kalender.
  3. `INDIENEN` — "Je uren indienen" — "Klaar voor controle." — icoon: papiervliegtuig.
  4. `BACKOFFICE` — "Na indienen neemt Backoffice het over" — "Wij zorgen voor de rest." — icoon: schild.
  5. `KLANTURENSTAAT` — "Direct naar de klant" — "Transparant en rechtstreeks gemaild." — icoon: envelop.
- Onderaan: (i)-icoon + "Vragen over je uren? Neem contact op met Backoffice."
- Optioneel: subtiele groene aftakkings-lijntjes van stop 3/4/5 die naar rechts
  de bijbehorende contentsectie aanwijzen (zoals in de JPG).

**Topbar (in de main, cream)**
- Links: `PACKAGE 1919 · PATH STORYLINE — EMPLOYEE` (kleine caps, gedempt, "PACKAGE 1919" groen).
- Rechts: maandkiezer-chip (kalendericoon + "September 2026" + chevron), scheidingslijntje,
  avatar + "Stasjo van Bakel" + chevron.

**Hoofdstuk 1 — Hero (cream achtergrond)**
- Links (± 45%): groene eyebrow `SEPTEMBER 2026` / grote serif `Je maand begint` (± 56px) /
  "Welkom bij je urenregistratie. Registreer je uren per dag, dien ze in en wij doen de rest." /
  rij van 3 mini-items met icoon in kader:
  - `[kalender]` **Registreer dagelijks** — "Houd je uren actueel."
  - `[papiervliegtuig]` **Dien wekelijks in** — "Eenvoudig en snel."
  - `[schild-check]` **Wij regelen de rest** — "Backoffice neemt het over."
- Rechts (± 55%): `hero.jpg`, doorlopend tot de rechterrand, bloedt boven door tot achter de topbar.

**Hoofdstuk 2 — "Vul je uren in" (donker navy, volle breedte)**
- Links: amber eyebrow `WEEK 1 · 31 AUG – 6 SEP 2026` / serif wit `Vul je uren in` /
  "Registreer je uren per dag. Zo houd je grip en blijft alles kloppend." /
  amber knop `[kalender] Vul 20 uur aan`.
- Rechts: weekgrid, 6 kolommen: **MA 31 AUG · DI 1 SEP · WO 2 SEP · DO 3 SEP · VR 4 SEP · TOTAAL**.
  Per dag: kopje (afkorting groot + datum klein) / kaart met tijd + label `UREN` / eronder `+ TOEVOEGEN`.
  Waarden: 8:00 / 8:00 / 4:00 / 0:00 / 0:00 / **20:00**. Gevulde tijd groen, 0:00 amber.
  TOTAAL-kolom: geen kaartrand, geen "+ toevoegen", tijd wit.

**Hoofdstuk 3 — "Na indienen neemt Backoffice het over" (donkergroen, volle breedte)**
- Links: groene eyebrow `NA INDIENEN` / serif wit "Na indienen neemt Backoffice het over" /
  "Wij controleren je uren en verzorgen de communicatie. Jij hoeft verder niets te doen."
- Rechts: 3-staps-flow met pijlen ertussen:
  `[schild-check]` **Controle** — "We controleren je uren." → `[papiervliegtuig]` **Klanturenstaat** — "Rechtstreeks gemaild naar de klant." → `[check]` **Gereed** — "Jouw uren zijn afgerond."

**Hoofdstuk 4 — "Direct naar de klant" (donker, volle breedte)**
- Links: groene eyebrow `KLANTURENSTAAT` / serif wit "Direct naar de klant" /
  "De klanturenstaat wordt na controle direct per e-mail verzonden naar de klant."
- Rechts/onder: `document.jpg` (geprinte klanturenstaat onder een hoek op donkere
  ondergrond, plant rechtsonder).

**Pilot-vlag** bovenaan de pagina: balk "PILOT — 1919 Path Storyline — medewerker —
losstaande voorbeeldpagina, niet de echte app" met link terug naar `/`.

## Kleuren (pipetteer uit de JPG voor precisie; dit is de richting)
- navy `#0e2233` · navy-2 `#0c1f2e` · forest `#16362b`
- cream `#f4f1e8` · paper `#faf7ef`
- ink `#20303a` · serif-ink `#22302b` · gedempt donker `#93a4ad`
- groen-accent `#6bbf95` / diep `#2f6a4c` · amber `#e0a13c` / sterk `#d68f24`
- lijn-donker `rgba(255,255,255,.14)` · lijn-cream `#e7e1d3`

## Oplevering
1. `pilot/1919-medewerker.html` bijgewerkt (+ evt. `pilot/1919-medewerker.js` voor
   scroll-sync van de rail — als losse same-origin `.js`, geen inline).
2. `pilot/assets/1919/` met de aangeleverde beelden + font (of placeholders klaar
   voor wissel).
3. `pilot/README.md` bijgewerkt.
4. `PILOT-H-001` groen + feature-scenario in sync + `npm run check` groen.
5. Versie-bump, NL-commit zonder signature, push. Na de TEST-deploy staat het op
   `https://uren-test.pathconsultancy.nl/pilot/1919-medewerker.html`.
