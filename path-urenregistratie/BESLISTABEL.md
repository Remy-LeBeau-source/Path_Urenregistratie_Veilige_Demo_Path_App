# Beslistabel — Path Uren & Facturatie

Vastgelegde keuzes tot en met 3 september 2026. **Doel: niet opnieuw bespreken.**
Wijkt een nieuwe wens hiervan af, dan wint de nieuwe wens — pas dan deze tabel aan.
Losse regressiestatus staat in `MASTERCHECKLIST.md`; livegang-checklist in `PRODUCTIE-CHECKLIST.md`.

## 1. Werkwijze & release

| # | Keuze | Reden | Status |
|---|---|---|---|
| W1 | Werk rechtstreeks vanuit `main`. | Kleine solo-stroom, geen PR-overhead. | vast |
| W2 | Deploy uitsluitend naar **TEST**. De gebruiker test TEST zelf. | Gecontroleerde acceptatie vóór PROD. | vast |
| W3 | **PROD wordt alleen door de gebruiker vrijgegeven/doorgezet.** Claude raakt PROD niet aan (geen deploy, geen `Promote Prod`, geen SQL). | Onomkeerbaar en naar buiten gericht. | vast |
| W4 | Pipeline: pushen naar `main` start de Release Pipeline; Validate → Promote Test → **Deploy Test to TransIP** gebeurt automatisch. `Promote Prod` blijft handmatig. | — | vast |
| W5 | `Publish Live Docs` is een niet-blokkerende post-deploy-job (GitHub Pages staat uit). Een rode Live Docs blokkeert de TEST-deploy niet. | — | vast |
| W6 | Testmethode: volledige pass, faalgevallen verzamelen, bulk-fixen, hertesten. Elk geval hoort in een feature-bestand. | Sneller dan één-voor-één. | vast |
| W7 | CI-flake ≠ regressie. Een case die lokaal 2–3× groen is en in CI viel op een drukke runner, is flake. Voorbeeld: `TS-REV-UI-H-008` (Live Docs-run 2 sep). | — | vast |
| W8 | Geen `--no-verify`, geen forced clicks, geen timeout verhogen om een test groen te krijgen. | Vertrouwen in de suite. | vast |
| W9 | **Voormalige flakes in de volle seriële regressie** (`workers:1`, ~39 min, geen retries lokaal): `TS-REV-UI-H-008` en `ADM-WR-N-006`. Beide vielen alleen om na ~340 voorgaande tests door opgebouwde DB-state. **Opgelost in 1.0.16:** `TS-REV-UI-H-008` mockt nu `bootstrap.php` (start-datum medewerker 2 terug vóór de periode), `timesheets.php` en `customer-timesheets.php` volledig — de reviewketen-assertie hangt niet meer aan gedeelde DB-state. `ADM-WR-N-006` doet drie echte sequentiële serverwrites tegen een database met honderden opgebouwde accounts; dat is traag, niet flaky — `test.slow()` + 20s op de setup-asserties (de blokkade-assertie zelf staat nog op 10s). Dit valt niet onder W8: het resultaat klopte altijd, alleen de standaard 5s-expect was te kort voor een echte trage save. | Testhygiëne, geen app-bug. | vast |

