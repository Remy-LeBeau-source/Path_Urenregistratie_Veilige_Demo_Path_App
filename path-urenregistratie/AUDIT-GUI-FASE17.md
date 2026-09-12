# GUI-audit Fase 17 — eerste opdracht (12 sep 2026)

Antwoord op de "EERSTE OPDRACHT" uit Gio's update op de GUI/WebApp/App-opdracht:
eerst een volledige audit, geen grote wijzigingen vooraf. Bronnen: de code zelf
(`index.html`, `assets/app.js`, `assets/styles.css`, `assets/styles-new.css`),
`MASTERCHECKLIST.md`, `UI-TAKENLIJST.md`, `BESLISTABEL.md`, `playwright.config.ts`
en de bestaande testbestanden. Geen aannames, geen redesign uitgevoerd.

---

## 1–4. Welke schermen bestaan er, en voor wie

Dertien `<section class="view" id="view-...">`-schermen in `index.html`:

| Scherm (`id`) | Titel | Rol |
|---|---|---|
| `view-dashboard` | Urenoverzicht | Beheerder (standaard actieve scherm) |
| `view-employee-dashboard` | Mijn overzicht | Medewerker |
| `view-timesheet` | Mijn uren | Medewerker |
| `view-historie` | Mijn maanden | Medewerker |
| `view-customer-timesheet` | Klanturenstaat | Medewerker |
| `view-customer-timesheet-admin` | Klanturenstaten | Beheerder |
| `view-teamstatus` | Procesvoortgang | Beheerder |
| `view-approvals` | Goedkeuringen | Gedeeld (medewerker ziet eigen, beheerder ziet alles) |
| `view-invoices` | Facturen | Beheerder |
| `view-announcements` | Mededelingen (opstellen) | Beheerder |
| `view-employee-announcements` | Mijn mededelingen | Medewerker |
| `view-employees` | Medewerkers | Beheerder |
| `view-settings` | Instellingen | Beheerder |

Daarnaast gedeelde, niet-view-gebonden lagen die op elk scherm liggen: topbar/sidebar
(rolafhankelijke navigatie-items), profielmenu, notificatiebel, help-widget, modals
(28 stuks in `#modal`-varianten), en de login-/auth-laag vóór het app-shell.

**Puur medewerker:** `view-employee-dashboard`, `view-timesheet`, `view-historie`,
`view-customer-timesheet`, `view-employee-announcements`.
**Puur beheerder:** `view-dashboard`, `view-customer-timesheet-admin`, `view-teamstatus`,
`view-invoices`, `view-announcements`, `view-employees`, `view-settings`.
**Gedeeld:** `view-approvals` (rolafhankelijke inhoud, geen apart scherm per rol).

## 5. Verschillen Klassiek vs Nieuw

