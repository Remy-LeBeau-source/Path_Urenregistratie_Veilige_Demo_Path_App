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
| Beslissingstabel | TEST-E2E-16 (rol × actie), TEST-E2E-17 (mailroutering × bijlage), TEST-E2E-25 (Overig-kanaal × Factuur meesturen) | §3, §7 |
| Toestandsovergang | TEST-E2E-12 (urenstaat-keten), TEST-E2E-13 (klanturenstaat-keten), TEST-E2E-24 (accountstatus), TEST-E2E-27 (heropen goedgekeurd) | §5, §6 |
| Use-case / end-to-end | TEST-E2E-04, TEST-E2E-10, TEST-E2E-11, TEST-E2E-23 (verse beheerder), TEST-E2E-31 (Marc + Brian afronden) | §7, §10 |
| Negatieve test / error guessing | TEST-E2E-18 (CSRF, XSS, stale version, injectie), TEST-E2E-28 (directe objectverwijzing tussen medewerkers) | §11 |
| Robuustheid / "monkey" | TEST-E2E-19 (lange strings, dubbelklik-idempotentie, navigatie tijdens request) | §11 |
| Data-integriteit / invarianten | TEST-E2E-20 (werkvoorraad-invariant), TEST-E2E-30 (factuurnummer-uniciteit bij gelijk sjabloon) | §4, §7 |
| Exploratory | TEST-SMOKE-02 (alle views), TEST-E2E-08 (herinneringen), TEST-E2E-21 (mededelingen + instellingen) | hele app |
| Gegevensstroom + neveneffect | TEST-E2E-22 (herinnering-planningslogica, server-wiring, voorbeeldmelding), TEST-E2E-29 (wachtwoord-reset over de echte SMTP-weg) | §8 |
| Deploycontract | TEST-SMOKE-01 (versie/headers/health), TEST-E2E-26 (CSP/securityheaders + PWA-assets + SW-registratie) | §2 |

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
- **TEST-E2E-23** — verse beheerder: de bestaande beheerder maakt via het beheer-pad een nieuwe administrator aan; die logt zelf in (rol = administrator, beheerschermen zichtbaar), keurt een ingediende urenstaat goed en rondt de factuur af tot de jsPDF-conceptfactuur met de drie mailroutes. Bevestigt dat een niet-demo beheerder volledig functioneert.
- **TEST-E2E-24** — accountlevenscyclus: een medewerker deactiveren blokkeert inloggen (401/403) terwijl het account zichtbaar en als inactief gemarkeerd blijft; heractiveren herstelt de toegang.
- **TEST-E2E-27** — heropen-beslissingstabel: een goedgekeurde urenstaat zónder factuur mag terug naar correctie; zodra er een factuur van is, wordt heropenen met 409 (`timesheet-invoiced`) geweigerd, status ongewijzigd.
- **TEST-E2E-30** — factuurnummer-invariant: twee medewerkers met exact hetzelfde nummer-sjabloon in dezelfde periode krijgen elk een uniek nummer; het tweede krijgt een numerieke suffix, nooit een dubbel nummer.
- **TEST-E2E-31** — Marc en Brian (nog niet via afronden getest): uren indienen → goedkeuren → factuur via de GUI afronden; elke definitieve factuur is de branded jsPDF-conceptfactuur zonder conceptwatermerk, met een per-opdracht factuurnummer.
- **TEST-E2E-25** — Overig-kanaal × *Factuur meesturen*: een medewerker krijgt twee ontvangers van het type Overig, bij één staat *Factuur meesturen* aan en bij één uit. Na de volledige GUI-afronding heeft de aangevinkte route de factuur-PDF als bijlage (`attachment_policy` bevat `invoice`) en de uitgevinkte geen (`none`); de salarisadministratie houdt haar vaste uitzondering. Lokaal gedekt door `E2E-H-012`; deze case dekt het op de echte deploy.
- **TEST-E2E-26** — deploycontract voor security en PWA: de CSP bevat `script-src 'self'` **zonder** `unsafe-inline` en heeft `frame-ancestors 'none'`, `object-src 'none'` en `worker-src 'self'`; `X-Frame-Options`, `Referrer-Policy` en `Permissions-Policy` staan; `sw.js` (JavaScript-content-type), `manifest.webmanifest` (valide JSON met naam/start_url/icons) en `assets/icon-192.png` (afbeelding) zijn ophaalbaar; in de browser registreert de service worker zich zonder CSP-overtredingen. Vangt precies de klasse fout waarbij de CSP het inline SW-script stil blokkeerde.
- **TEST-E2E-28** — directe objectverwijzing tussen medewerkers: als medewerker Stasjo elke poging om de uren, klanturenstaat, klanturenstaat-download, goedkeuring of het auditlog van een **andere** medewerker te raken → 401/403 (download 404 mag ook), en de download geeft nooit PDF-bytes terug. Bewijst dat de autorisatie per object op de live host geldt, niet alleen dat de navigatie verborgen is.
- **TEST-E2E-29** — wachtwoord-reset over de echte verzendweg: met maillevering aan (de normale TEST-stand, géén pauze zoals E2E-02) levert een publieke *wachtwoord vergeten*-aanvraag een `password_reset`-rij op die status `sent` bereikt (niet blijft hangen op `queued`, niet `failed`), met de oorspronkelijke ontvanger auditbaar in de rij en zonder token in de HTTP-response.