| W11 | **Scroll sluit de topbalkmenu's, maar niet vlak na een hertekening.** `window.scroll` sloot profiel- en meldingenmenu ook bij een scroll-event dat de gebruiker niet zelf maakte: een achtergrond-hertekening (werkvoorraad die binnenkomt, laadtekst die wordt vervangen) verandert de paginahoogte en geeft zo'n event. Sinds 0.9.170 wordt een scroll binnen `LAYOUT_SCROLL_GRACE_MS` (300 ms) na `markLayoutRender()` genegeerd. Dit was al langer een wrat — `NOT-H-009` had er een eigen omweg voor — en werd zichtbaar doordat 0.9.165 een laadtoestand toevoegde. Verklaart de flakes op `DASH-H-004` en `NOT-H-009`. **1.0.20:** `refreshNotificationsReadApi` roept nu óók `markLayoutRender()` aan vóór `renderNotifications()` / `renderEmployeeAnnouncementArchive()` (die pad ontbrak), en `NOT-H-009` heropent het menu via een `toPass`-lus i.p.v. één `isHidden`-check — een dubbele achtergrond-render kon de omweg anders alsnog verslaan (viel om in de 1.0.19-pipeline, Validate-shard 3). | Een menu dat uit zichzelf dichtklapt vlak na inloggen. | vast |
| W12 | **Dekkingsronde is standaard.** Op het commando **"dekkingsronde"** (of "loop de hele app na op testdekking") loopt Claude elk scherm, elke flow en elk zichtbaar/klikbaar element van de app af, kruist dat af tegen de regressiesuite, en maakt voor elk gat een nieuwe case met **echte assertions** — desktop én mobiel (`mobile-chrome` = Android, `mobile-safari` = iOS), inclusief database-controles (opgeslagen rij, audit_log, e-mail-aflevering, geen weesrijen). Fixen tot groen, nooit rood of skipped inleveren. Volledige procedure en gebiedenlijst: **`DEKKINGSRONDE.md`**. Draaien in elk geval vóór een Promote Prod. Los hiervan geldt permanent: [[new-work-ships-with-regression-tests]] — nieuw werk gaat in dezelfde release de suite in. | De gebruiker wil niet meer handmatig hoeven testen om zeker te zijn dat het werkt. | vast |
| W10 | **Versieschema.** Op 3 sep 2026 besloten: **nu al naar `1.0.0`** (bij versie 0.9.173), niet wachten op Promote Prod. Vanaf hier `1.0.x` ophogen per commit tijdens de dekkingsronde; ná go-live alleen per echte **productierelease** (`1.0.1` fixes, `1.1.0` functies). Het nummer staat op 13 plekken in 5 bestanden; zet het nooit met de hand maar met **`npm run version:set <versie>`**. `npm run version:check` (draait mee in `npm run check`) faalt zodra ergens een ander nummer staat dan in `package.json`. | "0.9.x" leest voor een echte gebruiker als onaf; handmatig gelijkzetten was foutgevoelig. | vast |

## 2. Productie & pilot

| # | Keuze | Reden | Status |
|---|---|---|---|
| P1 | App staat live op `uren.pathconsultancy.nl`, versie 0.9.159, **mail UIT**. | — | feit |
| P2 | De master-datamigratie naar PROD is **al gebeurd** (eenmalig). `server/scripts/migrate-test-masterdata-to-production.php` **nooit opnieuw op PROD draaien**; blijft buiten Git (gitignored). **4 sep 2026:** de 4 echte medewerkers (Marc/Brian/Stasjo/Shawn) kregen daarbij `employment_start_date` letterlijk overgenomen uit de TEST-seed (destijds 1 jan/1 jul) — géén echte startdatum. Gebruiker wil dat iedereen op PROD vanaf **1 september 2026** begint (BESLISTABEL D1-gerelateerd: geen oudere spookmaanden). Dat kan alleen handmatig, in de app zelf: Teambeheer → medewerker → Startdatum → opslaan, per persoon, door iemand met PROD-toegang — niet door Claude (W3) en niet door het script opnieuw te draaien. Het script is lokaal wél aangepast (`PROD_EMPLOYMENT_START_DATE`) voor het geval van een toekomstige noodherbouw, maar blijft ongebruikt/gitignored. | Onomkeerbaar; audit-record op schijf. | vast |
| P3 | De 4 echte medewerkeraccounts (Marc, Brian, Stasjo, Shawn) blijven **gelockt** (`force_password_change`, geen wachtwoord) tot expliciete vrijgave. | Kunnen niet inloggen → kunnen niks in gang zetten. | vast |
| P4 | Productiepilotmail alleen via `configure-production-mail-pilot.php --mode=pilot`. `allowed_recipients` = **uitsluitend de dummy-sinks** (`gambitizanagi+prod-boekhouder@`, `+prod-salaris@`, broker/klant → `gambitizanagi@gmail.com`). In pilotmodus wordt elke andere ontvanger geblokkeerd. | Dubbel slot: gelockte accounts + allowlist. | vast |
| P5 | De PROD-dummy `PROD Pilot Medewerker` **niet herbouwen** en de flow **niet volledig her-testen**. Het migratiescript maakte 'm mét geverifieerde asserties. Wil je één finale check: alleen de eigen periodedata van de pilot wissen (scoped, transactie, pre-count), routes staan al op de sinks. | Herbouwen = drift, geen voordeel. | vast |
| P6 | Automatische reminders gaan **niet** aan tot: server-side planner + per-medewerker fail-closed opt-in + dummy-only bewezen. Nu correct label "Voorbereiding · niet automatisch". | Releasekritieke productlogica. | vast |
| P7 | `allow_demo_migrations` blijft op PROD `false`. Wachtwoorden/tokens/SSH-sleutels/`config.local.php` komen niet in Git. | — | vast |

