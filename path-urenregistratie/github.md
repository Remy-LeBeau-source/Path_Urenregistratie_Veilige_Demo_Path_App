repo: Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App
branch: main
path: path-urenregistratie

## Last sync
date: 2026-09-13T09:36:30Z

### Ronde 13 sep (avond)
- Zocht in de repo naar bestaande maandnavigatie-logica op het medewerkerdashboard (geen treffer in `path-urenregistratie/`) — vastgelegd in `handoff/HANDOFF-MEDEWERKER-MOBIEL.md` als "onzeker, laat Claude Code nakijken"
- `Medewerker Wild.dc.html`: dashboard ontdubbeld (tegels weg, verloop inklapbaar), 0/8/9 weer contractonafhankelijk, urenveld selecteert zichzelf, maandpijl-terug naar de juiste maand
- Handoff-document uitgesplitst in nieuw / bestaand / onzeker voor de overdracht

### Updated in this project
- Medewerker GUI.dc.html: hero-ring vervangen door KPI-rij (voltooid/weken/contracturen), "Verloop van de maand" van inklapbare accordion naar vaste horizontale stappenbalk — desktop-eigen in plaats van telefoonlayout uitgerekt
- `assets/styles-new.css` gelezen: de New-skin landingspagina voor medewerkers is `.new-employee-bento`, met één `:not()`-regel die alle klassieke dashboardinhoud verbergt — vastgelegd in `CLAUDE.md`
- Vier overgebleven blokken en hun `order` beschreven (bento, open-overzicht, correctie, historie-deur)
- Appkeuzes genoteerd die onze artefacten raken: bento altijd donker, themaknop juist verborgen, zijbalk weg, klanturenstaat via `#new-bento-customer`, primaire knop amber
- `Medewerker Wild.dc.html` — volledige functieset in een eigen visuele laag (geen hero-kaart, driftwolken, veegbare weekkaarten)

### Ronde 12 sep
- Maanden doorgeschoven naar september; maandnaam nu overal dynamisch
- "Hele maand"-blok met **concrete ontbrekende werkdagen** overgenomen uit de app (`TS-REV-UI-H-015`, `HANDOFF-CODEX.md`): chips per dag, knop vergrendeld tot alles ingevuld is
- Statuspil per week (open / ingediend / goedgekeurd) in Mijn uren
- Beslissingen bijgewerkt in `CLAUDE.md`

### Eerdere ronde (12 sep)
- `Medewerker Telefoon.dc.html`: mobiel medewerkerscherm (Nu / Mijn uren / Maanden / Berichten)
- Factuurinformatie verwijderd — medewerkers zien alleen goedkeuring en klanturenstaat
- Downloadknop hernoemd naar "Urenoverzicht (PDF)", gelijk aan de jspdf-PDF uit de app (uren, geen bedragen)
- Beslissingen vastgelegd in `CLAUDE.md` voor overdracht aan Claude Code

### Eerdere ronde (12 sep)
- Medewerkerdashboard Klassiek nagebouwd als artifact, licht + donker, responsive tot 360px
- Klassieke tokens en componentstijlen gelezen uit `assets/styles.css` (navy/mint, --kaart, metric-card, status-pill)
- CSS-patch `handoff/styles-new-patch.css` voor de New-skin: stappenlijn, uitklap-kopband, formuliervelden op crème, hero-bladeren

### Eerdere ronde
- Vier medewerker-richtingen ontworpen: 1919 Storyline, Kaarten, Maandstaat en de mix
- Editoriale richting "Urenstaat Editie" op je eigen documentfont (`path-invoice-*.ttf`)
- Echte merkassets overgenomen: `path-logo.png`, `path-logo-wit.png`, 1919-beelden en display-serif
- Kleuren, teksten en layout-spec gelezen uit `design-mockups/1919-medewerkers/CODEX-BRIEF.md`
- Mockups beoordeeld en Pakket B (warm menselijk) nagebouwd als werkend scherm
- Designverfijning 1414/1919-pilots: beide pilotpagina's herzien in `handoff/`

## Screen map
| Screen | Repo files |
| --- | --- |
| Medewerker Dashboard 1919.dc.html | pilot/1919-medewerker.html, design-mockups/1919-medewerkers/CODEX-BRIEF.md, pilot/assets/1919/* |
| Medewerker Dashboard Kaarten.dc.html | pilot/assets/1919/document.jpg, assets/path-logo-wit.png |
| Medewerker Maandstaat.dc.html | pilot/assets/1919/*, assets/path-logo-wit.png |
| Medewerker Mix.dc.html | pilot/1919-medewerker.html, pilot/assets/1919/*, assets/path-logo-wit.png |
| Medewerker Pakket B.dc.html | design-mockups/redesign-packages-2026-09/pakket-B-warm-menselijk/B1-medewerker-dashboard.jpg, assets/path-invoice-*.ttf, assets/path-logo-wit.png, pilot/assets/1919/hero.jpg |
| handoff/pilot/1919-medewerker.html | pilot/1919-medewerker.html, pilot/1919-medewerker-ui.js, design-mockups/1414-path-bento-space/medewerker-dashboard.jpg, pilot/assets/1919/bento-*.png |
| handoff/pilot/1919-beheerder.html | pilot/1919-beheerder.html, design-mockups/1414-path-bento-space/beheerder-maandoverzicht.jpg |
| Medewerker Klassiek.dc.html | index.html (#view-employee-dashboard), assets/styles.css |
| handoff/styles-new-patch.css | assets/styles-new.css, index.html |
| Medewerker Telefoon.dc.html | index.html (#view-employee-dashboard), assets/app.js, assets/jspdf.umd.min.js, COPILOT_HANDOFF.md, HANDOFF-CODEX.md |
| Medewerker Wild.dc.html | index.html (#view-employee-dashboard), assets/styles-new.css, assets/app.js |
| Medewerker Wild Studie.dc.html | eigen ontwerp, geen repo-bron |
| Urenstaat Editie.dc.html | assets/path-invoice-regular.ttf, assets/path-invoice-bold.ttf, assets/path-logo.png, pilot/assets/1919/* |
