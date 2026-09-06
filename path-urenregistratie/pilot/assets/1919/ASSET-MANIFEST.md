# 1919 assetmanifest voor overdracht

Alle visuele assets zijn lokaal en mogen zonder externe netwerkrequest door de
1919-pilot worden gebruikt. Verplaats of hernoem ze niet zonder tegelijk de
HTML/CSS en de Playwright-regressie aan te passen.

| Bestand | Resolutie / type | Gebruik | Uitsnede |
|---|---|---|---|
| `hero.jpg` | 1448 × 1086, JPEG | Medewerker: begin van de maand | `object-fit: cover`; focus rechts/midden zodat pad en zon zichtbaar blijven |
| `document.jpg` | 1536 × 1024, JPEG | Medewerker: klanturenstaat | `object-fit: cover`; focus midden op 20% hoogte zodat het document leesbaar in beeld ligt |
| `bento-foliage-v2.png` | 1672 × 940, PNG | Actieve medewerker-Bento: urenhero | Donkere rustige uitsnede; bladeren links/onder, vrije ruimte voor tekst |
| `bento-timesheet-v2.png` | 1536 × 1024, PNG | Actieve medewerker-Bento: klanturenstaat | Document/map rechts; vrije crèmeruimte links voor status en actie |
| `serif.woff2` | WOFF2 | Koppen in medewerker en beheer | Lokaal geladen als `Pilot Serif` met `font-display: swap` |
| `OFL.txt` | licentietekst | Licentie bij het lokale font | Altijd samen met `serif.woff2` bewaren |
| `IMAGEGEN-PROMPTS.md` | bronnotities | Herkomst en reproduceerbare beeldbrief | Geen runtimebestand |

## Integratiepunten

- `../../1919-medewerker.html` bevat de twee `<img>`-elementen en hun concrete
  Nederlandse alt-teksten.
- `../../1919-beheerder.css` gebruikt alleen het lokale font; avatars worden
  privacyvriendelijk uit initialen opgebouwd en vereisen geen foto.
- Gebruik op mobiel dezelfde bestanden. Wijzig alleen `object-position`; maak
  geen aparte mobiele kopie tenzij een echte cropspecifieke variant nodig is.
- Uploadbare profielfoto's of een avatarbouwer horen niet in deze assetmap en
  zijn geen onderdeel van deze pilotrelease.

## Integriteitscontrole

SHA-256 op 6 september 2026:

- `hero.jpg`: `AA83FDB722517306F27CD1ED655CF63BF4AF1C6B8EFA259BF2C28ABA70787CFA`
- `document.jpg`: `CC1C05A9537EA387ADDDE903020D88B7CE4F94C121E391C08FC247285A015C54`
- `bento-foliage-v2.png`: `C4226E7436B01D86B6E3D28E5CB9516676CE695F0383B14181F9D6921020B912`
- `bento-timesheet-v2.png`: `A48CFD33FBBC5974FBD43D6A1FCE1DE72196C7188AC9E85DBBF399D496F47BAC`

## Alt-teksten

- Actieve Bento-hero: `Groene bladeren tegen een rustige donkergroene achtergrond`
- Actieve Bento-documentkaart: `Klanturenstaat in een groene map op een warm bureau`

Deze teksten beschrijven het beeld, zonder functionele status te herhalen.