## 3. Dashboard & maandkiezer

| # | Keuze | Reden | Status |
|---|---|---|---|
| D1 | Bij **elke login én elke klik op Dashboard/Home** springt de maandkiezer naar de actuele kalendermaand (Europe/Amsterdam), voor **beide rollen** (`resetHomeDashboardState`). "Dashboard" betekent zo altijd "overzicht van deze maand". Een handmatig gekozen maand blijft alleen actief zolang je op **andere** schermen navigeert (Facturen, Goedkeuringen, Mijn uren); zodra je Dashboard opent, staat de app weer op nu. Regressie: `DASH-H-018`, `DASH-H-021`, `MOB-H-022`. | Commit `c47b2f3` / `e5520b9`; Dashboard-reset toegevoegd 1.0.17 op verzoek gebruiker ("bij klikken dashboard moet je toch altijd weer naar de huidige maand"). `currentRole` wordt niet gepersisteerd — altijd uit de auth-sessie afgeleid. | vast |
| D2 | Het beheerderdashboard toont **"Werkvoorraad laden…"** tot de eerste `refreshAdminWorkflowReadApi` binnen is (vlag `readApiRuntime.adminWorkflowHydrated`), i.p.v. de lokale seed-teller die daarna omlaag corrigeert. | Commit `c085797`. Spiegelt de employee-hydratatie-gate. | vast |
| D3 | De teller die op TEST "springt" (bv. 13→14) is meestal **echte data die verandert** op de gedeelde omgeving (seeds, testruns, achtergrond-verzendingen), niet een render-bug. De toast "… e-mails verzonden" bewijst een echte mutatie. In PROD (één beheerder, mail uit, geen seeding) staat de teller stil. | — | vast |
| D4 | Openstaand (optioneel, niet nu): de gate óók laten pakken terwijl auth nog `checking` is, om de sub-seconde eerste-frame-flits weg te nemen. Alleen als aparte vervolg-commit, niet mid-pilot. | Cosmetisch, nooit foute data. | open |

## 4. Modals

| # | Keuze | Reden | Status |
|---|---|---|---|
| M1 | `closeModal(runCloseAction = false)` — de sluit-callback (`modalCloseAction`) draait **alleen bij expliciet annuleren/sluiten**, niet bij een geslaagde opslag. `revealExistingStaffAccount` herstelt `focusExistingAccount` als sluit-actie ná `reopenForm()`. | Commit `a13d26b`. Verhelpt `ADM-WR-N-004`: succesvol opslaan lichtte per ongeluk het oude conflicterende account uit. `closeAction` wordt in de hele app maar op één plek gezet, dus geen neveneffect elders. | vast |
| M2 | **`send_to_broker` dedupt de brokerlevering.** Bij een mislukte TEST-aflevering valt de brokerregel na de 1e poging terug op `queued` en de 502 laat de klanturenstaat op `approved`. Elke volgende `Controle afronden` maakte een nieuwe `email_deliveries`-regel → dubbele klanturenstaatmails. Nu: vóór insert zoeken naar een bestaande brokerregel voor deze factuur met `attachment_policy = "customer_timesheet"` (onderscheidt de klanturenstaatroute van de maandelijkse factuur-brokermail); `sent` → hergebruik zonder verzenden, `processing` → 409, `queued` → hergebruik + tekst bijwerken, niets → nieuwe insert. `server/api/customer-timesheets.php`. Happy path (`CTS-API-H-009`) ongewijzigd. | Gevonden in de exploratieronde 3 sep. | vast |

## 5. TEST-dataset ("open taken run")

