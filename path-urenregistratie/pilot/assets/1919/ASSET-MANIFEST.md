# 1919 assetmanifest

Alle assets zijn lokaal en worden zonder externe netwerkrequest door de
pilotpagina's gebruikt (CSP-veilig). Verplaats of hernoem ze niet zonder
tegelijk de HTML/CSS en de Playwright-regressie aan te passen.

| Bestand | Type | Gebruik |
|---|---|---|
| `bento-foliage-v2.png` | 1672 × 940, PNG | Medewerker-hero: donkergroene wand met bladeren linksonder, met mask in de hoek geplaatst |
| `bento-timesheet-v2.png` | 1536 × 1024, PNG | Medewerker klanturenstaat-kaart: groene map + document + koffiekop, crèmevlak linksboven vrij voor tekst |
| `serif.woff2` | WOFF2 | Koppen in beide pilots, lokaal geladen als `Pilot Serif` (`font-display: swap`) |
| `OFL.txt` | licentietekst | Licentie bij `serif.woff2` — altijd samen bewaren |
| `IMAGEGEN-PROMPTS.md` | bronnotities | Herkomst van de beelden, geen runtimebestand |

## Integratie

- `../../1919-medewerker.html` bevat de twee `<img>`-elementen met Nederlandse
  alt-teksten; `object-position` regelt de uitsnede (ook op mobiel — geen
  aparte mobiele kopie).
- `../../1919-beheerder.html` gebruikt alleen het font; avatars worden uit
  initialen opgebouwd en vereisen geen foto.
- Uploadbare profielfoto's horen niet in deze map.

## Alt-teksten

- Medewerker-hero: `Groene bladeren tegen een rustige donkergroene achtergrond`
- Klanturenstaat-kaart: `Klanturenstaat in een groene map op een warm bureau met koffie`