Beide skins delen dezelfde HTML/DOM en dezelfde `app.js`-businesslogica; het verschil
zit uitsluitend in `assets/styles.css` (Klassiek, altijd geladen) versus
`assets/styles-new.css` (Nieuw, laadt bovenop als `data-skin="new"` aan staat — dus
Nieuw is een cascade-laag over Klassiek, geen los stijlblad). Concreet:
- **Navigatie:** Klassiek = vaste sidebar (Cockpit/Goedkeuringen/Facturen/Medewerkers/
  Mededelingen/Instellingen). Nieuw = topnav, sinds v1.2.4/17.2 in dezelfde volgorde
  en groepering als Klassiek gelijkgetrokken (UI-TAKENLIJST #34, MASTERCHECKLIST 17.2).
- **Kleurpalet en typografie:** Klassiek navy/mint, Segoe UI-stack. Nieuw
  bosgroen/canvas met een serif-kop (`--path-serif`, valt terug op Georgia) en
  Inter voor lopende tekst — bento-kaarten i.p.v. platte tabellen op het
  medewerkerdashboard.
- **Medewerkerdashboard:** Nieuw heeft een eigen bento-indeling ("Jouw uren in
  4 stappen", werkvoorraad-hero) die Klassiek niet heeft (bewust, UI-TAKENLIJST
  "Bewust niet gedaan": dit blok blijft, geeft waarde).
  `.employee-hero` (de donkere navy-gradiënt hero) zelf zit in `assets/styles.css`
  en is dus universeel — geen apart Nieuw-element, wel Nieuw-only bento eromheen.
- **Onderste tabbalk** (Dashboard/Mijn uren/Mededelingen) is Nieuw-specifiek voor
  mobiel; Klassiek gebruikt op mobiel het bestaande hamburger-/topbar-patroon.

## 6. Verschillen Licht vs Donker

Beide skins hebben een lichte en een donkere tokenset (`:root` vs.
`@media (prefers-color-scheme: dark)` / `[data-theme="dark"]`, hetzelfde patroon
in beide bestanden). Vaste aandachtspunten die al eerder fout gingen en nu gefixt
staan (UI-TAKENLIJST #46, #40, #39, #7): kaarten met een bewust-vaste crème
achtergrond die niet meeschakelen met het thema-token, `--surface-muted` die per
skin/modus apart gedefinieerd moet zijn (was 19 plekken lang ongedefinieerd),
statuslabels die per modus een aparte kleurdefinitie nodig hebben. De contrastcheck
(`scripts/contrast-licht-donker.mjs`, onderdeel van `npm run check`) toetst dit
automatisch voor alle vier combinaties en staat vandaag groen (≥4,5:1 overal).

## 7. Bestaande responsive breakpoints

Klassiek (`assets/styles.css`): 390, 520, 560, 590, 700, 720, 760, 820, 900, 1100px
+ `(hover: hover) and (pointer: fine)` + `prefers-reduced-motion`.
Nieuw (`assets/styles-new.css`): 720, 800, 820, 860, 980, 1100px + `prefers-reduced-motion`.
Beide dekken dus ruwweg 390–1100px in stappen; geen enkele skin heeft een expliciet
360px-breakpoint (kleinste in de opdracht) of een 1366/1440/1920px-specifieke regel
— die grotere/kleinere randen draaien nu op de basisstijl zonder media query.

## 8. Waar mobiel al een eigen implementatie heeft

- Medewerkerdashboard (Nieuw): bento + onderste tabbalk, hierboven al genoemd.
- `Mijn uren`: opent op telefoonbreedte in één week i.p.v. de hele maand
  (`mobileWeekScope`, expliciet genoemd in de hulpbot-tekst zelf: "op een telefoon
  begint de app met één week").
- Periodekiezer, modal-formulieren en klanturenstaat-kaart hebben eigen mobiele
  font-size-regels (net vergroot naar 16px voor iOS-zoom, zie `[MOB-H-026]`).
- `tests/playwright/mobile-ui.spec.ts` (26 cases) is een volledig eigen testbestand
  specifiek voor mobiel gedrag, los van de desktop-equivalenten.

## 9. Wat al automatisch getest wordt

503 uitvoerbare Playwright-cases over 40 spec-bestanden, 100% gemapt naar BDD-features
(`npm run test:design` / `test:bdd:design`, vandaag beide groen). Relevant voor GUI:
- `skin.spec.ts` — 28 cases, Klassiek↔Nieuw-wissel, persistentie, geen regressie.
- `mobile-ui.spec.ts` — 26 cases, mobiel-specifiek gedrag (viewport, overflow, tap-targets).
- `accessibility.spec.ts` — 6 cases.
- `roles-api.spec.ts` — 5 cases, API-niveau autorisatie (niet UI-verbergen).
- `dashboard.spec.ts` + `dashboard-medewerker.spec.ts` — beheer- resp.
  medewerkerdashboard, functioneel + responsive.
- Playwright-projects: `desktop-chromium` (alles behalve mobile-ui), `mobile-chrome`
  (Pixel 7) en `mobile-safari` (iPhone 13) draaien een vaste kernlijst
  (mobile-ui, skin, business-workflows-*, dashboard*, help-widget, accessibility,
  auth, invoices, pilot-page, timesheet-review-ui) — dus niet de volle 503 cases
  op mobiel, bewust een kernselectie.
- `contrast-licht-donker.mjs` — statische contrastcontrole, alle vier combinaties.

## 10. Welke combinaties nog onvoldoende gedekt zijn

- **Geen enkele test draait op een tablet-viewport** (768/1024px) — alleen
  desktop-Chromium, Pixel 7 (mobiel) en iPhone 13 (mobiel). De opdracht vraagt
  expliciet ook tablet.
- **1366/1440/1920px-desktop** wordt nergens als losse breedte getest; `desktop-chromium`
  draait op Playwright's standaardviewport (1280×720), niet op deze specifieke maten.
  Bekende risico's op brede schermen (UI-TAKENLIJST #23, horizontale schuifbalk
  760–1300px) zijn destijds handmatig gevonden, niet via een vaste testbreedte.
  360px (de kleinste maat uit de opdracht) wordt evenmin als losse viewport getest —
  Pixel 7/iPhone 13 zijn 412/390px.
- **`mobile-safari`-project draait niet de volle GUI-suite** — dezelfde kernlijst als
  mobile-chrome, dus geen Safari-dekking op bijvoorbeeld `dashboard-medewerker`-cases
  buiten wat al in die lijst staat, en geen enkele iOS-viewport-dekking op
  `view-teamstatus`, `view-employees`, `view-settings` (zij zitten niet in de mobiele
  testlijst — puur beheerschermen die zelden op een telefoon open staan, maar de
  opdracht vraagt wel Beheerder + iPhone/Safari expliciet).
- **Klassiek+Donker en Nieuw+Donker op mobiel** worden wel door `skin.spec.ts` gedekt op
  desktop, maar dat bestand draait ook mobiel (staat in de mobiele lijst) — dus dit is
  in orde, alleen niet met een tablet-breedte ertussenin.

## 11. Concrete GUI-risico's in de huidige code

- **Geen 360px- en geen tablet-viewporttest** (zie punt 10) — het grootste losse gat
  t.o.v. de gevraagde matrix; niet per se een bug, wel een dekkingsgat.
- `.invoice-search input` (11px) en `.mail-channel-template input`/`textarea` (13px)
  staan nog onder de 16px-iOS-zoomgrens — al gevonden en bewust uitgesteld tijdens
  `[MOB-H-026]` (visuele smalte van `.invoice-search` eerst verifiëren).
- Resterende 17.5-punten uit `MASTERCHECKLIST.md` (nog open, geen nieuwe vondst):
  iOS viewporthoogte/keyboard/datumvelden/uploads/sticky headers, en het hele
  Android/Chrome- en PWA-blok (manifest/icons/service worker/caching) zijn nog
  niet stuk voor stuk doorlopen.
- Puur beheerschermen (`view-settings`, `view-employees`, `view-teamstatus`) hebben
  geen aparte mobiele stijlregels gevonden bij een snelle scan buiten de generieke
  responsive-tabelregels — dit moet nog scherm voor scherm bevestigd worden of
  daadwerkelijk een probleem is (kan ook prima zijn zoals het is), in lijn met
  "bewijs eerst dat er een probleem bestaat" uit de opdracht.

## 12. Wat al in UI-TAKENLIJST.md staat

Zo goed als alles wat hierboven als "vroeger risico" wordt genoemd staat al
afgerond in UI-TAKENLIJST.md (o.a. #46 donker-op-donker, #40 `--surface-muted`,
#39 amber-verwarring, #37 maandkop-overlap, #34 Klanturenstaten-eigen-scherm,
#23 horizontale schuifbalk, #12 cache-versiestempel New-skin). Nog open staan
alleen #21 (PROD-goedkeuringspoort, wacht op gebruiker — geen GUI-actie) en twee
"bekeken, geen concreet probleem"-items (#19 help-paneel, #44 stappenlijn — beide
expliciet onderzocht en niet gerepareerd omdat er niets kapot bleek). Er lag dus
geen openstaand, onbehandeld GUI-issue in de lijst dat deze audit moest overdoen.

## 13. Wat hier daadwerkelijk nieuw is

- Het ontbreken van tablet- en 360px/1440px/1920px-viewporttests (punt 10) — niet
  eerder als apart dekkingsgat benoemd.
- `mobile-safari` draait een identieke kernlijst als `mobile-chrome`, dus zuivere
  Safari-only-risico's (safe-area, input-zoom, viewport-hoogte) op de schermen
  búiten die kernlijst zijn nooit automatisch bevestigd.
- `.invoice-search`/`.mail-channel-template` input-zoom (al genoemd in
  MASTERCHECKLIST 17.5 als bewust uitgesteld, dus niet nieuw maar wel nog open).

---

## Prioriteitenlijst

**P0 — data/autorisatie/gebroken functionaliteit:** geen gevonden. Alle
rol-/autorisatiecontroles (`roles-api.spec.ts`, `SEC-H-009/010/011`) staan groen
en zijn recent bevestigd (12 sep, login-picker-bug `AUTH-H-025`).

**P1 — mobiele/desktop-bediening die echt hindert:**
1. Resterende iOS 17.5-punten afmaken (viewporthoogte, keyboard, datumvelden,
   uploads, sticky headers) — al gepland, geen nieuwe vondst.
2. `.invoice-search`/`.mail-channel-template` naar 16px (al gepland, uitgesteld
   voor visuele verificatie).
3. Tablet- en 360px-viewportdekking toevoegen aan de bestaande testprojecten
   (nieuwe vondst uit deze audit) — dekkingsgat, geen bevestigde bug.
   **Eerste steekproef gedaan (13 sep):** los verificatiescript (geen onderdeel
   van de suite, niet gecommit) geladen tegen de lokale server: 768x1024
   (tablet), 1920x1080 (breed desktop) en 360x740 (kleinste mobiel) x
   Klassiek/Nieuw x Beheerder/Medewerker, 12 combinaties, `scrollWidth` vs.
   `clientWidth` op het hoofdscherm na inloggen. Alle 12 tonen `overflow=0` --
   geen horizontale overflow-bug gevonden. Dit bevestigt alleen het hoofdscherm
   direct na inloggen, dus het dekkingsgat zelf (geen permanente CI-viewport
   voor tablet/360px) blijft staan; er was alleen geen acute, verborgen bug om
   eerst te repareren voordat die dekking wordt toegevoegd.

   **Update na de eerste echte `tablet-chromium`-testrun (74 cases, 13 sep):**
   de steekproef hierboven testte alleen het hoofdscherm direct na inloggen en
   miste daardoor twee echte bugs die pas bij interactie zichtbaar werden.
   Beide komen uit hetzelfde patroon: de sidebar wordt al bij `max-width:820px`
   de onderste navigatiebalk, maar losse elementen die daarmee rekening houden
   schuiven pas bij een smallere breedte (590/720px) opzij — een 100-230px
   brede kier. Gevonden en **gefixt**: `.help-launcher` (zwevende hulpknop)
   overlapte de navigatieknoppen in die kier en onderschepte klikken —
   discriminerend bevestigd, zie MASTERCHECKLIST.md 17.5. Gevonden en **NIET
   gefixt, expliciet gerapporteerd** conform "leg eerst uit bij een grotere
   wijziging": in diezelfde 720-820px-kier is er geen enkele zichtbare weg om
   uit te loggen of van rol te wisselen (`#switch-role` verdwijnt met de
   sidebar-footer, `#mobile-switch-role` verschijnt pas bij een complete
   topbar-herbouw die zelf pas bij 720px begint) — dit veroorzaakte een lange
   cascade van testfouten zodra een test probeerde uit te loggen. Zie
   MASTERCHECKLIST.md 17.5 voor de volledige analyse en de drie voorgestelde
   alternatieven; blijft open tot een plaatsingskeuze is gemaakt.

**P2 — inconsistentie/accessibility:** Android/Chrome- en PWA-blok van 17.5 nog
scherm voor scherm doorlopen (gepland, nog niet gestart).

**P3 — puur cosmetisch:** geen nieuwe vondsten; het bestaande visuele-verfraaiingsspoor
(zie `pilot/fase17-richtingpagina.html`) blijft een apart, expliciet
goedgekeurd traject en geen audit-P3-punt.

**Conclusie:** geen enkele grote wijziging is op basis van deze audit noodzakelijk.
Het werk dat al liep (17.5, scherm voor scherm, kleine wijzigingen) sluit aan bij
wat deze audit oplevert. Enige toevoeging: de testmatrix uitbreiden met tablet- en
360px-viewports voordat verdere 17.5-punten als "getest" worden afgevinkt.
