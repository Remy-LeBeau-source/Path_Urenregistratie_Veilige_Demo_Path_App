# 1919 assetmanifest voor overdracht

Alle visuele assets zijn lokaal en mogen zonder externe netwerkrequest door de
1919-pilot worden gebruikt. Verplaats of hernoem ze niet zonder tegelijk de
HTML/CSS en de Playwright-regressie aan te passen.

| Bestand | Resolutie / type | Gebruik | Uitsnede |
|---|---|---|---|
| `hero.jpg` | 1448 × 1086, JPEG | Medewerker: begin van de maand | `object-fit: cover`; focus rechts/midden zodat pad en zon zichtbaar blijven |
| `document.jpg` | 1536 × 1024, JPEG | Medewerker: klanturenstaat | `object-fit: cover`; focus midden op 20% hoogte zodat het document leesbaar in beeld ligt |
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

## Alt-teksten

- Hero: `Zonsopgang boven een slingerend duinpad langs de kust`
- Document: `Gedrukte klanturenstaat op een donker bureau met een plant`

Deze teksten beschrijven het beeld, zonder functionele status te herhalen.