| # | Keuze | Reden | Status |
|---|---|---|---|
| T1 | Eén bewaakt seed-script: **`server/scripts/seed-test-working-month.php`** (hernoemd van `seed-test-september-acceptance.php`), confirm-token `SEED_TEST_WORKING_MONTH`. | Eén bron voor de terugkerende run. | vast |
| T2 | **Kalender-relatief**: richt zich op de kalendermaand van nu, of `--month=JJJJ-MM`. Niet vastpinnen op één maand — dat brak steeds bij maandovergang. | Login opent altijd de actuele maand (D1). | vast |
| T3 | De 4 actieve TEST-medewerkers dekken samen elke open Backoffice-taak: Marc `draft` (open uren) · Brian `submitted` + klanturenstaat `received` (open goedkeuring + klanturenstaat controleren) · Stasjo `approved` + klanturenstaat `approved` + géén factuurrij (brokerroute controleren + open factuur via auto-aanmaak) · Shawn `approved` + rechtstreeks gemaild + factuurrij (verzending controleren). | Volledige taakketen in één run, inclusief open factuur + open urenstaat. | vast |
| T4 | Guards: alleen exact gedeeld TEST-contract, weigert een maand met bestaande uren/facturen, **nul e-maildeliveries**. | Nooit stil overschrijven; TEST-mailbox niet vervuilen. | vast |
| T5 | Werkwijze: eerst TEST-baseline herstellen, dan seeden, dan de open-taken run lopen. Niet tegelijk andere testruns tegen dezelfde maand draaien (anders churn zoals D3). | Reproduceerbaar. | vast |
| T6 | Invoice-PDF: nooit de kale server-fallback-PDF naar een echte mailbox laten gaan; jsPDF is verplicht. Guard in `scripts/smoke-test.mjs`. | Bestaande afspraak. | vast |

## 6. Herontwerp

| # | Keuze | Reden | Status |
|---|---|---|---|
| R1 | Het hybride herontwerp wordt **niet nu geïmplementeerd** — "doen we ooit". | Pilot heeft voorrang. | vast |
| R2 | Bron staat geparkeerd op branch **`design/hybrid-redesign`** (`design/hybrid-2026-09/`: `build.mjs`, 10 `.dc.html`, `canvas.json`, README). `main` blijft ongemoeid. | Backup zonder de app te raken. | vast |
| R3 | Ook bewaard: bewerkbare Artifact-canvas op het Claude-account (`/artifacts`), en JPG-mockups in `design-mockups/redesign-options-2026-09/` + `cohesive-redesign-1111-4444/` + `redesign-packages-2026-09/`. | — | feit |
| R4 | Hybride-richting (voor later): warm crème vlak, Roboto Slab serif-koppen, Path-groen (`#3abd9d`/`#169276`, géén teal), navy sidebar. Overnemen: "Actuele maand bij inloggen"-pill, groen/oranje/grijs-legenda, KPI-rij (aantal + %), zoeken + paginering, Documentarchief-modal met stepper bovenaan + Factuur/Urenstaat-kaarten naast elkaar + omkaderde "Externe bevestiging terugdraaien". Niet overnemen: verzonnen modules (Declaraties, Periodieke verloning, Werkgevers). | Synthese van 3 mockups. | vast |
| R5 | Ruwe schatting implementatie: visuele refresh ~3–5 werkdagen; volledige hybride ~8–15 werkdagen; grootste kost = ~380 E2E-cases groen houden bij DOM-verschuivingen. | — | referentie |

## 7. Mobiel & documentafhandeling

| # | Keuze | Reden | Status |
|---|---|---|---|
| MO1 | **Bekijken en downloaden van documenten lopen altijd via `fetch` → blob** (`openDocumentInTab` / `downloadDocument` / `deliverBlobDownload`). De `Content-Disposition` van de server (soms `inline`, soms `attachment`) bepaalt niet meer of Chrome toont of ophaalt. | "Soms wel soms niet" na downloaden op mobiel. Commit `ef6e684`. | vast |
| MO2 | **Bekijken** hergebruikt één vast tabblad `target="path-document"` (nooit `_blank`, nooit navigatie in het app-tabblad). **Downloaden** navigeert nooit. Zo neemt de PDF-viewer de web-app/PWA-sessie niet meer over. `downloadInvoicePdf` gebruikt `deliverBlobDownload` i.p.v. `doc.save()`. | jsPDF `doc.save()` viel op Android/PWA terug op navigatie naar de blob-URL. | vast |
| MO3 | `.modal-close` is **sticky** (was absolute) → het kruisje blijft in beeld ook als een lang formulier of toetsenbord-focus de modal omhoog scrolt. Donkere modus kreeg een expliciete achtergrond/kleur (was een bijna onzichtbaar wit blok). **Lichte modus ongewijzigd.** | Gebruiker kon "alleen F5" om eruit te komen. | vast |
| MO4 | Het mobiele **Hulp & contact**-paneel is boven én onder verankerd met `dvh` → de koptekst met het kruisje blijft zichtbaar nadat een FAQ-antwoord het paneel laat groeien. | Kruisje schoof achter de adresbalk. `MOB-H-019`. | vast |
| MO5 | Openstaand: bij een klanturenstaat die als "rechtstreeks gemaild" of "extern bevestigd" is geregistreerd wil de gebruiker een duidelijker (niet per se rode) indicator, zodat de beheerder er niet overheen leest. Nog niet gedaan — na de downloadflow. | — | open |

