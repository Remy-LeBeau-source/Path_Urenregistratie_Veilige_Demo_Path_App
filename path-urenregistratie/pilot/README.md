# pilot/

Losstaande, statische **voorbeeldpagina's** voor designrichtingen. Deze map
wordt meegedeployed naar de webroot, dus elk bestand hier is bereikbaar als
eigen URL naast de echte app — zonder gedeelde JavaScript, CSS, routing of data.

| Bestand | Wat | URL op TEST |
|---|---|---|
| `1919-medewerker.html` | Richting **1919 Path Storyline**, medewerker-dashboard | `https://uren-test.pathconsultancy.nl/pilot/1919-medewerker.html` |

## 1919-assets

De 1919-pilot gebruikt uitsluitend bestanden uit `assets/1919/`:

| Bestand | Specificatie | Herkomst |
|---|---|---|
| `hero.jpg` | 1448 × 1086, 276.181 bytes | AI-gegenereerde duin/zonsopgangfoto, gemaakt voor deze pilot |
| `document.jpg` | 1536 × 1024, 189.784 bytes | AI-gegenereerde klanturenstaat-still-life, gemaakt voor deze pilot |
| `serif.woff2` | Fraunces Variable, Latin-subset, 36.620 bytes | Zelfgehost via Fontsource; SIL Open Font License 1.1 |
| `OFL.txt` | Licentietekst | Meegeleverd bij het font |
| `IMAGEGEN-PROMPTS.md` | Exacte beeldprompts en uitvoerspecificaties | Reproduceerbare ontwerpdocumentatie |

De referentie voor compositie, hiërarchie en kleur is
`design-mockups/1919-medewerkers/01-1919-medewerker-storyline-overzicht.jpg`.
De foto's bevatten geen echte persoonsgegevens en zijn geen invoer- of
documentdata van de applicatie.

## Regels

- **Raakt de app niet.** Geen import van `../assets/`, geen wijziging aan
  `index.html`, `assets/app.js`, `assets/styles.css` of `server/`. De app
  op `/` blijft volledig werkend en klikbaar.
- **CSP-veilig.** Geen externe runtimebronnen en geen script. De pagina gebruikt
  alleen inline CSS/SVG en same-origin afbeeldingen/font uit `assets/1919/`.
- **Pilot-vlag.** De pagina toont bovenaan "PILOT — niet de echte app" met een
  link terug naar `/`.
- **Niet functioneel.** De knoppen en profiel-/maandweergave demonstreren de
  visuele richting; zij schrijven geen uren en benaderen geen API.
