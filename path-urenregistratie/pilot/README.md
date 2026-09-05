# pilot/

Losstaande, statische **voorbeeldpagina's** voor designrichtingen. Deze map
wordt meegedeployed naar de webroot, dus elk bestand hier is bereikbaar als
eigen URL naast de echte app — zonder gedeelde JS/CSS, routing of data.

| Bestand | Wat | URL op TEST |
|---|---|---|
| `1919-medewerker.html` | Richting **1919 Path Storyline**, medewerker-dashboard | `https://uren-test.pathconsultancy.nl/pilot/1919-medewerker.html` |

## Regels

- **Raakt de app niet.** Geen import van `assets/`, geen wijziging aan
  `index.html` / `app.js` / `styles.css` / `server/`. De app op `/` blijft
  volledig werkend en klikbaar.
- **CSP-veilig.** De TEST-`.htaccess` verbiedt *externe* scripts, fonts en
  afbeeldingen. Dus alles same-origin: `<style>` inline, geen `<script>`, de
  serif als lokale `@font-face` (`assets/1919/serif.woff2`, OFL — zie
  `assets/1919/OFL.txt`), en de twee foto-vlakken als lokale `<img>`
  (`assets/1919/hero.jpg`, `assets/1919/document.jpg`). De beelden zijn nieuw
  gegenereerd met de mockup als stijlreferentie — zie
  `assets/1919/IMAGEGEN-PROMPTS.md`.
- **Pilot-vlag.** Elke pagina toont bovenaan een balk "PILOT — niet de echte
  app" met een link terug naar `/`.
- Een live, responsieve pagina wordt nooit pixel-identiek aan een vaste
  mockup-plaat (echte data, herschikking, meerdere toestanden). Doel is een
  getrouwe bouw: identieke layout, kleuren, typografie, componenten en teksten,
  met de aangeleverde beelden op de foto-vlakken.
