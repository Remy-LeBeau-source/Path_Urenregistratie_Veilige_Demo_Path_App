# pilot/

Losstaande **voorbeeldpagina's** voor de 1414/1919-herontwerprichting, naast de
ongewijzigde app op `/`. Het zijn **statische 1-op-1 reproducties van de
mockups** in `design-mockups/1414-path-bento-space/` — geen login, geen API's,
geen database. Ze staan op TEST puur om de vorm te beoordelen. De app op `/`
blijft de stabiele, functionele route.

| Bestand | Rol | URL op TEST |
|---|---|---|
| `1919-medewerker.html` | Medewerker | `https://uren-test.pathconsultancy.nl/pilot/1919-medewerker.html` |
| `1919-beheerder.html` | Administrator / Backoffice | `https://uren-test.pathconsultancy.nl/pilot/1919-beheerder.html` |

## Interactielaag

`1919-medewerker.html` laadt één same-origin script, `1919-medewerker-ui.js`
(CSP-veilig, geen inline script). Dat geeft de medewerkerpagina een lichte,
gehardcodeerde demo-interactie zodat de vorm te "voelen" is:

- maandkeuze met ‹ › (Juli/Augustus afgerond en vergrendeld, September lopend,
  Oktober leeg);
- weeknavigatie met ‹ › door alle weken van de maand;
- uren invullen per dag met een vrij invoerveld, `−` / `+` (30 min) en een
  snelkeuze (4 · 6 · 8 · 8,5 · 9); geen voorgevulde nul;
- weektotaal dat meeloopt; `Opslaan` (tussentijds) en `Indienen ter controle`
  (vergrendelt de week, springt naar de volgende open week);
- voortgangsmeter in weken en een 4-stappenstrip die de status volgt.

`1919-beheerder.html` is volledig statisch (geen `<script>`).

Alle data is vast (mockup-1:1) en leeft alleen in het geheugen van de tab.
Niet alle knoppen doen iets — de topbalk-menu's, de bel en dergelijke zijn
illustratief.

## Techniek en assets

- CSP-veilig: geen externe scripts, fonts of afbeeldingen. Serif via lokale
  `@font-face` naar `assets/1919/serif.woff2`; foto's als gecommitte bestanden.
- Assets: zie [`assets/1919/ASSET-MANIFEST.md`](assets/1919/ASSET-MANIFEST.md).
- Responsive: getest 390 → 1440px, geen horizontale overflow.
- Regressiedekking: `tests/playwright/pilot-page.spec.ts` en
  `tests/playwright/features/pilot-page.feature` (`[PILOT-*]`).

## Werkwijze

De visuele verfijning loopt via `design` (losse HTML/CSS-handoff in een
`handoff/`-map); Claude voegt die samen met de interactielaag, hertest en
deployt tot TEST. De volgende stap is een klassiek↔nieuw-schakelaar in de
échte app, met de volledige caseset eroverheen.
