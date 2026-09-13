repo: Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App
branch: main
path: path-urenregistratie

## Last sync
date: 2026-09-13T19:01:00Z

### Ronde 13 sep (avond) — vastgesteld uit de diff van de exports
Deze regel is aan de repo-kant geschreven: de vorige export is bewaard, de
nieuwe ernaast gelegd en het verschil beschreven. Wild: 162 gewijzigde regels,
GUI: 287.

**`medewerker-wild.html` — vormgeving**
- Salie-palet doorgevoerd in licht: `--bg:#dfe9e4`, `--surface:rgba(255,255,255,.66)`,
  `--ink:#16241f`, `--muted:#5c6d66`, `--line:rgba(22,36,31,.09)`, `--line-zacht:rgba(22,36,31,.05)`
- Twee nieuwe tokens: `--kaart-schaduw:0 1px 1px rgba(22,52,42,.03),0 6px 18px rgba(22,52,42,.055)`
  en `--veld:linear-gradient(176deg,#d3e5dd 0%,#e4efea 34%,#f4f9f6 72%,#fbfdfc 100%)`
  (in donker `--veld:none`). De shell krijgt `background-image:var(--veld)`.
- Hero-verloop lichter: `linear-gradient(146deg,#e7f1ec 0%,#dceae5 46%,#c8ded7 100%)`
- Kop herzien: Path-logo per thema, scheidingslijntje van 1px, titel en label op
  één regel; themaknop van 40 naar 36px, radius 12 → 11
- De statuspil boven het maandcijfer is **weg**
- De spreuk staat er nu altijd, in de displayserif (14.5px, cursief); de
  toelichting alleen nog als er echt iets te doen is (`heeftToelichting`)
- Kaartschaduwen lopen via `var(--kaart-schaduw)` in plaats van een eigen
  `0 10px 26px rgba(5,12,20,.14)`

**`medewerker-wild.html` — gedrag**
- **Geen "Week opslaan" meer.** De onderbalk toont tijdens invullen
  "Automatisch opgeslagen" + weektotaal en de knop "Nog N dagen"; zodra de maand
  vol is "Maandtotaal" + "Maand indienen"
- Dagen die buiten de gekozen maand vallen verdwijnen uit de weekrijen
- De maandbevestiging noemt nu ook de dagen die je **bewust** op 0,0 zette
- "Vul de rest"-knop staat op `display:none`
- Klanturenstaat per maand (`staatVoor`, `afgerond`, `oudsteOpen`) in plaats van
  één status voor alles
- Dashboardtitel is "September 2026" in plaats van "Path · september"
- PDF-onderschrift: "je uren per week" (bedragen worden niet meer genoemd)
- De "Wijzigen"-link bij "Afgerond — zelf gemaild" is weg

**`medewerker-gui.html`** — dezelfde `--veld`/`Afgerond`/`Maand indienen`-lijn
doorgetrokken naar de desktopvariant. Niet nagebouwd: de GUI komt per opdracht
in een aparte ronde.

## Terugmelding uit de repo (13 sep, avond)

Het handoff-document vraagt op twee punten om verificatie in de repo. Hier de
uitkomst, met vindplaats, zodat het na te trekken is.

**Punt 0 — "Verifieer of de bestaande autosave dit al dekt." Ja, volledig.**
`#hours-grid` slaat bij elke toetsaanslag op: `assets/app.js:13741` hangt een
`input`-listener op die `updateHoursTotal(true)` aanroept, en die functie
eindigt in `persistState()`. De app heeft er zelfs al een statusregel voor,
`#hours-autosave-status` in `index.html:649`, die standaard "Wijzigingen worden
automatisch opgeslagen" toont en na een wijziging "Automatisch opgeslagen om
HH:MM" (`app.js:9073`). In servermodus wordt dat "Gesynchroniseerd met server om
HH:MM" of "Niet gesynchroniseerd: ..." (`app.js:2665` en `2676`).

Wat "Week opslaan" (`#save-timesheet`) daar bovenop doet is precies niets aan
opslaan: de handler op `app.js:14024` roept `updateHoursTotal(true)` nog een
keer aan en toont een toast. De knop weghalen kost dus geen functionaliteit.
De winst van het ontwerp zit elders: die statusregel staat nu weggestopt in het
blok "Invoerweergave", terwijl het ontwerp hem in de onderbalk zet waar je hem
ziet. Dat is de echte verbetering, niet het autosaven zelf.

**Punt "onzeker" — wat de maandkiezer doet. Dit ligt vast, en breder dan
gedacht.** De pijlen zijn geen dashboardpijlen: ze zitten in
`#global-period-control` in de topbalk (`index.html:229` en `244`) en gelden voor
de hele app. `changePeriod(delta)` (`app.js:14300`) zet de periode via
`shiftPeriodKey` en doet een volledige `renderAll()`, met een toast "Periode
gewijzigd naar ...". Ook beheerschermen hangen eraan — `index.html:874` zegt
letterlijk "De getoonde werkstatussen horen bij <maand>".

Twee gevolgen voor het ontwerpvoorstel:
- "Vorige maand springt naar Maanden met die maand opengeklapt" kan niet zomaar:
  dezelfde knop bedient ook Facturen, Goedkeuringen en Teambeheer. Een
  scherm-wisselend gedrag zou daar onverklaarbaar zijn.
- "Volgende maand vergrendeld op de lopende maand" bestaat nu niet:
  `shiftPeriodKey` (`app.js:161`) stapt vrij door en begrenst alleen het jaartal.

Verder zijn deze twee knoppen vastgelegd door minstens acht testaanroepen in
`dashboard-medewerker.spec.ts` en `business-workflows-e2e.spec.ts`. Het advies
uit het handoff-document ("haal de pijlen bij Mijn uren weg") is daarmee wel
uitvoerbaar, maar het is een wijziging aan een globale besturing en geen
detail van het medewerkerscherm. Dat vraagt een besluit van Gio, niet van mij.

## Sync history

### Ronde 13 sep (namiddag)
- `Medewerker GUI.dc.html`: dashboard-ledger herzien (KPI-tegels, één groene actieknop, "Afgerond"-stap met reden), "vul alle gaten"-knop, gemaild-status ontkoppeld van goedgekeurd-tekst (dashboard + Maanden-pil)
- Naamgeving vastgelegd: New-skin heet voortaan "Modern" i.p.v. "Nieuw", ook in de app zelf
- Werkwijze overdracht vastgelegd: bij elke wijziging aan Wild/GUI volgt automatisch een verse export naar `handoff/`

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
