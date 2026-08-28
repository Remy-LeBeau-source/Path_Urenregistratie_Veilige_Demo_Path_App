# Live TEST-regressie — testcharter

Gestructureerde testcampagne die **rechtstreeks tegen de gedeployde TEST-site**
(`https://uren-test.pathconsultancy.nl`) draait, ontworpen met ISTQB/TMap-technieken
en gebaseerd op het Functioneel Ontwerp (`FUNCTIONEEL-ONTWERP.md`). Vangt deploy-,
config- en omgevingsfouten die de lokale suite niet ziet.

## Werkwijze

1. **Volledige pass** — alle cases draaien (niet-serieel: één val stopt de rest niet).
2. **Bugs verzamelen** — alle falende asserties in één lijst.
3. **Bulk fixen** — de verzamelde bugs samen oplossen, daarna pas hertesten.
4. **Hertesten** tot groen.
5. Elke muterende case zet daarna de gedeelde TEST-baseline terug.

## Techniekdekking

| Techniek | Cases | FO |
|---|---|---|
| Equivalentieklassen (EP) | TEST-E2E-14 (uploadtypen), TEST-E2E-15 (uren-invoer) | §5, §6 |
| Grenswaardenanalyse (BVA) | TEST-E2E-15 (0 / 24 / <0 / >24), TEST-E2E-14 (2 MB-grens) | §5, §6 |
| Beslissingstabel | TEST-E2E-16 (rol × actie), TEST-E2E-17 (mailroutering × bijlage) | §3, §7 |
| Toestandsovergang | TEST-E2E-12 (urenstaat-keten + ongeldige overgangen), TEST-E2E-13 (klanturenstaat-keten) | §5, §6 |
| Use-case / end-to-end | TEST-E2E-04, TEST-E2E-10, TEST-E2E-11 | §7, §10 |
| Negatieve test / error guessing | TEST-E2E-18 (CSRF, XSS, stale version, injectie) | §11 |
| Robuustheid / "monkey" | TEST-E2E-19 (lange strings, dubbelklik-idempotentie, navigatie tijdens request) | §11 |
| Data-integriteit / invarianten | TEST-E2E-20 (werkvoorraad: alle = Backoffice + medewerkers; maandnavigatie wijzigt niets) | §4 |
| Exploratory | TEST-SMOKE-02 (alle views), TEST-E2E-08 (herinneringen), TEST-E2E-21 (mededelingen + instellingen) | hele app |
| Gegevensstroom + neveneffect | TEST-E2E-22 (herinnering-planningslogica, server-wiring, voorbeeldmelding) | §8 |
| Deploycontract | TEST-SMOKE-01 (versie/headers/health) | §2 |

## Cases

### Read-only smoke
- **TEST-SMOKE-01..04** — versie/headers/health, alle views zonder console/HTTP-fouten, rolafscherming, factuurpreview.

### End-to-end ketens (§7, §10)
- **TEST-E2E-01** login juist/fout · **TEST-E2E-02** wachtwoord vergeten (tokenlevenscyclus) · **TEST-E2E-03** medewerker aanmaken + eerste login.
- **TEST-E2E-04** volledige factuur+mailketen; definitieve factuur is de jsPDF-conceptfactuur **zonder CONCEPT-markering** + mailroutering.
- **TEST-E2E-05** acceptatieconsole: vijf scenario-mails naar de vaste sink.
- **TEST-E2E-10** factuur voor **elke** demo-medewerker via de echte GUI-afronding.
- **TEST-E2E-11** nieuwe medewerker via het **beheerscherm** + volledige flow tot jsPDF-factuur.

### Techniek-cases
- **TEST-E2E-12** — urenstaat-toestandsketen: concept → ingediend → correctie (met reden, eigenaar terug naar medewerker) → herindienen → goedgekeurd; ongeldige overgang: medewerker wijzigt na indienen → geweigerd, status ongewijzigd.
- **TEST-E2E-13** — klanturenstaat-keten: upload → ontvangen → nieuw document gevraagd → herindienen → goedgekeurd; document blijft inline als PDF bekijkbaar na herladen en nieuwe login.
- **TEST-E2E-14** — upload-EP/BVA: geldige PDF ✓, geldige JPG → PDF ✓, `.txt` hernoemd naar `.pdf` ✗, corrupte bytes ✗, >2 MB ✗; een bestaand concept blijft bij weigering ongewijzigd.
- **TEST-E2E-15** — uren-invoer EP/BVA: 0 ✓, 24 ✓, negatief ✗, >24 ✗, niet-numeriek ✗.
- **TEST-E2E-16** — rol-beslissingstabel: medewerker probeert goedkeuren, factureren, gebruikersbeheer en reset via de API → elk 401/403; beheerder mag het wel.
- **TEST-E2E-17** — mailroutering-beslissingstabel: één afronding = **exact drie** aparte deliveries (broker, boekhouding, salaris), geen CC/BCC-bundel; broker met factuur, boekhouding factuur, salaris geen bijlage; "Overig"-ontvanger met/zonder *Factuur meesturen*.
- **TEST-E2E-18** — negatief/security: POST zonder CSRF → geweigerd; `<script>`-payload in een tekstveld → veilig opgeslagen en geëscaped weergegeven; verouderde `expected_version` → duidelijke stale-version-fout, geen stille overschrijving; injectie-achtige invoer lekt geen serverfout.
- **TEST-E2E-19** — robuustheid: zeer lange string in een tekstveld wordt begrensd of nette fout; dubbel indienen/goedkeuren is idempotent (geen dubbele factuur); wegnavigeren tijdens een write laat geen half-record achter.
- **TEST-E2E-20** — werkvoorraad-invarianten: `alle acties = Backoffice + medewerkers`; na reset 12/7/5 verdeeld over juni/juli/augustus; maandnavigatie, render of rolwissel wijzigen de totalen niet.
- **TEST-E2E-21** — exploratory: mededelingenscherm (beheerder plaatst/trekt in), instellingen-inhoudsmenu, elke primaire knop aanwezig.
- **TEST-E2E-22** — herinneringen: de samenvatting `#reminder-schedule-summary` is een zuivere afleiding van de instellingen (beslissingstabel per regel + grenswaarden dag/tijd + enkelvoud/meervoud "regel"/"regels" + "Planning uit"); de klanturenstaat-tijd — de enige regel met een echte serverkolom — bereikt de server en overleeft herladen; "Voorbeeldmelding maken" laat de mailwachtrij ongemoeid en meldt dat expliciet. Het op de klok geplande afvuren valt buiten scope: dat vraagt een serverplanning die op TEST niet actief is.
