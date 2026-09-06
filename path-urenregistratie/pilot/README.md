# pilot/

Functionele, afgeschermde **1919-pilotportals** naast de bestaande app. Beide
pagina's gebruiken dezelfde beveiligde sessie, API's en TEST-database als `/`.
De bestaande appbundels worden niet geïmporteerd en de app op `/` blijft de
stabiele terugvalroute.

| Bestand | Rol | URL op TEST |
|---|---|---|
| `1919-medewerker.html` | Medewerker | `https://uren-test.pathconsultancy.nl/pilot/1919-medewerker.html` |
| `1919-beheerder.html` | Administrator / Backoffice | `https://uren-test.pathconsultancy.nl/pilot/1919-beheerder.html` |

## Functionele grenzen

- De server blijft gezaghebbend voor rol, medewerker, periode, uren,
  klanturenstaat, factuurstatus en alle statusovergangen.
- Medewerkers zien geen facturen. Na indienen worden hun uren alleen-lezen;
  na een correctieverzoek worden ze weer bewerkbaar.
- `Al rechtstreeks gemaild` blijft oranje. Alleen Backoffice kan dit met een
  verplichte reden omzetten naar `Extern bevestigd` (groen), en kan die
  bevestiging met een tweede waarschuwing terugdraaien.
- Veilige factuurfinalisatie, PDF-controle en mailverzending blijven tijdens de
  pilot in de bestaande Backoffice op `/`.
- De actuele Amsterdamse kalendermaand is de startmaand van een nieuwe
  inlogsessie. Een gekozen maand blijft binnen die sessie behouden; uitloggen
  wist de pilotselectie.
- Omdat beide portals dezelfde same-origin sessiecookie gebruiken, test je een
  medewerker en beheerder tegelijk in twee browserprofielen of een
  normaal/incognitovenster.

## Techniek en assets

- CSP-veilig: geen externe scripts, fonts of afbeeldingen.
- De medewerkerportal gebruikt lokale fotografie en een lokaal serif-font.
  Exacte bestanden, crops, checksums en overdrachtsnotities voor Claude staan
  in [`assets/1919/ASSET-MANIFEST.md`](assets/1919/ASSET-MANIFEST.md).
- De verbindingslijnen en statuskleuren worden uit de actuele serverstatus
  opgebouwd. Groen betekent uitsluitend gereed; blauw is actief en amber
  vereist actie.
- Regressiedekking: `tests/playwright/pilot-page.spec.ts` en
  `tests/playwright/features/pilot-page.feature`.