## 7b. Accountuitnodiging (0.9.163)

| # | Keuze | Waarom | Status |
|---|---|---|---|
| U1 | Bij een **nieuwe** medewerker/beheerder staat het uitnodigingsvinkje standaard **aan**; bij het **bewerken** van een bestaande persoon standaard **uit** (anders opnieuw uitnodigen bij elke wijziging). | Al zo, bevestigd. | vast |
| U2 | Op **TEST** gaat elke uitnodiging/reset naar de vaste `invitation_recipient` (`giovanno.maatsen@pathconsultancy.nl`), met `[TEST uitnodiging voor <adres>]` in het onderwerp. Nooit naar het ingevulde adres. Productie mailt wél het echte adres. | TEST mag geen echte onbekende mailen. | vast |
| U3 | De uitnodigingstekst is een **aanpasbaar kanaalsjabloon** `account_invitation` (Instellingen → Standaardteksten). Leeg = meegeleverde welkomsttekst. Tokens: `{naam} {app} {bedrijf} {link} {geldigheid}`. Vangnet: ontbreekt `{link}` in de eigen tekst, dan wordt de link er alsnog onder gezet. | Tekst mocht niet meer in de code vastzitten. | vast |
| U4 | Vaste afzender-handtekening onder de uitnodiging: **"Robot Path IT" / "Automatisering & accountbeheer"** + `support_email` + website + slogan. Wordt automatisch toegevoegd, net als bij de factuurmails. | Herkenbaar als automatisch bericht. | vast |
| U5 | Een **door de beheerder** gestuurde uitnodiging/reset (`purpose = invitation`) kent **geen** misbruikbegrenzing. De publieke "wachtwoord vergeten" houdt 3 per 15 min. | Beheerder is ingelogd; meerdere pogingen bij inrichten/testen moeten lukken. | vast |

## 8. Omgeving & techniek (feiten, geen keuzes)

| # | Feit |
|---|---|
| E1 | Dev-machine: native MySQL 8.0 + winget PHP 8.4, geen Docker. Test-DB `path_urenregistratie_test`. |
| E2 | VS Code DB Client kan de TransIP-DB's niet bereiken (ProxySQL). Data op TEST/PROD wijzigen via phpMyAdmin of SSH-shell / migraties. |
| E3 | PDO native prepares: een named placeholder mag **niet twee keer** in één query (SQLSTATE[HY093]). Brak 0.9.147, hotfix 0.9.148. |
| E4 | Display-koppen gebruiken al `"Roboto Slab", Georgia, serif`; accent `--mint` `#3abd9d` / `--mint-dark` `#169276`; `--radius: 18px`. Bron: `assets/styles.css`. |
| E5 | 24 feature-bestanden, 34 spec-bestanden. Kern-E2E-keten (`E2E-H-*`), factuurset (`INV-*`), admin-writes (`ADM-WR-*`), dashboard (`DASH-*`), mailqueue (`EQ-*`). |
| E6 | De installatienaam per omgeving komt uit **`manifest.php`** (leest `server/config.local.php` → `environment`): test = "Path TEST", development = "Path DEV", anders "Path Uren". **Alleen de naam** verschilt per omgeving; `theme_color` (statusbalk) is overal navy `#0D1B38`, gelijk aan de web-app en productie (0.9.164 — was oranje `#BB7623` op test). `index.html` linkt `manifest.php`. Vite hashte dit bestand naar `assets/manifest-XXXX.php` waardoor `__DIR__` verkeerd wees en de naam altijd op productie terugviel; `vite.config.js` houdt het nu onbewerkt in de webroot (`writeBundle` herstelt de link, `manifest.webmanifest` blijft als statische fallback). Bewaakt door `[TEST-E2E-26]`. Een al geïnstalleerde PWA hernoemt zichzelf niet — opnieuw toevoegen aan beginscherm. |
