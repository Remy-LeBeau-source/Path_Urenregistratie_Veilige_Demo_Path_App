# TEST-acceptatielijst — 3 september 2026

Alles staat op TEST (`uren-test.pathconsultancy.nl`, versie 0.9.159). PROD is niet aangeraakt.
Volgorde van commits onderaan. Loop de blokken door en vink af.

---

## 1. Documenten openen & downloaden op mobiel  ← hoofdpunt

**Wat er veranderde:** bekijken én downloaden lopen nu altijd via `fetch → blob`.
De server-`Content-Disposition` (soms `inline`, soms `attachment`) bepaalt niet meer of
Chrome toont of ophaalt. "Openen" hergebruikt één vast tabblad; "Downloaden" navigeert nooit.
`doc.save()` (jsPDF) is vervangen door een expliciete `<a download>`-blob.

### Test A — telefoon, **PWA NIET geïnstalleerd** (alleen browser)
1. Facturen → een factuur met een PDF → **Documenten bekijken**.
2. **Openen** (factuur): opent in één PDF-tabblad. Ga terug → de webapp staat er nog, op dezelfde plek.
3. Nog een keer **Openen**: geen tweede PDF-tabblad erbij — hetzelfde tabblad wordt hergebruikt.
4. **Downloaden** (factuur): bestand landt in Downloads, de webapp blijft in beeld (geen sprong, geen viewer-overname).
5. Herhaal 2–4 voor de **Urenstaat** (Openen / Downloaden) als er een klanturenstaat-PDF is.
6. Bij een goedgekeurde urenstaat: **Klanturenstaat bekijken** → PDF-tabblad, terug = webapp intact.
7. Facturen-lijst → **Download overzicht** (CSV): downloadt, geen navigatie.

### Test B — telefoon, **PWA WEL geïnstalleerd** en webapp óók open in Chrome
1. Doe Test A opnieuw vanuit de **geïnstalleerde app**.
2. **Openen**: de PDF opent in de browser (niet in de app), de app blijft open op de achtergrond.
3. **Downloaden**: geen sprong naar de browser of naar de app — download gebeurt, je blijft waar je was.
4. Doe hetzelfde vanuit de **browser-webapp** terwijl de app ook openstaat: bij openen/downloaden mag hij
   **niet naar de geïnstalleerde app springen**. Alles blijft in de browser.
5. Wissel een paar keer tussen app en browser en herhaal — het moet elke keer hetzelfde lopen (geen "soms wel soms niet").

> Waarom dit nu klopt: alle document-URL's gaan via `blob:`-adressen. Android koppelt alleen
> `https://uren-test.pathconsultancy.nl/...`-links aan de geïnstalleerde app; `blob:` valt daar
> buiten, dus er is geen sprong meer.

---

## 2. Kruisje / uit een venster komen (mobiel)

- **Lang formulier (bv. "Bericht aan Backoffice" bij een klanturenstaat):**
  1. Open het venster, pas de berichttekst aan (typ iets in het tekstvak).
  2. Het **×** rechtsboven blijft altijd zichtbaar, ook als het venster meescrolt of het toetsenbord opent.
  3. × sluit het venster. (Ook "Annuleren" onderin en tikken naast het venster werken.)
- **Donkere modus:** het × is nu een zichtbare knop (was een bijna onzichtbaar wit blok). Lichte modus onveranderd.
- **Hulp & contact (mobiel):** open het, kies een onderwerp bij "Veelgestelde vragen" zodat er een
  antwoord bij komt → de kop met het **×** blijft in beeld en sluit het paneel.

---

## 3. Dashboard

- **Bij inloggen / na F5:** de maandkiezer opent op de **actuele maand** (september), voor beheerder én medewerker.
  Een handmatig gekozen maand blijft binnen de sessie; opnieuw inloggen zet terug.
- **Beheerderdashboard bij verse login:** je ziet kort **"Werkvoorraad laden…"** i.p.v. een teller die
  daarna omlaag springt. Let op: als er ondertussen echt data verandert op de gedeelde TEST (seed, testrun,
  verzending), verandert de teller wél — dat hoort.

---

## 4. Beheerder — accounts & klanturenstaat

- **Dubbel e-mailadres bij nieuw account:** blokkade-popup → **"Adres aanpassen"** → wijzig niets → **Annuleren**.
  Het bestaande account licht op; er is **geen** dubbel account aangemaakt. Een gelukte opslag licht het
  oude account **niet** meer per ongeluk op.
- **Klanturenstaat naar broker ("Controle afronden"):** als een TEST-mail een keer niet aankomt en je
  probeert opnieuw → er komt **geen tweede brokerregel** bij (geen dubbele klanturenstaatmail later).

---

## 5. TEST-dataset voor de "open taken"-run

Nieuw script, **kalender-relatief** (richt zich op de huidige maand):

```
php server/scripts/seed-test-working-month.php                                       # controleren
php server/scripts/seed-test-working-month.php --execute --confirm=SEED_TEST_WORKING_MONTH
```

Eerst TEST-baseline herstellen, dan seeden. Levert per medewerker een andere open taak:
Marc = open uren · Brian = open goedkeuring + klanturenstaat controleren ·
Stasjo = brokerroute controleren + open factuur (auto-aanmaak) · Shawn = verzending controleren.
Maakt **nul** e-mails aan.

---

## 6. Nog niet gedaan (bewust)

- Duidelijker (niet per se rood) indicator bij een klanturenstaat die als **"rechtstreeks gemaild" /
  "extern bevestigd"** is geregistreerd, zodat de beheerder er niet overheen leest. → volgende ronde.
- Twee bekende flakes in de volle seriële testrun (`TS-REV-UI-H-008`, `ADM-WR-N-006`) — slagen los;
  CI-`retries` vangt ze. Zie `BESLISTABEL.md` W9.

---

## Commits van vandaag (op `main`, allemaal op TEST)

| Commit | Onderwerp |
|---|---|
| `e5520b9` | login opent de actuele maand; externe urenbevestiging |
| `8ac3ce9` | septemberfactuur-baselinetest isoleren |
| `fc3fe0b` | actuele-maand dashboardvalidatie stabiliseren |
| `c47b2f3` | septemberworkflows + externe goedkeuring |
| `68da611` | ontbrekende septemberfactuur automatisch aanmaken |
| `2ce2e58` | TEST-deployscript CRLF/LF |
| `52aca53` | bewaakte septemberacceptatiecases |
| `a13d26b` | conflict-popup licht bestaand account niet meer per ongeluk uit |
| `c085797` | dashboard toont "Werkvoorraad laden…" tot eerste server-sync |
| `ef5c06b` | `seed-test-working-month.php` — kalender-relatief, alle open-taaktypes |
| `e75b5fb` | redesign-mockups gecommit; `debug.log` + migratiescript gitignored |
| `8fb340f` | brokerverzending-dedup + `DASH-N-017` + `BESLISTABEL.md` + FO/TO |
| `ef6e684` | mobiel: betrouwbaar document openen/downloaden + bereikbare kruisjes |
| `e2d047e` | `BESLISTABEL.md` bijgewerkt |
| `7b12a65` | laatste in-scope documentlink via blob-viewer |

Parkeerbranch: `design/hybrid-redesign` (`design/hybrid-2026-09/`) — herontwerp voor later.
