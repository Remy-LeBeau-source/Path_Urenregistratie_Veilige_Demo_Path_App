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
- **CSP-veilig.** De TEST-`.htaccess` verbiedt externe scripts, fonts en
  afbeeldingen. Dus: alles inline (`<style>`, inline SVG), geen `<script>`,
  serif = Georgia (systeem). "Foto"-vlakken zijn inline SVG-illustraties in
  dezelfde compositie/sfeer als de mockup — geen echte fotografie.
- **Pilot-vlag.** Elke pagina toont bovenaan een balk "PILOT — niet de echte
  app" met een link terug naar `/`.
- Wil je een pilot 1:1 met de mockup-JPG: lever de echte beeld-/fontbestanden
  aan, dan worden ze hier ingezet.
