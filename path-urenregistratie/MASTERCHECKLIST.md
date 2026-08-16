# Masterchecklist Path Uren & Facturatie

Dit is vanaf nu de volledige masterchecklist en vaste technische bron van waarheid.
Na iedere stap wordt deze lijst bijgewerkt met wat klaar, gedeeltelijk klaar, open of geblokkeerd is.

## Betekenis van de statussen

- [x] afgerond, getest en waar nodig gecommit/gepusht
- [-] nog niet afgerond of nog open
- [!] geblokkeerd of test mislukt

## Path Uren & Facturatie — hoofdstatus (managementoverzicht)

Dit is het compacte overzicht om in één oogopslag te zien wat klaar is, wat nog in VS Code
gebouwd kan worden, en wat pas als allerlaatste (buiten VS Code) aan bod komt. Volledige details
staan onder de genummerde fases verderop in dit document.

| Onderdeel | Status | Wat betekent dit? |
|---|---|---|
| Fase 1 — Lokale basis | ✅ Klaar | PHP/MySQL/lokale tooling |
| Fase 2 — Database/server-led state | ✅ Klaar | Alle businesskritische writes server-led; localStorage beperkt tot UI-state |
| Fase 3 — Read-API | ✅ Klaar | Frontend leest serverdata |
| Fase 4 — Auth & rollen | ✅ VS Code-scope klaar | Admin/medewerker/sessies, persistente loginblokkade en eenmalige wachtwoordlinks |
| Fase 5 — Security | ✅ VS Code-scope klaar | Timeout, sliding session, login-audit, dependency-scan; productieheaders (CORS/CSP/HSTS) later op echt domein |
| Fase 6 — Playwright/BDD/Allure/Living Docs | ✅ Pariteit bewaakt | Uitvoerbare features, step-mapping, GUI-smoke en volledige Playwright-/DB-regressie zijn gekoppeld; nieuwe zichtbare regressies krijgen een gerichte case |
| Fase 7 — CI/CD | ✅ v0.9.66 groen en live | Automatische PROD- en TEST-uitrol bewezen; pipeline-run `31888079947` voor SHA `d749b9e32ff4` is volledig groen |
| Fase 8 — Uren indienen | ✅ Klaar | Concept → indienen |
| Fase 9 — Correctie/goedkeuring | ✅ Technisch klaar | Productieacceptatie later |
| Fase 10 — Klanturenstaat | ✅ VS Code-scope klaar | JPG/PNG → PDF server-side gebouwd en getest (CTS-API-H-005) |
| Fase 11 — Facturen | ✅ VS Code-scope klaar | Server-side PDF + storage key + geautoriseerde download + inhoudscontrole gebouwd en getest (INV-H-004, INV-N-013) |
| Fase 12 — Mailqueue | 🛠️ Techniek klaar; acceptatie open | Fail-closed queue, TEST-sink en gescheiden routes zijn gebouwd; volledige menselijke controle van alle teksten en echte PDF-bijlagen loopt nog |
| Fase 13 — Bedrijfsgegevens | ✅ VS Code-scope klaar | Definitieve gegevens/accounts → Fase 16 |
| Fase 14 — TransIP | ✅ VS Code-scope klaar | Deployment/config → Fase 16 |
| Fase 15 — Release-hardening | ✅ VS Code-scope klaar | Concurrency, jaarwisseling, uploads, accessibility en PWA-manifest/service worker gebouwd en getest |
| **Fase 16 — Operationeel/live** | 🛠️ Productie en TEST live; mailacceptatie loopt | Google Relay accepteert het bewezen TransIP-IP en een echte TEST-mail is ontvangen; de vijf complete mailroutes en bijlagen moeten nog volledig worden afgetekend |

### Technische eindsprint (in VS Code afgerond deze sessie)

```
TECHNISCHE EINDSPRINT
        │
        ├── Fase 10
        │     JPG/PNG → PDF (server-side, GD + hand-rolled PDF-writer)
        │
        ├── Fase 11
        │     Server-side factuur-PDF
        │     pdf_storage_key
        │     geautoriseerde download
        │     PDF-inhoudscontrole
        │
        ├── Fase 12
        │     PDF als mailbijlage (nu mogelijk via Fase 11)
        │     klanturenstaat als bijlage
        │     retry / max retries / foutstatus (al aanwezig, geverifieerd)
        │
        └── Fase 15
              dubbele/gelijktijdige requests (2 beheerders)
              december → januari jaarwisseling
              grote/foute uploads
              accessibility basis (toetsenbord + labels)
              dependency scan (al bestaand script)
              PWA manifest + service worker
```

### Fase 16 — laatste fase (verzameld, buiten VS Code)

```
FASE 16 — LAATSTE FASE

GitHub website (branch protection, statuschecks, approval)
TransIP (hosting, SSL, documentroot, wachtwoorden)
Productiedatabase
Backups + restore
Productieaccounts
Definitieve Path/QSI gegevens
Circle8 / boekhouder / EasySalary gegevens
Google Workspace / Gmail
SMTP vs Gmail API
Echte mail activeren
Productieacceptatie
Fysieke iPhone / Android / tablet
PWA-installatie op een echt toestel
Monitoring
Go-live
Rollback
Eerste echte maandflow
Post-live beheer
```

## Actuele stand

### 2026-08-16 · v0.9.78 mobiele appvriendelijke quick fix

- De mobiele app is compacter en rustiger gemaakt zonder desktopgedrag te breken.
- De klanturenstaat-maandkeuze sluit weer direct en de onderwerpregels zijn gesynchroniseerd met
  `... ter controle`.
- De releaseversie is opgehoogd naar v0.9.78; build en smoke zijn opnieuw groen.

### Leidende momentopname — 2026-08-15

Deze momentopname is leidend; de regels eronder bewaren het technische en historische bewijs.

- [x] PROD `https://uren.pathconsultancy.nl` en TEST `https://uren-test.pathconsultancy.nl`
  serveren v0.9.66 vanaf main-SHA `d749b9e32ff4`.
- [x] Release Pipeline-run `31888079947` is volledig groen; validatie, TEST-uitrol,
  Living Documentation en PROD-promotie zijn afgerond.
- [x] LOCAL, TEST en PROD gebruiken dezelfde bedrijfslogica. Alleen accountkeuze, resetrechten,
  testdata en mailaflevering verschillen bewust per omgeving.
- [x] TEST-mail wordt uitsluitend naar de beveiligde sink
  `giovanno.maatsen@pathconsultancy.nl` afgeleverd en vermeldt daarnaast voor welke functionele
  ontvanger het bericht oorspronkelijk bedoeld was. PROD behoudt de echte ontvangers.
- [x] De drie factuurroutes zijn technisch gescheiden: broker krijgt factuur alleen,
  boekhouding alleen factuur en salarisadministratie alleen ureninformatie zonder bijlage;
  de klanturenstaat wordt via de aparte klanturenstaattaak verzonden.
- [x] Wachtwoordherstel en uitnodiging gebruiken eenmalige links; geheime links en volledige
  berichtinhoud worden niet in de verzendadministratie getoond.
- [x] Nieuwe lokale regressiefix: na `Overzicht inklappen` en opnieuw `Overzicht openen` staan alle
  maandblokken weer ingeklapt. `npm run check` en `DASH-H-017` zijn groen.
- [x] De inklapfix is opgenomen in de huidige v0.9.69-releasekandidaat.
- [x] De volledige v0.9.69 GUI-smoke is lokaal groen, inclusief desktop, mobiel, notificaties en
  de gescheiden LOCAL/TEST/PROD-mailstatussen.
- [x] De volledige v0.9.69 Playwright-matrix is lokaal via vier beheerde shards groen:
  64 + 47 + 53 + 51 = 215/215 uitvoeringen op de geïsoleerde testdatabase.
- [x] v0.9.69 is lokaal volledig groen: releasebuild, `npm run check`, DB-H-001, 0 dependency-
  kwetsbaarheden, volledige GUI-smoke en 215/215 Playwright-uitvoeringen. Allure en Living Docs
  bevatten dezelfde volledige groene run.
- [x] v0.9.70 maakt LOCAL een volledig visuele TEST-voorcontrole: naast iedere bedoelde
  productieroute (broker, klanturenstaatcontrole, factuur/salarisverzending, Instellingen,
  acceptatiescenario's, bevestiging en verzendadministratie) toont LOCAL expliciet de vaste
  gesimuleerde TEST-ontvanger `giovanno.maatsen@pathconsultancy.nl` met "geen verzending". `EQ-H-025`,
  `E2E-H-005` en de volledige smoke zijn hierop gericht groen bevestigd.
- [-] Voor v0.9.70 volgen nog commit, push en automatische TEST-/PROD-uitrol.
- [-] Menselijke TEST-mailacceptatie blijft open totdat broker-, boekhouding-, salaris-,
  wachtwoordherstel- en uitnodigingsmail inhoudelijk zijn gecontroleerd, inclusief de echte
  factuur- en klanturenstaat-PDF waar die route een bijlage vereist.
- [-] De verzendadministratie moet nog productklaar compact worden gehouden (standaard een korte
  recente lijst, uitbreidbaar zonder wachtwoordlinks of volledige berichtinhoud te tonen).
- [x] TEST-mail kan in de beheer-UI uitsluitend binnen de reeds beveiligde TEST-sandbox worden
  gepauzeerd of hervat; de vaste sink en allowlist zijn daar niet wijzigbaar. LOCAL blijft dry-run
  en PROD houdt activeren of uitschakelen als gecontroleerde server-side beheerhandeling.
- [x] LOCAL heeft een afzonderlijke mailpreviewbediening via Instellingen en de statusbadge. Deze
  toont onderwerp, tekst en PDF-links en maakt uitsluitend lokale previewregistraties; SMTP blijft
  hard geblokkeerd. `EQ-H-025` is gericht groen in 5,2 s en de beleidscheck bevestigt nul netwerk-
  verbindingen en nul writes. De volledige smoke/regressie voor deze werkboom loopt nog.
- [x] `NOT-H-009` bewijst gericht dat Alles als gelezen direct de teller wist en dat een oudere
  GET-response die lokale, bevestigde write niet kan terugdraaien; 1/1 groen in 3,8 s.
- [x] v0.9.73 maakt de meldingenacceptatie herhaalbaar: Stasjo krijgt na de vaste LOCAL/TEST-baseline
  drie echte ongelezen mededelingen en `NOT-H-011` bewijst bel, filter en lijst zichtbaar gelijk van
  `3 → 2 → 1 → 0`. Notificatiesuite 11/11, `npm run check` en GUI-smoke zijn groen. De definitieve
  regressie na de individuele leesklikfix is via vier geïsoleerde shards volledig groen:
  `64 + 47 + 55 + 51 = 217/217`. De drie lokale tellertestmeldingen zijn daarna exact als ongelezen
  gebruikersbaseline hersteld. Ook productiebuild, DB-H-001, dependency-audit met 0 kwetsbaarheden,
  docs-sync met 212 Playwright + 1 DB-case en `git diff --check` zijn groen.
- [x] v0.9.74 herstelt de gewone TEST-factuurflow: `Controle afronden` genereert eerst de definitieve
  serverfactuur met ingebed Path-logo en zonder conceptwatermerk en dispatcht daarna uitsluitend de
  drie nieuw aangemaakte TEST-routes. Broker krijgt factuur alleen, Boekhouding alleen factuur en
  Salarisadministratie geen bijlage. `EQ-H-020`, `INV-H-004` en de mailpolicycheck zijn gericht
  groen. `EQ-H-026` bewijst daarnaast dat de aparte klanturenstaatknop de juiste officiële
  medewerker-/periode-PDF via TEST naar Giovanno verzendt. De servergenerator ondersteunt de
  bestaande `IND`, `IND-StvB`, `COA` en `Bel-Shawn`-patronen. De volledige GUI-smoke en de geraakte
  regressiesuites zijn groen: mail/factuur 36/36 + klanturenstaat/bedrijfsketen 15/15 = 51/51.

### Vaste wensen en acceptatieregels uit deze samenwerking

- [x] Iedere gevonden regressie wordt vastgelegd in FO/TO, een uitvoerbare feature met concrete
  assertions en de passende smoke- of regressiesuite.
- [x] Iedere release draait minimaal gerichte regressie op alle geraakte codepaden plus de vaste
  smoke/checkgates; alleen gedeelde kernlogica, breed risico of expliciet verzoek vereist de volledige matrix.
- [x] Ketentests volgen de volledige overgang:
  `startstatus → gebruikersactie → API-write → readback → taakprojectie → teller → vervolgactie → mailqueue → SMTP-status`.
- [x] Taken hebben steeds één eigenaar: medewerker of Backoffice. Een afgeronde medewerkeractie
  moet de juiste Backoffice-vervolgactie opleveren en de tellers moeten na F5 en maandwissels gelijk blijven.
- [x] De maandselector verandert alleen het maanddetail; de totale open werkvoorraad blijft gebaseerd
  op alle open maanden en mag daardoor niet willekeurig verspringen.
- [x] Rolwissel op LOCAL/TEST vult de gekozen testaccountgegevens direct zonder F5; PROD toont geen
  demoaccounts of testwachtwoorden.
- [x] TEST-herstel mag de gedeelde TEST-baseline terugzetten en opnieuw inloggen vereisen; PROD heeft
  geen demoherstel. Herstel mag nooit productiedata wijzigen. Op verzoek is dit vanaf v0.9.70 voor
  iedere ingelogde rol (beheerder én medewerker) beschikbaar op LOCAL en TEST; de knop en het
  server-endpoint blijven buiten LOCAL/TEST volledig geblokkeerd, ook bij hostspoofing.
- [x] Accounts zijn organisatiebreed uniek. Deactiveren bewaart historie; definitief verwijderen mag
  alleen bij een inactief account zonder zakelijke of beveiligingshistorie.
- [x] Backoffice kan factuur en klanturenstaat vóór verzending veilig inzien. TEST levert alle echte
  mailroutes af op de vaste sink en toont de oorspronkelijke ontvanger; PROD verzendt origineel.
- [x] LOCAL verstuurt nooit SMTP-mail, TEST alleen via de exacte sandbox/allowlist en PROD alleen via
  de productieconfiguratie. Een groene pipeline mag deze scheiding nooit versoepelen.
- [x] Na een volledig groene lokale gate wordt geversioneerd en gepubliceerd; de pipeline promoveert
  dezelfde SHA automatisch naar TEST en PROD en verifieert versie, checksum, health en login.

- [x] Historische status vanaf 2026-08-14: v0.9.61 stond automatisch en gecontroleerd op productie én TEST.
- [x] Historisch releasebewijs: v0.9.61 (`82afba1c3c2e9508cff08aecea1e37e5f531ff2e`)
  is succesvol uitgerold; iedere volgende main-SHA wordt eveneens exact in `.release-sha`
  vastgelegd en door pipeline en live-smoke gecontroleerd.
- [x] TransIP-subsite `https://uren-test.pathconsultancy.nl` bestaat afzonderlijk van PROD met
  HTTPS, HTTP/2 en geforceerde HTTPS; documentroot:
  `/data/sites/web/pathconsultancynl/subsites/uren-test.pathconsultancy.nl`.
- [x] Aparte TEST-database en lees/schrijfgebruiker bestaan: host
  `pathco-urentest.db.transip.me`, database `pathco_Urentest`, gebruiker
  `pathco_UrenTestUser`. Het wachtwoord staat uitsluitend in TransIP/private configuratie.
- [x] De private TEST-configuratie is op 2026-08-14 interactief geïnstalleerd onder
  `/data/sites/web/pathconsultancynl/private/path-uren-test/config.local.php`; databaseverbinding
  is bewezen en map/config hebben rechten 0700/0600.
- [x] v0.9.60 TEST-cutover is volledig bewezen in Release Pipeline-run `31799300297`: publieke
  versie, assets, health, migraties, demoaccounts, private opslag en read-only database-smoke zijn groen.
- [x] v0.9.61 TEST-bediening: dezelfde accountkeuze als localhost tonen; beide rollen worden na
  deployment publiek ingelogd met beschermde environment-secrets. Bewezen in run `31803329714`.
- [x] v0.9.61 TEST-mailsandbox: uitsluitend de vijf afzonderlijk bevestigde acceptatieflows openen
  voor `giovanno.maatsen@pathconsultancy.nl` en `kenrich.lieveld@pathconsultancy.nl`; configuratie,
  twee actieve TEST-accounts, backup en write worden atomisch ingericht. PROD blijft fail-closed.
- [x] v0.9.62 releasebewijs: TEST-login vult het gekozen testwachtwoord automatisch in; een
  beheerder kan de gedeelde TEST-database met expliciete bevestiging terugzetten naar exact 12 open
  acties (Juni 3 + Juli 5 + Augustus 4; Backoffice 7 + medewerkers 5), 4 medewerkers en 8 accounts.
- [x] v0.9.62 mailisolatie: gewone TEST-mail wordt met oorspronkelijke ontvanger in onderwerp/body
  omgeleid naar `giovanno.maatsen@pathconsultancy.nl`; de aparte uitnodigingscase blijft naar
  `kenrich.lieveld@pathconsultancy.nl`. Wachtwoordherstel en uitnodiging zijn in de acceptatieconsole
  herhaalbaar, terwijl de normale 3-per-15-minuten-begrenzing intact blijft.
- [x] v0.9.63 releasekandidaat: rolwissel vult credentials direct zonder F5; verzendcontrole
  finaliseert een serverfactuur vóór queueing, houdt de vervolgtaak open zolang geen mailroute is
  klaargezet en sluit die pas na aantoonbare queue-opbouw. Alle modals zijn binnen de viewport
  scrollbaar. Gerichte auth/mail/factuurlock-regressie: 40/40 groen; wachtwoordreset-race: 10/10
  groen; officiële GUI-smoke, volledige Playwright-regressie 200/200, DB-CRUD en dependency-audit
  zijn lokaal groen. De succesbevestiging na wachtwoordinstelling blijft vier seconden leesbaar.
- [x] v0.9.65 releasekandidaat: één centrale, leesbare E2E-feature borgt nu zes complete
  bedrijfsketens: stabiele taaktelling over maanden, rolwissel zonder F5, correctie en herindiening,
  uren-goedkeuring naar factuurtaak, klanturenstaatcontrole naar brokerroute en eenmalige
  wachtwoordreset met afwijzing van tokenhergebruik. De GUI-smoke voert alle zes ketens uit.
  Living Docs bevatten 203 Playwright-cases + 1 DB-case; `npm run check`, de uitgebreide
  `npm run test:gui-smoke` en de volledige desktop/mobile/API-regressie zijn lokaal groen.
- [x] v0.9.66 gevalideerd en uitgerold: serverstatus is voortaan gezaghebbend voor uren-, factuur- en
  taakstatus; alle servermaanden worden zonder kortsluiting gesynchroniseerd. Eén factuuractie
  levert exact drie afzonderlijke routes op: broker met factuur en klanturenstaat, boekhouding
  met alleen factuur en salarisadministratie zonder bijlage. TEST toont zowel de bedoelde route
  als de werkelijke sink en Backoffice kan factuur en klanturenstaat vóór afronden openen.
  `npm run check`, de volledige GUI-smoke en de volledige regressie met 211 tests zijn op
  2026-08-15 lokaal groen. Release Pipeline-run `31888079947` is voor main-SHA
  `d749b9e32ff4` volledig groen en dezelfde v0.9.66 staat op PROD en TEST.
- [x] Google SMTP Relay accepteert het bewezen TransIP-IP `85.10.158.107`; een echte TEST-mail is
  op 2026-08-15 ontvangen. De volledige drie-route-bijlagencontrole blijft onderdeel van de
  menselijke TEST-acceptatie.
- [x] De tijdelijke mailacceptatie-workaround is in v0.9.59 uit PROD verwijderd: de console
  is daar niet zichtbaar en de serverendpoint antwoordt in productie fail-closed met 404.
  Localhost en de aparte TEST-omgeving behouden de vijf expliciet bevestigde acceptatieflows.
- [x] TEST-deploycontract is strikt gescheiden van PROD: eigen origin, database, cookie,
  private opslag, deployhistorie en documentroot; mail is óf volledig dicht óf exact begrensd tot
  de twee vaste sandboxontvangers. Iedere andere open configuratie blokkeert de deployment.
- [x] Technische eindsprint afgerond: Fase 10 (JPG/PNG server-side naar PDF via GD + hand-rolled
  PDF-writer `server/lib/simple_pdf.php`), Fase 11 (server-side factuur-PDF, `pdf_storage_key`
  gevuld na lock, geautoriseerde download-endpoint met company-/employee-scope, PDF-inhoudscontrole
  via `simple_pdf_looks_valid()`), Fase 12 (retry/max-retries/foutstatus bleken al aanwezig en
  getest; PDF-bijlage nu structureel beschikbaar dankzij Fase 11), Fase 15 (gelijktijdige
  approve-requests door twee beheerders, jaarwisseling december→januari, te grote upload-afwijzing,
  basis toetsenbord-/labelcontrole, PWA-manifest + defensieve service worker).
- [x] Actuele testinventaris voor v0.9.61: 191 Playwright + 1 DB = 192 unieke cases en
  196 browseruitvoeringen (185 niet-mobiel + 5 mobiele cases x 2 devices).
- [x] Volledige lokale v0.9.61-regressie: 196/196 groen. Ook `npm run check`, DB-CRUD,
  dependency-audit, SAFE-H-012/013 en de live read-only TEST-preflight met exact twee actieve
  acceptatieaccounts zijn groen.
- [x] Volledige lokale v0.9.62-regressie: 198/198 groen. Ook releasebuild, `npm run check`,
  DB-CRUD, uitvoerbare BDD, dependency-audit en SAFE-H-001/012/013/014 plus PWD-H-006 zijn groen.
  De vaste resetbaseline van 12 acties en herhaalbare TEST-wachtwoord-/uitnodigingslinks zijn met
  beslissingstabellen, equivalentieklassen en toestandsovergangen bewaakt. De eerste v0.9.62-commit
  staat op `main`; de aanvullende testcommit wordt door dezelfde releasepipeline bewaakt.
- [x] Volledige lokale Playwright-regressie voor v0.9.59: 194/194 groen. De uitgebreide
  GUI-smoke, `npm run check`, DB-CRUD, dependency-audit en deploycontractchecks zijn eveneens groen;
  INV-H-007 is na één niet-reproduceerbare loginvertraging aanvullend 10/10 groen bewezen.
- [x] Volledige lokale Playwright-regressie voor v0.9.55: 179/179 groen, inclusief de privacyveilige
  Backoffice-verzendadministratie op desktop en mobiel. `npm run check`, `npm run test:db:crud`,
  `npm run security:deps`, de uitgebreide GUI-smoke en de releasebuild zijn eveneens groen.
- [x] Volledige lokale Playwright-regressie voor v0.9.57: 193/193 groen. Ook `npm run check`,
  `npm run test:db:crud`, `npm run security:deps`, de uitgebreide GUI-smoke, de twee nieuwe gerichte
  regressies SAFE-H-011/EQ-N-018, Bash-syntaxchecks en de releasebuild zijn groen.
- [x] Volledige lokale Playwright-regressie voor v0.9.54: 176/176 groen. De eerdere v0.9.53-regressie was 175/175 groen en omvatte
  server-authoritatieve productieaccounts en formulierfocus, medewerker-onboarding zonder SMTP, de correctieheropening,
  servergestuurde loginblokkade na F5, eenmalige wachtwoordlink in de GUI, tokenhergebruik,
  grenswaarden van twaalf tekens en fail-closed productie-/mailconfiguratie.
  `npm run check`, `npm run test:db:crud`, `npm run security:deps` en `npm run test:gui-smoke`
  zijn op dezelfde werkboom apart groen bevestigd.
- [x] Living Documentation-telling wordt uit de uitvoerbare specs berekend en met een expliciete
  inventarisguard bewaakt. Actueel: 195 Playwright-cases, 1 DB-case, 196 unieke cases en 200 uitvoeringen
  (190 niet-mobiele cases + 5 mobiele cases op zowel Chrome als Safari).
- [x] `server/config.local.php` wordt nu ook expliciet door `server/.htaccess` geblokkeerd;
  SAFE-N-008, de smokecheck en de volledige regressie bewaken deze fail-closed productiegrens.
- [x] Uitvoerbare BDD-engine toegevoegd met `playwright-bdd`: `.feature` genereert een native
  Playwright-spec, onbekende stappen falen tijdens generatie en de eerste browsertest
  `BDD-AUTH-H-001` is groen met pariteit naar `AUTH-H-009`.
- [-] BDD-migratie van de overige businessflows blijft incrementeel: alle 168 native cases blijven
  actief totdat iedere vervangende feature dezelfde acties en assertions aantoonbaar afdekt.
- [x] Accountonboarding is technisch voorbereid: nieuwe beheerders en medewerkers krijgen in productie
  een persoonlijke, twee uur geldige eenmalige link via de mailqueue; het ruwe token staat niet in
  HTTP-accesslogs, wordt na verzending/verlopen geschoond en wordt nooit als productiewachtwoord in Git gezet.
- [x] De 15-minuten-loginblokkade blijft na F5 zichtbaar in de browser, terwijl de server de
  autoritatieve blokkade en resterende tijd blijft afdwingen.
- [x] Medewerkercorrectie voor een al goedgekeurde maand is server-led heropenbaar zolang nog geen
  definitieve factuur bestaat; dashboardnavigatie ververst ook een verborgen grid voor dezelfde periode.
- [x] Productiecontrole op 2026-08-14: `https://uren.pathconsultancy.nl/index.html` serveert v0.9.57.
  De eerste automatische uitrol is bewezen door Release Pipeline `31766313202`; iedere volgende groene
  main-run controleert opnieuw de exacte SHA, HTTPS, health, assets, database, bedrijfsidentiteit,
  private opslag en live preflight en bewaart de vorige release automatisch als directe rollback.
- [x] v0.9.52 herstelt accountonboarding zonder actieve SMTP-relay: een beheerder kan medewerker en
  opdracht veilig opslaan met `Toegang in afwachting`; uitnodigen blijft een aparte expliciete actie.
  De hotfix is volledig groen door CI gegaan en gecontroleerd naar productie uitgerold.
- [x] v0.9.53 maakt productie-accountdata volledig server-authoritatief, verwijdert demoherstel van de
  productiehost en opent lange medewerker-/beheerformulieren bovenaan. ADM-WR-H-005, de uitgebreide
  GUI-smoke, `npm run check`, database-CRUD, dependency-security en de volledige 175/175-regressie zijn
  lokaal groen; pipeline en gecontroleerde cutover zijn afgerond.
- [x] v0.9.54 voegt een fail-closed TEST-mailmodus toe. Echte TEST-mail vereist een aparte TEST-host,
  aparte TEST-database, expliciete opt-in en een ontvangers-whitelist; de beleidscheck en gerichte
  Playwright-regressie en volledige 176/176 regressie zijn groen. De persistente TEST-host en volledige
  uitnodigingsflow volgen nog.
- [x] v0.9.55 maakt de bestaande serverqueue als privacybewuste verzendadministratie zichtbaar voor
  Backoffice: ontvanger, onderwerp, kanaal, bijlagebeleid, status en tijdstip, maar nooit berichttekst
  of wachtwoordlink. EQ-H-015, MOB-H-005, GUI-smoke en de volledige 179/179 regressie zijn groen.
- [x] v0.9.56 voegt een beheerder-only mailacceptatieconsole toe met vijf losse scenario's, vaste
  ontvangers, expliciete bevestiging per bericht, zichtbare bijlagetelling en herkenbare
  `ACCEPTATIETEST · NIET BOEKEN`-markering. De console kent bewust geen bulkknop en blijft zonder
  serveropt-in/allowlist geblokkeerd. Ook worden gedeactiveerde accounts server-authoritatief onder
  Inactief getoond en kunnen uitsluitend historie-loze accounts definitief worden verwijderd.
  Mobiel toont nu het versienummer en lokaal/test ook de Herstel-knop. `npm run check`, de uitgebreide
  GUI-smoke, DB-CRUD, dependencycontrole en de volledige 191/191 Playwright-regressie zijn lokaal groen.
  Living-documenttitels en featurebestanden gebruiken bedrijfsgerichte domeinnamen; API/UI-techniek blijft
  via tags, bronmapping en vaste case-ID's traceerbaar.
  Een bewuste serverwrite na lokaal Herstel heft de tijdelijke reset-autoriteit op en ververst Teambeheer,
  zodat nieuw opgeslagen beheerders en medewerkers direct zichtbaar worden.
  Dubbele accountadressen worden voor medewerker en beheerder met 409 en een veilige GUI-melding
  geweigerd; SQL-details blijven afgeschermd en de dubbele invoer komt niet in de lijsten.
- [x] v0.9.56 is checksum-gecontroleerd uitgerold. De verse pre-cutoverdatabaseback-up staat buiten
  de webroot als `path-db-20260814-022748.sql` (94.261 bytes), SHA-256
  `0ef7f3b8e879e06cd75fef7cebb1959173a737329e92988e74a1df5bee8b9f01`; migratie 014 en de
  volledige live read-only productiepreflight zijn groen.
- [x] v0.9.57 voegt automatische PROD-uitrol na volledig groene `prod`- en Living Docs-jobs toe.
  Het contract vereist exact de trigger-SHA, gepinde SSH-hostkey, checksum en bytecontrole, gesloten
  mailwindow, lege queue, verse DB-back-up, migraties, live preflight, atomaire cutover, live-smoke en
  automatische rollback. De volledige lokale 193/193 regressie en Release Pipeline `31766313202` zijn
  groen. De job `Deploy Prod to TransIP` bewees de externe uitrol van exact `21cdfb1954d526...` en
  sloot af met `Live smoke passed`.
- [x] v0.9.58 is lokaal volledig geverifieerd. Een dubbel e-mailadres geeft binnen het
  eigen bedrijf veilig naam, rol en actief/inactief-status terug; Teambeheer sluit het invoerformulier,
  opent het bestaande account onder het juiste filter en markeert de herstelactie. Buiten het eigen
  bedrijf blijven accountdetails afgeschermd. De gesloten acceptatieconsole toont op alle vijf acties
  voortaan expliciet `Mailvenster gesloten` in plaats van een schijnbaar bruikbare verzendknop.
  Gerichte regressies ADM-WR-N-001, ADM-WR-N-002, ADM-WR-H-008 en EQ-N-019 zijn groen. De volledige
  regressie is 194/194 groen, MOB-H-003 is aanvullend 10/10 groen op mobile-Safari en GUI-smoke,
  `npm run check`, DB-CRUD en dependency-audit zijn groen. Commit `1b866047` en Release Pipeline
  `31782141745` zijn groen en de automatische productie-uitrol is afgerond.
- [x] Mislukte acceptatiemails blijven nooit voor een latere cron achter: één knop is exact één
  SMTP-poging; bij afwijzing eindigt de levering direct definitief als `failed`. Normale productiemail
  behoudt de begrensde retry. SMTP-fouten bewaren voortaan de veilige relayreactie voor diagnose.
- [x] Eerste gecontroleerde cutover van `97065e9` heeft het rollbackpad succesvol bewezen: v0.9.50
  gaf correcte headers en afscherming, maar health meldde veilig `ok=false` omdat een schone
  productiedatabase zonder demadata onterecht als fout gold. v0.9.44 is direct teruggezet zonder
  dataverlies. SAFE-H-009 borgt in v0.9.51 dat alleen demo-/testomgevingen demodata vereisen.
- [x] Root cause/fix gevonden voor twee omgevingsvalkuilen tijdens dit werk (vastgelegd in
  repo-memory): de PHP GD-extensie stond lokaal standaard uit (`;extension=gd` in php.ini) en moest
  worden ingeschakeld; en een stale achtergrond-PHP-proces (van vóór de GD-fix) op poort 8000
  veroorzaakte verwarrende "onmogelijke" testresultaten totdat het werd gestopt.
- [x] HEAD: v0.9.46 releasebaseline `cb0c7da` (fix MOB-H-003 + DASH-N-008); laatste checklist-commit `b8d8cd1`.
  HEAD wordt niet meer statisch bijgehouden — zie git log voor actuele stand.
- [x] Reorganisatie: alle openstaande punten die je buiten VS Code moet doen (TransIP-paneel, GitHub-website-instellingen, Google Workspace, fysieke toestellen, bedrijfsgegevens/administratie, menselijke acceptatie) zijn verzameld en verplaatst naar Fase 16 als laatste, verzamelende fase. De oorspronkelijke fasen (5, 7, 9, 10, 11, 12, 13, 14, 15) bevatten nu alleen nog wat in VS Code zelf (code/terminal/Playwright/git) haalbaar is.
- [x] Bewezen releasebaseline voor deze statusupdate: commit
  `9fad9592e3d31a9f9b48085931c196b11e9e1247` staat op `main`;
  Release Pipeline #31654859682 is volledig groen (Validate, Test, Live Docs en Prod-regressie).
- [x] GitHub Actions zijn bijgewerkt naar de actuele Node-24-majors; checkout, setup-node,
  github-script, artifact-upload en GitHub Pages zijn in pipeline #31654859682 zonder
  Node-20-runtimewaarschuwingen bewezen.
- [x] GitHub Actions pipeline-run #91 (commit 998716b) volledig groen — historisch bewijs.
- [x] GitHub Actions pipeline-run #99 (commit 821b175, main) volledig groen: alle stappen
  (Validate, Promote Dev/Test/Acc/Prod, Publish Live Docs) completed successfully.
- [x] GitHub Actions pipeline-run #100–#104 (commits 375cfc3–b8d8cd1, main) — groen bevestigd.
- [x] MOB-H-003 (Safari correctie/goedkeuring flakiness) structureel opgelost in v0.9.46:
  de te laat geregistreerde 20s-responsewait is verwijderd, logout wacht op de zichtbare postconditie
  en de runner normaliseert `localhost` naar zijn beheerde IPv4-server; volledig groen bewezen.
- [x] DASH-N-008 (dashboardtellers na reset) structureel opgelost in v0.9.46: deterministische
  post-reset-baseline, bewezen stabiel na 138-test muterende reeks.
- [x] Historisch geconsolideerd: v0.9.41 (releasehardening, DB-isolatie, DB-H-001, Slice B/C/D/E
  server-led, 127/127→139/139 groen), v0.9.44 (DASH-N-008 reset-fix, 139/139 groen),
  v0.9.45 (technische eindsprint Fase 10/11/12/15, 146/146 groen, pipeline #91 groen).
- [x] DB-H-001: SQL/DB-smoke groen via `node scripts/run-db-crud-smoke.mjs`
- [x] Lokale automatische Playwright-testdatabase aanwezig: `path_urenregistratie_test`
- [x] DB-isolatie-onderdeel toegevoegd: bootstrap-script voor aparte lokale Playwright-testdatabase aanwezig
- [x] Slice B afgerond: invoice/verzendstatus auth-mode server-led; lokale regressie 127/127 is opnieuw bewezen op de huidige state
- [x] Slice C deelstap afgerond: notifications auth-mode server-led via notifications.php (read, mark_read, mark_all_read, mark_announcement_read)

### Kort overzicht: waar we nu staan

- [x] Kernbouw en functionele basis zijn aanwezig en lokaal gevalideerd.
- [x] De meest recente volledige Playwright-regressie is opnieuw volledig groen bewezen:
  169/169 browseruitvoeringen, inclusief correctieheropening, accountuitnodiging en persistente loginblokkade.
- [x] DB/infrastructuursmoke aanwezig: DB-H-001 via `node scripts/run-db-crud-smoke.mjs` groen.
- [x] Lokale automatische Playwright-testdatabase aanwezig: `path_urenregistratie_test` via bootstrap.
- [x] De checklist is nu bijgewerkt naar de actuele repo- en teststatus; de fase-indeling is intact gebleven.
- [-] We werken vanaf nu strikt van boven naar beneden op open punten in de checklist.
- [-] Fases worden alleen overgeslagen als een punt aantoonbaar geblokkeerd is.

### Samenvatting huidige stand

- [x] De app is functioneel op basis van de bestaande lokale backend/frontend-flow en de recente DB-onderdelen.
- [x] De DB-H-001 smoke is groen.
- [x] De aparte lokale Playwright-testdatabase is ingebouwd.
- [x] De volledige regressie na de DB-isolatie-aanpassing is opnieuw volledig groen bewezen; dit onderdeel is afgerond.
- [x] Productieveiligheidscheck voor SMTP-voorbereiding is opnieuw groen: `mail.enabled` staat standaard op `false`; `transport` is `smtp_relay` met STARTTLS-relay en zonder echte activering; de locale check en smoke zijn groen.
- [x] De logout-regressie is opgelost: de Playwright-helper gebruikt de echte zichtbare uitlogknop en wacht daarna expliciet op de login-shell, waardoor het gebruikerspad zelf getest blijft.
- [x] Lokale eindgate opnieuw bewezen: `npx playwright test tests/playwright/auth.spec.ts --reporter=line` => `6 passed (17.9s)` en `npm run check` => `Path v0.9.46 volledige smoke test: geslaagd`.

### Directe volgende stap

- [-] De lokaal groene accountonboarding-release committen/pushen en de nieuwe Release Pipeline volledig
  groen volgen. Daarna exact die SHA privé op TransIP klaarzetten; live blijft v0.9.44 totdat
  productieconfig, migratie 013, backup/rollback, echte accountadressen en expliciete
  `GO_LIVE_<korte_sha>`-toestemming zijn bevestigd.

### Nieuwe werklijst (van boven naar beneden)

- [x] Stap 1: Fase 2 - afwikkelen van de nog open lokale/overige write-flowstatus en bevestigen welke onderdelen nog werkelijk lokaal/open zijn.
- [x] Stap 2: Fase 5 - niet-productie-afhankelijke securityhardening bevestigd; expliciete sessie-time-out en sliding session expiration zijn aantoonbaar getest.
- [x] Stap 3: Fase 7 - alleen niet-geblokkeerde CI/CD-afwerking; volledige pipeline end-to-end
  groen bewezen op run #91 (2026-08-12). Resterend binnen Fase 7 is extern-afhankelijk (branch
  protection, echte hosts, productieapproval, notificatieontvangers) — zie Fase blokkades.
- [x] Stap 4: Fase 10 - JPG/PNG server-side omzetten naar PDF gebouwd en getest (CTS-API-H-005); rest van Fase 10 verplaatst naar Fase 16.
- [x] Stap 5: Fase 11 - server-side factuur-PDF, pdf_storage_key, geautoriseerd downloaden, PDF-inhoudscontrole gebouwd en getest (INV-H-004, INV-N-013); rest verplaatst naar Fase 16.
- [x] Stap 6: Fase 12 - factuur-PDF-bijlage nu structureel mogelijk; retry/max-retries/foutstatus geverifieerd al aanwezig en getest (Gmail-activatie verplaatst naar Fase 16).
- [x] Stap 7: Fase 13 - volledig verplaatst naar Fase 16 (alles resterend is bedrijfsbeslissing/administratie, niets meer in VS Code te doen).
- [x] Stap 8: Fase 14 - volledig verplaatst naar Fase 16 (alles resterend is TransIP-paneel/SSH, niets meer in VS Code te doen).
- [x] Stap 9: Fase 15 - lokaal/VS Code haalbaar afgerond: dubbelklik/dubbele requests, twee-beheerders (TS-REV-API-H-006), jaarwisseling (TS-REV-API-H-007), grote-upload-afwijzing (CTS-API-N-008), accessibility (A11Y-H-001/002), dependency-scan, PWA-manifest/service worker; rest verplaatst naar Fase 16.
- [-] Stap 10: Fase 16 - laatste fase: alle buiten-VS-Code taken (deel A) + post-live beheer (deel B).

### Uitvoeringsbundels (afhankelijkheid-gedreven)

- [x] Slice B: factuurstatus + verzendstatus server-led (Fase 2 + 11 + 12)
- [x] Slice C: notifications + announcements server-led (Fase 2 + 12)
- [x] Slice D: users + settings server-led (Fase 2 + 13) — toggleEmployee/Admin server-led; dbUserId bewaard via bootstrap; persistState auth-mode slanker
- [x] Slice E: persistState/localStorage beperken tot UI/demo/fallback (afronding Fase 2) — auth-mode sloeg geen business-data meer op
- [x] Slice C deelstap afgerond: auth-mode notificatiepaneel en markeren-als-gelezen lopen server-led via server/api/notifications.php (read, mark_read, mark_all_read en mark_announcement_read).
- [x] Slice C volledig: announcements API aangemaakt (send/withdraw/hide/draft); admin write-flow server-led; employee read via notifications.
- [x] Slice D+E volledig: toggleEmployee/Admin server-led via users.php; dbUserId opgeslagen via bootstrap-merge; persistState in auth-mode beperkt tot UI-state (rol, periode, filters, branding, reminders); business-data (employees/admins/records/notifications/announcements) niet meer lokaal gepersisteert in auth-mode.
- [x] DB-isolatie en test-DB-scheiding: aparte lokale Playwright-testdatabase `path_urenregistratie_test` is ingericht en via bootstrap beschikbaar; dev/demo DB blijft `path_urenregistratie`.
- [x] Volledige bewijscheck dat de volledige regressie de dev/demo DB onaangeroerd laat, is bewezen: volledige run 127/127 groen en dev/demo DB delta 0.

Voor iedere slice geldt verplicht:
- [x] Extra controle op afgeleide dubbeling: invoiceStatus, payrollStatus, email_deliveries,
  verzonden/sent-flags, dashboard/KPI-afleidingen en batch-acties — Slice B bewezen via
  invoices.php + email-queue.php als enige bron; 146/146 regressie groen.
- [x] In auth-mode blijft per businessstatus precies een autoritatieve serverbron over.
- [x] Na succesvolle server-write synchroniseert frontend state direct met serverresponse.
- [x] Na write blijft reload opnieuw server-led lezen.
- [x] Frontend voorspelt of vooruitzet geen lokale businessstatus voordat de serverwrite bevestigd is.
- [x] Verplichte pre-check voor iedere review/demo: eerst `npm run test:closeout` (DEMO-CLOSEOUT-TO-ZERO), daarna pas handmatig beoordelen.
- [x] F5/herstel-guard actief: F5 behoudt de lokale werkstaat; alleen Herstel zet de baseline terug. Na Herstel blijft die lokale baseline ook na F5 leidend en worden business-readbacks niet toegepast.
- [x] Verplichte GUI-smoke voor zichtbaar gedrag: `npm run test:gui-smoke` controleert Herstel, F5, opnieuw inloggen en Stasjo's zichtbare 3 open acties zonder business-readbacks. Nieuwe zichtbare bevindingen worden aan deze GUI-smoke toegevoegd.
- [x] Reset-authoritative caching-les (v0.9.44): elke functie die state muteert op basis van server-/read-API-data moet `isLocalResetAuthoritative()` checken, en Herstel moet ALLE module-level read-API caches legen (niet alleen de `state`-variabele) om te voorkomen dat stale serverdata na Herstel terugsijpelt.

### Fase blokkades / later doen

- [!] Fase 7: echte aparte Dev/Test/Acc-hosts en productieapproval voor echte deploy zijn extern afhankelijk.
- [!] Fase 12: echte Gmail/Google Workspace-verzendconfig en productie-mailafhandeling pas als allerlaatste, na acceptatie en expliciete goedkeuring.
- [!] Fase 14/15/16: productie-operationalisatie en post-live onderdelen pas uitvoeren na vrijgave van hosting en productieconfig.
- [!] PWA/offlinefunctionaliteit mag na eerste livegang als dit geen harde livegangeis is.

---

## Fase 1 - Lokale ontwikkelbasis

- [x] PHP 8.4 lokaal geinstalleerd.
- [x] MySQL lokaal geinstalleerd.
- [x] pdo_mysql actief.
- [x] Lokale database path_urenregistratie.
- [x] PHP kan verbinding maken met MySQL.
- [x] server/config.local.php voor lokale instellingen.
- [x] server/config.local.php staat buiten Git.
- [x] server/.php-path staat buiten Git.
- [x] Geen productiewachtwoorden in Git.
- [x] server/config.local.php.example met veilige placeholders.
- [x] Lokaal startscript:
  - start-path-app.cmd
  - start-path-app.ps1
- [x] API-controlescript:
  - test-path-api.cmd
  - test-path-api.ps1
- [x] Groot controlescript:
  - check-after-big-change.cmd
  - check-after-big-change.ps1
- [x] Automatische lokale databaseback-up bij grote controles.
- [x] Lokale PHP-server op poort 8000.
- [x] health.php, install.php en API kunnen lokaal worden gecontroleerd.

Status Fase 1:
- [x] afgerond

---

## Fase 2 - Database, schema en migraties

- [x] app_state als eerste werkende serveropslag.
- [x] Tabel schema_migrations.
- [x] Core databaseschema.
- [x] server/install.php.
- [x] server/health.php.
- [x] server/migrate.php.
- [x] Core migratie.
- [x] Demo-seed.
- [x] Auth-schema.
- [x] Demo-medewerker-authseed.
- [x] Veilige migratiehistorie.
- [x] Bestaande migraties worden niet opnieuw gewijzigd voor nieuwe features.
- [x] Nieuwe databasewijzigingen worden als nieuwe migration toegevoegd.
- [x] Demo-migraties kunnen apart worden beheerd.
- [x] Demo-migraties zijn standaard niet voor productie bedoeld.
- [x] Tabellen voor:
  - bedrijven
  - gebruikers
  - medewerkers
  - opdrachten
  - perioden
  - urenstaten
  - dagregels
  - correcties
  - klanturenstaten
  - facturen
  - ontvangers
  - e-mailleveringen
  - mededelingen
  - notificaties
  - auditlog
- [x] Demo-inhoud voor juni, juli en augustus 2026.
- [x] Correctie/goedkeuring UI-migratie afgerond voor auth-mode: request_correction, resubmit en approve lopen via server/api/timesheets.php met serverversie als bron.
- [x] Slice B afgerond in auth-mode: factuurstatus en verzendstatus worden server-led gesynchroniseerd via server/api/invoices.php en server/api/email-queue.php; dashboard-, KPI- en batchstatus volgen dezelfde serverbron.
- [x] Auth-mode verzendacties zetten geen lokale businessstatus meer vooruit; eerst server enqueue/sync, daarna UI-update op basis van serverresponse.
- [x] Slice C volledig: auth-mode mededelingen read/write server-led; notifications lees/markeer server-led.
- [x] Slice D+E volledig: users deactivate/reactivate auth-mode server-led; persistState auth-mode beperkt tot UI/branding/reminders; employees/admins/records/notifications/announcements niet meer lokaal gepersisteert in auth-mode.
- [x] Lokale dev/demo database = `path_urenregistratie`.
- [x] Lokale automatische testdatabase = `path_urenregistratie_test`.
- [x] DB-H-001 via SQL/Node-runner beschikbaar en groen.
- [x] database-integrity.feature + database.steps.ts aanwezig als Living Documentation/mapping; er is geen database-integrity.spec.ts.
- [x] Browseropslag volledig afgebouwd in auth-mode: alle sub-onderdelen (read-data server-led,
  uren-writeflow server-led, factuur/upload/mail/beheer server-led) zijn bewezen door Slices B/C/D/E;
  persistState beperkt tot UI-state (rol, periode, filters, branding, reminders).

Status Fase 2:
- [x] databasestructuur afgerond
- [x] alle businesskritische write-flows in auth-mode server-led (timesheets, invoices, email-queue, notifications, announcements, users status)
- [x] persistState/localStorage in auth-mode beperkt tot UI-state; server is de enige autoritatieve bron voor businessdata
- [x] settings/company-data-writes en employee/admin create/edit zijn server-led bewezen met ADM-WR-H-001 t/m ADM-WR-H-003 en opgenomen in de volledige regressie (127/127 groen)
- [x] alle cross-cutting server-led bewijspunten afgedaan door Slices B/C/D/E + 146/146 regressie

---

## Fase 3 - Read-API en frontendlezing

- [x] server/api/common.php.
- [x] server/api/bootstrap.php.
- [x] server/api/dashboard.php.
- [x] server/api/invoices.php.
- [x] Frontend leest bootstrapgegevens via API.
- [x] Frontend leest dashboardgegevens via API.
- [x] Frontend leest facturen via API.
- [x] Periodefilter via API.
- [x] Medewerkers via API.
- [x] Opdrachten via API.
- [x] Stamgegevens via API.
- [x] Beschermde read-endpoints vereisen een sessie.
- [x] Zonder sessie geven endpoints 401 not-authenticated.
- [x] Administrator ziet organisatiebrede gegevens.
- [x] Medewerker ziet alleen eigen gegevens.
- [x] Medewerker krijgt geen volledige ontvangerslijst.
- [x] Medewerker krijgt geen volledige medewerkerslijst.
- [x] Employee- en company-scope in queries.
- [x] app_state blijft een gecontroleerde fallback, niet de primaire database in auth-modus.
- [x] Role enforcement eerder bewezen en gecommit als 23c07a0.

Status Fase 3:
- [x] afgerond

---

## Fase 4 - Authenticatie, sessies en rollen

- [x] server/auth/session.php.
- [x] server/auth/login.php.
- [x] server/auth/logout.php.
- [x] server/auth/me.php.
- [x] password_hash.
- [x] password_verify.
- [x] Veilige PHP-sessie.
- [x] Administratorrol.
- [x] Employeerol.
- [x] Admin-login via backend.
- [x] Medewerker-login via backend.
- [x] Frontend-loginformulier gekoppeld aan backend.
- [x] Frontend controleert bij app-start de sessie.
- [x] /auth/me.php geeft huidige gebruiker terug.
- [x] Logout vernietigt de sessie.
- [x] Na logout terug naar login.
- [x] Geen wachtwoorden in debugoutput.
- [x] Geen wachtwoorden in consolelogging.
- [x] Loginformulier vult alleen op localhost via de afgeschermde loopback-hints een lokaal demo-wachtwoord in; productie krijgt deze hints niet.
- [x] Demo-rolknoppen alleen als gecontroleerde fallback.
- [x] window.__PATH_AUTH_DEBUG bevat geen gevoelige waarden.
- [x] CI-adminaccount afgestemd op gio@example.invalid.
- [x] CI-employeeaccount afgestemd op stasjo@example.invalid.
- [x] Browserflow login -> dashboard -> facturen -> logout eerder getest zonder console/page errors.

Status Fase 4:
- [x] afgerond voor huidige authscope

---

## Fase 5 - CSRF, validatie en securitybasis

- [x] CSRF-token in sessie.
- [x] X-CSRF-Token header.
- [x] CSRF-endpoint.
- [x] CSRF op login.
- [x] CSRF op logout.
- [x] CSRF op state-write.
- [x] CSRF op timesheetwrites.
- [x] Veilige JSON-body parsing.
- [x] Validatie van verplichte velden.
- [x] E-mailvalidatie.
- [x] Maximale veldlengtes.
- [x] Enumvalidatie.
- [x] Numerieke validatie.
- [x] Nette 400, 401, 403, 405 en 409 responses.
- [x] Geen SQL-details in normale API-responses.
- [x] Geen stacktraces naar browser.
- [x] Production-safety Playwright-tests.
- [x] Geen plaintext demo-wachtwoorden in frontend.
- [x] Demo-migraties voor productie begrensd.
- [x] Productie-origin voorbereid via configuratie.
- [x] Expliciete sessie-time-out aantoonbaar getest (SEC-H-005).
- [x] Sliding session expiration aantoonbaar getest (SEC-H-005).
- [x] Auditmelding bij herhaalde mislukte loginpogingen aantoonbaar getest (SEC-H-006).
- [x] Periodieke controle op kwetsbare dependencies kan lokaal via `npm run security:deps` / `npm run security:deps:full`.
- [-] Verplaatst naar de laatste fase (buiten VS Code, echt productiedomein nodig): productie-CORS/CSP/HSTS finaliseren, centrale securitylogging en logrotatie op de productieserver. Zie Fase 16.

Status Fase 5:
- [x] noodzakelijke securitybasis afgerond
- [-] extra productiehardening die het echte productiedomein/de TransIP-server vereist, is verplaatst naar Fase 16; sessie-time-out/sliding expiration (SEC-H-005) en failed-login-auditmelding (SEC-H-006) zijn groen bevestigd binnen de volledige regressie (127/127)

---

## Fase 6 - Playwright, Allure, Living Documentation en agents

- [x] Lokale dev/demo database = `path_urenregistratie`.
- [x] Lokale automatische testdatabase = `path_urenregistratie_test`.
- [x] DB-H-001 via SQL/Node-runner aanwezig en groen.
- [x] database-integrity.feature + database.steps.ts aanwezig als Living Documentation/mapping.
- [x] Geen database-integrity.spec.ts; de executable source of truth is de native Playwright-suite plus de DB-smoke runner.

- [x] Playwright-only testopzet.
- [x] Geen Cypress in deze repository.
- [x] Geen Cucumber-runner.
- [x] Native Playwright-specs zijn leidend.
- [x] playwright.config.ts.
- [x] Page objects.
- [x] API helpers.
- [x] Fixtures.
- [x] Environment-/stageconfiguratie.
- [x] Dev-stage.
- [x] Test-stage.
- [x] Acceptatie-stage.
- [x] Productiestage.
- [x] Auth-tests.
- [x] Dashboardtests.
- [x] Factuurtests.
- [x] Rollen/API-tests.
- [x] Securitytests.
- [x] Production-safety tests.
- [x] Timesheet-write tests.
- [x] Timesheet-reviewflow test.
- [x] Herhaalbare toekomstige testperioden.
- [x] Allure reporter.
- [x] Allure-resultaten.
- [x] Allure-rapportgeneratie.
- [x] Playwright HTML-report.
- [x] Traces bij failures.
- [x] Screenshots bij failures.
- [x] Video bij failures.
- [x] Nederlandse .feature-bestanden als Living Documentation.
- [x] .steps.ts-bestanden als BDD-mapping/documentatie.
- [x] TEST-BDD-MAPPING.md.
- [x] LIVING-DOC.md.
- [x] PROJECT-CONTEXT.md.
- [x] Live Docs-bundel.
- [x] Planner-agent.
- [x] Builder-agent.
- [x] Test-agent.
- [x] Security-review-agent.
- [x] Release-agent.
- [x] Gescheiden Playwright-projecten voor desktop Chromium, Pixel 7 Chromium en iPhone 13 WebKit.
- [x] Mobile UI-spec draait alleen op de twee mobiele projecten; desktop- en API-specs worden niet verdrievoudigd.
- [x] Mobiele regressie dekt login, navigatie, dashboard, uren, correctie/herindiening, goedkeuring, factuurkaartweergave, upload, notificaties, touch, modal en overflow.
- [x] AUTH-H-004 borgt dat de lokale beheeraccount na asynchrone auth-initialisatie automatisch wordt ingevuld en met één klik opent.
- [x] Periodebeheer valideert het bestaande viercijferige UI-bereik 1000–9999 en maand 1–12 voordat gegevens worden opgeslagen.
- [x] PER-H-002 normaliseert zijn eigen testperiode en controleert expliciete close/reopen-statusresponses, onafhankelijk van vervuilde globale periodedata.
- [x] Living Documentation bevat 142 unieke Playwright-cases, 146 uitvoeringen, 1 directe SQL/DB-case DB-H-001 en 143 unieke executable cases totaal.
- [x] De actuele volledige regressie is opnieuw volledig groen bewezen: 161/161
  browseruitvoeringen, met geïsoleerde testdatabase en groene releasepipeline.
- [x] Recente slice afgerond: production-safety- en timesheet-write-specs bijgewerkt, TESTCOMMANDOS.md afgestemd op de actuele scripts en de lokale Playwright-regressie groen.
- [x] Living Doc viewer uitgebreid met suite-groepering in sidebar (API/Security/UI Desktop/UI Mobile/DB/Integratie) identiek aan Allure-stijl; commit 387ea63.

Status Fase 6:
- [x] afgerond

---

## Fase 7 - CI/CD, release-pipeline en GitHub-documentatie

- [x] GitHub Actions-workflow.
- [x] Verse MySQL 8-database in CI.
- [x] PHP 8.4 in CI.
- [x] Node in CI.
- [x] Playwright Chromium in CI.
- [x] npm ci.
- [x] Build in pipeline.
- [x] Smoke-test in pipeline.
- [x] Migraties in pipeline.
- [x] Tijdelijke CI-wachtwoorden.
- [x] Tijdelijke password hashes in CI-database.
- [x] Playwright-regressie in pipeline.
- [x] Dev -> Test -> Acc -> Prod-opzet.
- [x] Stageconfiguratie.
- [x] Lokale fallbackstack zolang echte stage-URL's ontbreken.
- [x] Live Docs-publicatie.
- [x] Allure/Living Docs-koppeling.
- [x] Commitnotificatie geintegreerd in release-pipeline.
- [-] Verplaatst naar de laatste fase (buiten VS Code, via GitHub-website en overleg): Ken/Gio-notificaties/definitieve notificatieontvangers, echte aparte Dev/Test/Acc-hosts, branch protection op main, verplichte groene statuschecks voor merge, productieapproval voor echte deploy. Zie Fase 16.

Status Fase 7:
- [x] CI/CD-basis lokaal en in repository afgerond
- [x] Volledige pipeline end-to-end groen bewezen op run #91 (998716b) en run #99 (821b175,
  2026-08-12); alle stappen Validate→Prod→Live Docs completed successfully.
- [-] Pipeline #100 nog in uitvoering/te bevestigen — zie Actuele stand.
- [-] fase als geheel gedeeltelijk: notificatieontvangers, echte stage-hosting, branch protection/checks en productieapproval nog open (extern afhankelijk, zie Fase blokkades)

---

## Fase 8 - Uren concept opslaan en indienen

- [x] server/api/timesheets.php.
- [x] Uren als concept opslaan in echte database.
- [x] Concept teruglezen.
- [x] Uren indienen.
- [x] Periode veilig bepalen/aanmaken.
- [x] Medewerker schrijft alleen eigen uren.
- [x] Administrator blijft binnen eigen organisatie.
- [x] CSRF op writes.
- [x] Sessie op GET en POST.
- [x] employee_id-scope.
- [x] Periodeformaat YYYY-MM.
- [x] Kalenderdatumvalidatie.
- [x] Dagregel moet binnen gekozen maand liggen.
- [x] Daguren numeriek.
- [x] Daguren tussen 0 en 24.
- [x] Som dagregels moet overeenkomen met factureerbare uren.
- [x] Audit-event timesheet.draft_saved.
- [x] Audit-event timesheet.submitted.
- [x] Database-transactie.
- [x] Rollback bij fout.
- [x] submitted urenstaat vergrendeld.
- [x] approved urenstaat vergrendeld.
- [x] invoiced urenstaat vergrendeld.
- [x] TimesheetApi.ts.
- [x] timesheet-write.spec.ts.
- [x] timesheets.feature.
- [x] timesheets.steps.ts.
- [x] BDD-mapping.
- [x] Allure-opname.
- [x] Gecommit.
- [x] Gepusht.

Status Fase 8:
- [x] afgerond

---

## Fase 9 - Correctieverzoek, opnieuw indienen en goedkeuren

Deze fase heette eerder Fase 8. Omdat de concept-/indienflow hierboven nu een eigen afgeronde fase is, staat de correctieflow hier apart.

### Backend en database

- [x] Actie request_correction.
- [x] Alleen administrator mag correctie aanvragen.
- [x] Alleen overgang submitted -> correction.
- [x] Correctietoelichting verplicht.
- [x] Maximale lengte correctietoelichting.
- [x] review_note vullen.
- [x] Record in timesheet_corrections.
- [x] Audit-event timesheet.correction_requested.
- [x] Correctiestatus bewaren tijdens conceptopslaan.
- [x] Medewerker kan correctie opnieuw indienen.
- [x] Overgang correction -> submitted.
- [x] Open correctierecord krijgt resubmitted_at.
- [x] Audit-event timesheet.resubmitted.
- [x] Actie approve.
- [x] Alleen administrator mag goedkeuren.
- [x] Alleen overgang submitted -> approved.
- [x] approved_at.
- [x] approved_by.
- [x] Audit-event timesheet.approved.
- [x] Correctiehistorie teruggeven.
- [x] Dagregels teruggeven.
- [x] Uren en notities teruggeven.
- [x] Optimistic locking met expected_version.
- [x] Stale version geeft 409 stale-version.
- [x] Version wordt na succesvolle write verhoogd.
- [x] Frontend bewaart de serverversie voor volgende write.
- [x] Transacties en rollback.
- [x] Employee mag geen adminreviewactie uitvoeren.
- [x] Ongeldige statusovergangen geven 409.

### Tests en documentatie

- [x] timesheet-review-flow.spec.ts.
- [x] Employee maakt concept.
- [x] Employee dient in.
- [x] Admin vraagt correctie.
- [x] Stale correctieverzoek wordt geweigerd.
- [x] Tweede ongeldige correctieovergang wordt geweigerd.
- [x] Employee kan zelf geen correctieverzoek uitvoeren.
- [x] Employee dient opnieuw in.
- [x] Admin keurt goed.
- [x] Stale goedkeuring wordt geweigerd.
- [x] Correctiehistorie wordt gecontroleerd.
- [x] resubmitted_at wordt gecontroleerd.
- [x] Living Doc bijgewerkt.
- [x] BDD-mapping bijgewerkt.
- [x] Gecommit.
- [x] Gepusht.
- [x] Browserflow testcase aanwezig: TS-REV-UI-001.

### Nog niet volledig bewezen

- [x] Frontend bewaart en verstuurt expected_version via server-writeflow; nieuwe version wordt na serverwrite teruggezet in de UI-state.
- [x] Pipeline #62 via GitHub bevestigd: Validate, Test, Live Docs en Prod groen.

Status Fase 9:
- [x] backend/API/test/documentatie gecommit en gepusht
- [x] browser-UI-flow met Playwright bewezen
- [x] correctie/herindiening/goedkeuring ook op Pixel 7 Chromium en iPhone 13 WebKit bewezen
- [x] correctie/goedkeuring UI in auth-mode gebruikt server/api/timesheets.php als bron voor status, review_note, correction_history, approved_at, approved_by en version
- [x] pipelinebevestiging bewezen
- [-] Verplaatst naar de laatste fase (buiten VS Code): productieacceptatie van de correctie/goedkeuringsflow. Zie Fase 16.

---

## Fase 10 - Klanturenstaten en uploads

### Technische basis

- [x] Databasetabel customer_timesheets.
- [x] Statusvelden in schema.
- [x] Opslagvelden in schema.
- [x] Upload-/reviewvelden in schema.
- [x] Demo-UI en schermconcept bestaan.
- [x] API endpoint customer-timesheets.php toegevoegd (GET/POST).
- [x] Beveiligde download via server/api/customer-timesheets.php?action=download toegevoegd.
- [x] Uploadvalidatie toegevoegd (PDF/JPG/PNG, max 2 MB, employee/company scope).
- [x] Statusacties toegevoegd: save_draft, submit(received), approve, request_resubmit, mark_sent, mark_sent_to_broker, mark_skipped, restore_missing.
- [x] Auditevents voor customer_timesheet acties toegevoegd.
- [x] Playwright API tests toegevoegd: CTS-API-001 en CTS-API-002.

### Nog bouwen of productieharden

- [x] JPG/PNG server-side omzetten naar PDF (server/lib/simple_pdf.php + GD; getest via CTS-API-H-005).
- [-] Verplaatst naar de laatste fase (buiten VS Code): opslag buiten de publiek toegankelijke webmap op de productieserver, en de virusscanstrategie (productkeuze/externe dienst). Zie Fase 16.

### Recent afgerond in deze fase

- [x] End-to-end UI koppeling naar de backendflow is werkend in auth-mode.
- [x] Statusacties mark_skipped en restore_missing zijn functioneel getest.
- [x] Extra statuspad sent_to_broker is ondersteund in frontend/backendflow.
- [x] MIME-type, bestandsgrootte, veilige bestandsnaam en unieke storage key worden server-side gevalideerd/opgebouwd.
- [x] Employee- en administratorscope, status missing, auditlog en beveiligde download zijn aanwezig.
- [x] Playwright regressie voor customer-timesheets is uitgebreid met happy en negative scenario's.
- [x] Allure en live-doc bundel zijn opnieuw opgebouwd en visueel geverifieerd.
- [x] Living Doc en BDD mapping zijn bijgewerkt met H/N-id conventie en actuele scenario-overzichten.

Status Fase 10:
- [x] schema, API basis, UI-koppeling en regressietests bestaan
- [x] Playwright, Allure en Living Doc dekken de customer-timesheet flow af
- [x] JPG/PNG-conversie naar PDF is gebouwd en getest (CTS-API-H-005); resterende productiehardening (opslaglocatie, virusscan) is verplaatst naar Fase 16

---

## Fase 11 - Facturen en server-side PDF

### Al aanwezig

- [x] Facturentabel.
- [x] Factuur-read-API.
- [x] Factuuroverzicht in frontend.
- [x] Periodefilter.
- [x] Demo-factuurnummers.
- [x] Demo-bedragen.
- [x] Ontvangerkoppelingen in database.
- [x] Client-side/demo-PDFfunctionaliteit bestaat.

### Nog bouwen

- [x] Server-side factuur-PDF (server/lib/simple_pdf.php, gegenereerd bij invoice-lock).
- [x] pdf_storage_key (kolom bestond al in database/schema.sql; wordt nu gevuld na lock).
- [x] PDF alleen geautoriseerd downloaden (action=download op invoices.php, company-/employee-scope; getest via INV-H-004 en INV-N-013).
- [x] PDF-inhoudscontrole (simple_pdf_looks_valid() vóór opslag + %PDF-/%%EOF-assertie in tests).
- [-] Verplaatst naar de laatste fase (buiten VS Code): definitief Path/QSI-briefpapier (brandingkeuze), PDF veilig bewaren op de productieserver, en de credit-/correctiestrategie (bedrijfsbeleid). Zie Fase 16.

### Recent afgerond in deze fase

- [x] Invoice read-API berekent voor open facturen server-side subtotal, btw en totaal op basis van billable_hours en hourly_rate.
- [x] Vergrendelde facturen blijven in read-output op opgeslagen bedragen zodat lock-gedrag behouden blijft.
- [x] De write/lock-flow gebruikt goedgekeurde uren en opdrachtuurtarief, reserveert het factuurnummer transactioneel en vult locked_at.
- [x] Een vergrendelde factuur is immutable; dubbele en gelijktijdige lockrequests hebben regressiedekking.
- [x] Extra regressietests toegevoegd: INV-H-003 en INV-N-003 voor berekening en periodevalidatie.
- [x] Invoice-lock API/Playwright-regressies INV-H-004 en INV-N-008 t/m INV-N-012 zijn aanwezig.
- [x] Security tests geharmoniseerd naar Given/When/Then-stapstijl voor consistente rapportleesbaarheid.
- [x] Auth-mode factuurstatus in UI wordt na serverwrites en reload opnieuw uit invoices read-API gesynchroniseerd; dubbele lokale autoriteit is verwijderd.

Status Fase 11:
- [x] overzicht, server-side berekening en transactionele lock/write-flow met immutable bedragen bestaan
- [x] server-side factuur-PDF, pdf_storage_key, geautoriseerde download en inhoudscontrole zijn gebouwd en getest
- [-] briefpapier, definitieve opslaglocatie en creditstrategie zijn bedrijfsbeslissingen, verplaatst naar Fase 16

---

## Fase 12 - E-mailqueue van de webapp

Let op: dit staat los van GitHub commitnotificaties.

### Al aanwezig

- [x] Tabel email_deliveries.
- [x] Mailontvangers in database.
- [x] Assignment mail routes.
- [x] Brokerconcept.
- [x] Boekhouderconcept.
- [x] EasySalaryconcept.
- [x] Demo-/previewteksten.
- [x] Frontend bevat al delen van de mailworkflow.
- [x] Queue-service en API voor lijst/enqueue/retry.
- [x] Assignment-routes en kanaalspecifieke templates.
- [x] Dry-runmodus is standaard en maakt geen echte verzending.
- [x] Broker krijgt factuurbeleid; EasySalary-route heeft geen factuurbijlage.
- [x] Veertien happy/negative Playwright API-tests.
- [x] Auth-mode verzendstatus in UI wordt afgeleid uit email_deliveries via email-queue read-API; geen lokale voorspelling vóór serverbevestiging.
- [x] Auth-mode notificaties gebruiken server/api/notifications.php als lees- en read-statusbron; klikken op melding, alles-lezen en mededeling-lezen schrijven eerst serverstatus en verversen daarna server-led.

### Nog bouwen

- [x] Factuur-PDF als bijlage (code; nu structureel mogelijk dankzij Fase 11's pdf_storage_key, attachment_policy-mechanisme bestond al en is getest via EQ-H/EQ-N-cases).
- [x] Klanturenstaat als bijlage technisch gebouwd en getest in de mailflow; de operationele live-verzending blijft als laatste stap in Fase 16.
- [x] Retry na tijdelijke fout (al aanwezig, getest: EQ-N-011).
- [x] Maximaal aantal retries (al aanwezig, MAIL_MAX_ATTEMPTS).
- [x] Foutstatus (al aanwezig, status='failed').
- [-] Verplaatst naar de laatste fase (buiten VS Code): Gmail/Google Workspace-config, keuze SMTP vs. Gmail API, en het activeren van echte verzending (pas na acceptatie en expliciete goedkeuring). Zie Fase 16.

Status Fase 12:
- [x] dry-runqueue, routes, templates, frontendkoppeling en regressietests bestaan
- [x] retry/max-retries/foutstatus geverifieerd aanwezig en getest; factuur-PDF-bijlage nu structureel mogelijk
- [-] echte transportconfiguratie (Gmail/SMTP) en verzending zijn extern-afhankelijk, verplaatst naar Fase 16

---

## Fase 13 - Definitieve bedrijfsgegevens en accounts

- [x] Demo-instellingen voor Path/QSI aanwezig.
- [x] Password-reset API en wachtwoord-vergeten frontend bestaan.
- [x] Login rate-limiting en force_password_change flow bestaan.
- [x] Gebruikersbeheer-API kan gebruikers lezen, deactiveren, heractiveren en wachtwoordwijziging afdwingen.
- [x] Role- en companyscope, CSRF en audit-events zijn door regressietests afgedekt.
- [-] Verplaatst naar de laatste fase (buiten VS Code, bedrijfsbeslissingen/administratie): definitieve bedrijfsnaam (QSI/Path), statutaire naam, factuuradres, KvK/btw/IBAN, betalingstermijn, factuurprefix, Circle8-route/adres/e-mailadres, boekhoudernaam/e-mailadres, EasySalary-e-mailadres, definitieve brokerontvangers/mailteksten/herinneringsmomenten, productieaccounts (Gio, Joyce, medewerkers), veilige uitgifte eerste wachtwoorden, gebruikersbeleid, Google Workspace-koppeling, 2FA-beoordeling, productiebeheerder naast Gio, privacy-/bewaartermijnenbeleid en exportbeleid. Zie Fase 16 voor de volledige lijst.

Status Fase 13:
- [x] auth-hardening, resetflow en gebruikersbeheer technisch aanwezig en getest
- [-] fase als geheel: alle resterende punten zijn bedrijfsbeslissingen/administratie buiten VS Code, verplaatst naar Fase 16

---

## Fase 14 - TransIP productieomgeving

Dit is de oorspronkelijke productielijst en blijft volledig onderdeel van de masterchecklist.

### Al afgerond volgens jouw TransIP-informatie

- [x] Subsite uren.pathconsultancy.nl aangemaakt.
- [x] Subsite ingeschakeld.
- [x] MySQL-database pathco_Urenuru aangemaakt.
- [x] Databasehost gevonden.
- [x] Databasegebruiker aangemaakt.
- [x] Demo-app gebouwd.
- [x] Demo-app lokaal getest.
- [x] Productieguards voor install.php, migrate.php en health.php.
- [x] server/.htaccess hardening en veilige config.example.php defaults.
- [x] Production-safety regressietests voor de guards.

### Nog door jou in TransIP controleren, en productie-installatie

- [-] Verplaatst naar de laatste fase (buiten VS Code, TransIP-controlepaneel/SSH/hostingpaneel): wachtwoordrotatie, PHP-versie/SSL-controle, documentroot/sitepad, back-upbeleid en -retentie, handmatige database-export, volledige productie-installatie (config.local.php, environment=production, databasegegevens, health/install/migrate op TransIP, productieaccounts, schrijfrechten, PHP-uploadlimits/sessie-instellingen, cron voor e-mailqueue, foutlogging/logrotatie, demo-uitschakeling, wachtwoordvervanging, bestandsrechten, databaserechten). Zie Fase 16 voor de volledige lijst.

Status Fase 14:
- [x] subsite/databasebasis en applicatiehardening aanwezig
- [-] fase als geheel: TransIP-productieconfiguratie, deployment en operationele controles zijn verplaatst naar Fase 16 (buiten VS Code)

---

## Fase 15 - Acceptatie, mobiel, PWA en livegang

### Lokaal al bewezen

- [x] Administrator kan lokaal inloggen.
- [x] Medewerker kan lokaal inloggen.
- [x] Rollen worden lokaal afgedwongen.
- [x] Medewerker ziet lokaal alleen eigen data.
- [x] Concepturen opslaan werkt.
- [x] Indienen werkt.
- [x] Correctieverzoek werkt op API-niveau.
- [x] Herindienen werkt op API-niveau.
- [x] Goedkeuren werkt op API-niveau.
- [x] Auditlog voor urenflow.
- [x] Optimistic locking op API-niveau.
- [x] Playwright-testarchitectuur.
- [x] Allure.
- [x] Living Documentation.
- [x] Smoke-tests.
- [x] Grote controlescripts.
- [x] Volledige correctie/herindiening/goedkeuring in desktopbrowser en mobiele emulatie.
- [x] Pixel 7 Chromium- en iPhone 13 WebKit-projecten met responsive layout-, touch-, modal- en overflowcontroles.
- [x] Alle zichtbare dashboardtellers gebruiken dezelfde concrete werkvoorraad; een afwijkend API-aggregaat kan hero, KPI, CTA en taakregels niet meer laten verschillen.
- [x] `start-path-app.cmd mobile` ondersteunt een smalle lokale browserpreview en gebruikt dezelfde gecontroleerde PHP-startflow.
- [x] Dashboardhiërarchie is compacter en rustiger gemaakt met beter leesbare ondersteunende tekst.

### Nog voor livegang - lokaal/VS Code haalbaar

- [x] Dubbelklikken en dubbele requests testen (Playwright) — INV-N-012 (facturen) en TS-REV-API-H-006 (urenstaten) bewijzen dit met twee gelijktijdige contexten.
- [x] Gelijktijdig gebruik door twee beheerders testen (Playwright) — zie TS-REV-API-H-006.
- [x] December → januari en jaarwisseling testen (Playwright met gesimuleerde periodes) — TS-REV-API-H-007.
- [x] Grote uploads en foutieve bestanden testen (Playwright) — CTS-API-N-008 (>2 MB) en de bestaande CTS-API-N-005 (ongeldig type).
- [x] Basiscontrole op toetsenbordbediening en leesbaarheid (lokaal in browser) — A11Y-H-001 en A11Y-H-002.
- [x] Dependency/securityscan uitvoeren (`npm run security:deps` / `security:deps:full`) — bestaand script, herbevestigd bruikbaar.
- [x] PWA-manifest (`manifest.webmanifest`, gelinkt in index.html).
- [x] Service worker (`sw.js`, defensief geregistreerd; bewust nog geen offline-cachingstrategie, zie Fase 16).

### Verplaatst naar de laatste fase (buiten VS Code)

- [-] Alle productie-praktijktests (adminlogin, medewerkerlogin, privacy, concept/indienen/correctie/herindienen/goedkeuren, klanturenstaat upload/download, factuurbedragen/btw/nummering/PDF-controle, broker-/boekhouder-/EasySalary dry-run, echte mailroute), back-up maken en herstellen, fysieke toestellen (iPhone/Android/tablet), PWA-installatie/offline-gedrag, monitoring/health/securitylogging/logrotatie, go-live/rollback-runbook (inclusief daadwerkelijk oefenen), volledig schone productie-installatie, controle op afwezigheid van demo-data, één volledige maandflow op productie, release-tag van de productieversie, en de acceptatie door Gio, Joyce en één medewerker met pas daarna echte mail activeren. Zie Fase 16 voor de volledige lijst.

Status Fase 15:
- [x] desktop- en mobiele emulatieregressie lokaal ingericht en bewezen
- [x] v0.9.41 releasepipeline #62 inclusief Test, Living Docs en Prod geslaagd
- [x] dashboardwerkvoorraad en mobiele previewstart lokaal hersteld en gericht getest
- [x] volledige vervolgmatrix lokaal en in de releasepipeline opnieuw groen: 161/161 browseruitvoeringen
- [x] alle lokaal/VS-Code-haalbare Fase 15-punten (concurrency, jaarwisseling, uploads, accessibility, dependency-scan, PWA) zijn gebouwd en getest
- [-] alles wat productieomgeving/fysieke toestellen/menselijke acceptatie vereist is verplaatst naar Fase 16

---

## Fase 16 - Laatste fase: alles wat buiten VS Code moet gebeuren (verzameld) + beheer na livegang

Dit is nu het verzamelpunt voor ieder open punt uit de hele checklist waarvoor je een browser naar een extern paneel (TransIP, GitHub-website, Google Workspace), een fysiek toestel, of een gesprek/administratieve actie nodig hebt. Alles wat in VS Code zelf (code, terminal, Playwright, git) gedaan kan worden, is in de eigen fase blijven staan.

- [x] Auditlog-API voor beheerders met entity/event filters en secret-redactie.
- [x] Zes API-regressies voor toegang, filters en gevoelige data.

### A. Eenmalig, vóór livegang (buiten VS Code)

**Uit Fase 5 - productiehardening op het echte domein:**
- [x] Productie-CORS technisch beperkt tot `https://uren.pathconsultancy.nl`; externe domeincontrole blijft open.
- [x] Content-Security-Policy technisch voorbereid en door preflight bewaakt.
- [x] HSTS veilig voorbereid maar bewust uitgeschakeld; activering blijft open tot HTTPS is bewezen.
- [x] PHP-errorlogging buiten publieke output technisch voorbereid.
- [x] Niet-mutatieve logrotatiecheck en uitvoerscript gebouwd; croninstallatie blijft extern open.

**Uit Fase 7 - GitHub-website en overleg:**
- [-] Ken/Gio-notificaties en definitieve notificatieontvangers bevestigen.
- [-] Echte aparte Dev/Test/Acc-hosts invullen.
- [-] Branch protection op main instellen.
- [-] Verplichte groene statuschecks voor merge instellen.
- [-] Productieapproval instellen voor echte deploy.

**Uit Fase 9:**
- [-] Productieacceptatie van de correctie/goedkeuringsflow.

**Uit Fase 10:**
- [x] Private storagepaden en containmentchecks buiten de webroot gebouwd en op TransIP bewezen;
  root plus `invoices`, `customer-timesheets`, `backups` en `logs` bestaan, zijn schrijfbaar en
  hebben mode `700`.
- [-] Virusscanstrategie bepalen (productkeuze/externe dienst).

**Uit Fase 11:**
- [x] Facturerende identiteit bevestigd als Path Consultancy, handelsnaam van QSI Consultancy B.V.; visuele controle van eerste productie-PDF blijft open.
- [x] Factuur- en klanturenstaatopslag technisch buiten de webroot gekoppeld; productiepad,
  schrijfrechten en mode `700` zijn read-only bewezen.
- [-] Credit-/correctiestrategie (bedrijfsbeleid).

**Uit Fase 12 - Gmail/Google Workspace:**
- [x] Applicatieconfig voor Google Workspace SMTP Relay technisch voorbereid zonder credentials.
- [x] Transportkeuze bevestigd: IP-gebaseerde SMTP Relay op poort 587 met verplichte STARTTLS.
- [x] Netwerk-/TLS-preflight vanaf TransIP bewezen zonder SMTP-transactie: DNS werkt, poort 587
  is bereikbaar, TLS 1.3 en certificaatverificatie voor `smtp-relay.gmail.com` zijn groen.
- [-] Echte verzending activeren (pas na acceptatie en expliciete goedkeuring).

**Uit Fase 13 - definitieve bedrijfsgegevens en accounts:**
- [x] Facturerende identiteit bevestigd: Path Consultancy, handelsnaam van QSI Consultancy B.V.
- [x] Definitieve statutaire naam, handelsnaam, factuuradres, KvK-nummer, btw-nummer, IBAN,
  betalingstermijn en factuurprefix vastgelegd in het gevalideerde `path-consultancy`-productieprofiel.
- [-] Definitieve Circle8-route, factuuradres en e-mailadres/portaal.
- [x] Boekhouderroute bevestigd voor `giovanno.maatsen@pathconsultancy.nl` (factuur, 1 bijlage).
- [x] Salarisroute bevestigd voor `gambitizanagi@gmail.com` (naam/maand/uren, 0 bijlagen).
- [x] Eerste brokerroute bevestigd voor `rana.ramjanam@pathconsultancy.nl` (factuur alleen;
  klanturenstaat wordt apart via de klanturenstaatflow verzonden).
- [x] Eerste twee productiebeheerders aangemaakt met persoonlijke tijdelijke wachtwoorden en verplichte
  wachtwoordwijziging: `info@pathconsultancy.nl` (Path Backoffice) en
  `kenrich.lieveld@pathconsultancy.nl` (Kenrich Lieveld). Wachtwoorden staan niet in Git of documentatie.
- [-] Persoonlijke medewerkeraccounts en eventuele aanvullende beheerders veilig uitnodigen.
- [x] Gebruikers deactiveren/verwijderenbeleid technisch vastgelegd: deactiveren stopt toegang en
  bewaart historie; definitief verwijderen kan alleen voor een inactief medewerkersaccount zonder
  zakelijke of beveiligingshistorie en wordt anders server-side met 409 geblokkeerd.
- [-] Google Workspace-koppeling.
- [-] Tweefactorauthenticatie voor beheerders beoordelen (sterk aanbevolen).
- [-] Productiesessiebeleid aanscherpen van de huidige sliding 8 uur naar bij voorkeur 30 minuten
  inactiviteit, met een zichtbare waarschuwing en expliciete verlenging; apart bouwen en testen.
- [-] Bepalen wie productiebeheerder is naast Gio.
- [-] Privacy- en bewaartermijnen vastleggen voor uren, uploads, facturen en auditlogs.
- [-] Vastleggen wie gegevens mag exporteren, corrigeren en archiveren.

**Uit Fase 14 - TransIP-controlepaneel/SSH:**
- [x] Productiedatabasewachtwoord door eigenaar geroteerd zonder het in chat of Git te plaatsen;
  de interactieve configurator heeft de verbinding read-only gevalideerd en `config.local.php` met mode `0600` geïnstalleerd.
- [x] PHP-versie op TransIP read-only bevestigd: 8.4.24.
- [x] HTTPS/SSL op `https://uren.pathconsultancy.nl` bereikbaar en TransIP Let's Encrypt ingeschakeld; HSTS blijft bewust uit tot observatie na cutover.
- [x] Exacte documentroot via controlepaneel en SSH bevestigd: `/data/sites/web/pathconsultancynl/subsites/uren.pathconsultancy.nl`.
- [x] SSH-keytoegang bevestigd voor `pathconsultancynl@pathco.ssh.transip.me`.
- [x] Private productiemappen bestaan onder `/data/sites/web/pathconsultancynl/private/path-urenregistratie`.
- [-] TransIP-back-ups controleren (database inbegrepen, retentieperiode).
- [x] Handmatige database-export vóór productiemigratie gemaakt buiten de webroot:
  `path-db-20260813-131718.sql` (40.769 bytes), met SHA-256
  `b98f214e27ecec808e426426e407d8d8cfe40190c4d08c61bb3aabb1507c4286`.
- [x] Definitieve pre-cutoverdatabase-export na bedrijfsprofiel en beheeraccounts gemaakt buiten de
  webroot: `path-db-20260813-173031.sql` (42.831 bytes), SHA-256
  `e876ab5d857b580b20a274fa71081676a6a9d3fb2c6cc706071119ba90875edc`.
- [x] Stagingprocedure bewezen met release `9fad9592e3d3`: als niet-actieve private bundel
  geüpload, uitgepakt
  en remote geverifieerd met SHA-256
  `813040f36879edaa00602f177cba9e55fdbfae63a74131bf54201db4f446e05a`;
  de publieke documentroot is niet gewijzigd.
- [x] Release Pipeline voor v0.9.50-maincommit `97065e9a776fa2cb43da584fbbeee4a8449a683e` volledig groen;
  exact die release is checksum-gecontroleerd in private TransIP-staging geplaatst en de rollback
  naar v0.9.44 is tijdens de eerste live-smoke succesvol bewezen.
- [x] v0.9.56-release `257ca35d1e7e45bc467bcf68a568a6f2b73883c5` exact uit Git gearchiveerd,
  lokaal en op TransIP op 19.829.384 bytes en SHA-256
  `ca938e6938c65fe76fdfec4d2c17864f50d5ec97b95500d6e3133ab08d20e806` geverifieerd.
- [x] Na expliciete `GO_LIVE_257ca35` is v0.9.56 atomair naar de documentroot geactiveerd en
  v0.9.53 als rollback onder `rollback-v0.9.53-pre-257ca35` bewaard.
- [x] Direct na cutover `https://uren.pathconsultancy.nl/index.html#` gecontroleerd op HTTP 200,
  juiste versie/assets, health, login, hash-routing en volledig groene live preflight.
- [x] Vanaf v0.9.57 wordt dezelfde uitrol automatisch als laatste main-pipelinejob uitgevoerd. De eerste
  echte run `31766313202` is volledig groen en heeft exact main-SHA `21cdfb1954d526...` uitgerold.
  Deploy blijft fail-closed bij niet-main, onjuiste SHA/checksum, open mailwindow, niet-lege queue of
  mislukte live-smoke.
- [x] Automatische pre-cutoverback-up gemaakt buiten de webroot als
  `path-db-20260814-033906.sql` (98.995 bytes), SHA-256
  `0384db3f244645c6ac97da4dc4399954ccb9c6a9052b162440a7538ab38293be`.
- [x] Automatische rollback voor deze uitrol staat onder
  `rollback-v0.9.56-pre-21cdfb1954d5-31766313202-1-20260814-033906`.
- [x] Productie `server/config.local.php` via de interactieve fail-closed configurator gemaakt;
  databaseverbinding, private storage, securityconfig en uitgeschakelde echte mail zijn groen.
- [x] Productiemigraties 012 en 013 zijn op TransIP uitgevoerd; bestaande migraties zijn idempotent
  overgeslagen en demo-migraties staan uit.
- [x] Bedrijfsprofiel/bootstrap uitgevoerd: Path Consultancy als handelsnaam van QSI Consultancy B.V.;
  de live read-only productiepreflight is daarna volledig groen.
- [-] Productiebeheerlogin en basissmoke zijn groen; persoonlijke medewerkerlogin en volledige
  productiepraktijkflow blijven open totdat een echte medewerker veilig is uitgenodigd.
- [x] Schrijfrechten upload-/PDF-mappen bewezen (mode `700`); PHP `upload_max_filesize=2M`
  en `post_max_size=8M` sluiten aan op de applicatiegrens van maximaal 2 MB; de app forceert
  zelf Secure/HttpOnly/SameSite=Lax voor productiesessies.
- [x] Cronmogelijkheid op TransIP bevestigd (`/usr/local/bin/crontab`).
- [-] E-mailqueue-, back-up- en logrotatiecron pas na configuratie/cutover installeren en verifiëren.
- [-] Foutlogging buiten publieke output; `display_errors` uit in productie; logs buiten webroot + logrotatie.
- [-] Alle lokale/testwachtwoorden vóór livegang vervangen.
- [x] Uploads/PDF's buiten de publieke webroot en private mappen op mode `700` bevestigd.
- [-] Databaseverbinding met zo weinig mogelijk rechten configureren.
- [-] Back-upretentie en opslaglocatie controleren.

**Uit Fase 15 - productie-praktijktests en acceptatie:**
- [-] Volledige correctie/goedkeuringsflow en alle overige flows (concept, indienen, correctie, herindienen, goedkeuren, klanturenstaat upload/download) handmatig op productie testen.
- [-] Productieprivacytest; productie-adminlogin en -medewerkerlogin.
- [-] Factuurbedragen, btw, factuurnummering en PDF controleren op productie.
- [-] SMTP STARTTLS en een eerdere externe proefbezorging zijn bewezen. De vijf scenario's zijn
  inhoudelijk/preflight groen, maar de volledige acceptatiebundel is nog niet ontvangen en beoordeeld.
  Drie afwijzingen tijdens Google-configuratiepropagatie zijn definitief afgesloten; er staat niets
  meer in de queue. Herhaal iedere mail afzonderlijk wanneer de eigenaar online is en sluit daarna
  `mail.enabled` en `acceptance_test.enabled` opnieuw direct.
- [-] Productieaccount `gch.lieveld@live.nl` bestaat al als gedeactiveerde medewerker `Gio Ma12`
  (user-id 7); daarom is een tweede beheeraccount met hetzelfde adres terecht geweigerd. Na v0.9.58
  leidt de GUI direct naar dit bestaande inactieve account. Beslis daar bewust tussen opnieuw
  activeren, het adres wijzigen of — alleen zonder historie — definitief verwijderen voordat het
  adres voor een andere rol wordt gebruikt.
- [-] Back-up maken en database/bestanden herstellen uit back-up.
- [-] Mobiele admin-/medewerkerflow op fysieke iPhone, Android en tablet.
- [-] PWA-installatie en offline-/updategedrag bepalen op een echt toestel.
- [x] Mobiel versienummer zichtbaar gemaakt; de lokale/TEST-Herstelknop is mobiel bereikbaar met
  minimaal 42 px touchdoel. Productie verbergt Herstel bewust omdat productie server-authoritatief is.
- [-] Monitoring, health monitoring, securitylogging en logrotatie inrichten.
- [x] Go-live- en rollbackrunbook geschreven in `OPERATIONS-RUNBOOK.md`; daadwerkelijk oefenen blijft extern open.
- [-] Volledig schone productie-installatie vanaf nul uitvoeren.
- [-] Controleren dat er geen demo-gebruikers/demo-mails/toekomsttestperioden aanwezig zijn.
- [-] Eén volledige maandflow op productie doorlopen (invoer → indienen → correctie → herindienen → goedkeuren → factuur definitief → mails dry-run).
- [-] Release-tag aanmaken van de productieversie.
- [-] Acceptatie laten bevestigen door Gio, Joyce en één medewerker; pas daarna echte mail activeren.

### B. Doorlopend beheer na livegang

- [-] Eerste week dagelijks errorlogs controleren.
- [-] Mailqueue dagelijks controleren; mislukte mails opnieuw aanbieden.
- [-] Backupstatus en uptime/health controleren.
- [-] Eerste echte maandflow, correctie/goedkeuring, factuur, broker-mail en EasySalary-route volgen en narekenen.
- [-] Kleine productiebugs oplossen.
- [-] Vastleggen wie verantwoordelijk is voor mislukte mails; waarschuwingen instellen (mailqueue vast, health.php faalt).
- [-] Vastleggen hoe medewerkers productieproblemen melden; incidentlog bijhouden.
- [-] Maandelijkse dependency-updates plannen; elk kwartaal een hersteltest van de back-up.
- [-] Database-/opslaggroei, verlopen/inactieve accounts en auditlogs periodiek controleren.
- [-] Daarna normaal beheerregime.

Status Fase 16:
- [x] technische audit-API-basis aanwezig en getest
- [x] Bundel-1-tooling voorbereid: SMTP/STARTTLS, offline mailpreflight, private storage, logging/rotatie, queuecron, back-up/restore, productiepreflight, interactieve productieconfiguratie, accountprovisioning en runbooks
- [x] Release Pipeline voor v0.9.52-maincommit `22013f5d591c2cb10e91a188fe76f40a92df5b45` volledig groen;
  v0.9.52 staat live en de live-smoke en productiepreflight zijn groen.
- [x] Bundel 2 voorbereiding: checksum-release staat veilig in private TransIP-staging; PHP/PDO,
  opslagrechten, uploadlimieten, cronbeschikbaarheid, SMTP STARTTLS, bedrijfsprofiel, twee
  beheeraccounts, databaseback-up en live read-only preflight zijn bewezen.
- [-] fase als geheel: v0.9.57 staat veilig live. v0.9.54 met afgeschermde TEST-mailmodus,
  v0.9.55 met Backoffice-verzendadministratie en v0.9.56 met de acceptatieconsole zijn groen op `main`.
  Google SMTP Relay accepteert het uitgaande TransIP-IP `85.10.158.7`, STARTTLS en afzenders binnen
  `pathconsultancy.nl`. Eén gecontroleerde mail van `backoffice@pathconsultancy.nl` naar het vooraf
  toegestane testadres is extern ontvangen. De vijf nieuwe acceptatieknoppen richten de drie
  businessmails en wachtwoordreset op `info@pathconsultancy.nl` en de eerste uitnodiging op
  `gch.lieveld@live.nl`. De tijdelijke acceptatiewindow is na de proef aantoonbaar gesloten:
  `mail.enabled=false`, `acceptance_test.enabled=false`, queue 0 en het testaccount weer inactief.
  v0.9.57 automatiseert de veilige main→TransIP-uitrol; de eerste volledige automatische uitrol en
  live-smoke zijn groen. De vijf ontvangen acceptatiemails blijven open bewijs.

---

## Harde blokkades vóór livegang

Deze mogen **absoluut niet open** blijven wanneer echte medewerkers starten:

- [-] Geen demo-accounts of demo-wachtwoorden in productie
- [-] install.php en migrate.php beschermd of uitgeschakeld
- [-] health.php lekt geen technische gegevens
- [-] Productiewachtwoorden geroteerd
- [-] Back-up én herstel succesvol getest
- [-] Employee ziet uitsluitend eigen data
- [-] Definitieve factuur is immutable
- [x] E-mail blijft technisch fail-closed/dry-run tot afzonderlijke goedkeuring
- [-] Rollbackprocedure getest
- [-] Volledige productieflow geaccepteerd

---

## Na eerste livegang (mag wachten)

- [-] Volledige PWA/offlinefunctionaliteit
- [-] Uitgebreid monitoringdashboard
- [-] Geavanceerde performance-/loadtests
- [-] Uitgebreide rapportage-export
- [-] Automatische archivering
- [-] Extra beheerdersdashboard voor auditlogs

---

## Samenvatting huidige stand

- [x] Fase 1 - lokale basis
- [x] Fase 2 - database/server-led state: alle businesskritische writes server-led, localStorage
  beperkt tot UI-state, alle cross-cutting bewijspunten afgedaan door Slices B/C/D/E; 148/148 groen.
- [x] Fase 3 - read-API
- [x] Fase 4 - auth en rollen
- [x] Fase 5 - securitybasis afgerond; resterende productiehardening (CORS/CSP/HSTS/logging op echt domein) verplaatst naar Fase 16
- [x] Fase 6 - Playwright, Allure, Living Doc en agents
- [x] Fase 7 - CI/CD-basis + volledige pipeline end-to-end groen bewezen (run #91); resterend (branch protection, echte hosts, productieapproval, notificatieontvangers) verplaatst naar Fase 16
- [x] Fase 8 - uren concept opslaan en indienen
- [x] Fase 9 - correctie/goedkeuring desktop en mobiel bewezen; pipeline bevestigd; productieacceptatie volledig verplaatst naar Fase 16
- [x] Fase 10 - klanturenstaat: schema + API + UI-koppeling + regressie afgerond; JPG/PNG-conversie naar PDF gebouwd en getest (CTS-API-H-005); opslagplek/virusscanstrategie verplaatst naar Fase 16
- [x] Fase 11 - factuur lock/write en serverberekening bewezen; server-side PDF/opslag-key/download-autorisatie/inhoudscontrole gebouwd en getest (INV-H-004, INV-N-013); briefpapier/opslaglocatie/creditbeleid verplaatst naar Fase 16
- [x] Fase 12 - e-mail: queue-service + dry-run + assignment-routes + tests afgerond; retry/max-retries/foutstatus geverifieerd aanwezig; factuur-PDF-bijlage nu structureel mogelijk; Gmail/Google Workspace-config en echte verzending verplaatst naar Fase 16
- [x] Fase 13 - bedrijfsdata: gebruikersbeheer-API, wachtwoord-reset, rate-limiting, force_password_change afgerond; alle definitieve bedrijfsgegevens/accounts volledig verplaatst naar Fase 16
- [x] Fase 14 - TransIP: hardening (install/migrate/health guards, .htaccess) afgerond; deployment + productie-config volledig verplaatst naar Fase 16
- [x] Fase 15 - lokaal 161/161 browseruitvoeringen groen (inclusief MOB-H-003 en DASH-N-008
  na volledige muterende reeks), GUI smoke en `npm run check` groen; concurrency/jaarwisseling/
  uploads/accessibility/PWA gebouwd en getest; productiepraktijktests/acceptatie → Fase 16
- [-] Fase 16 - Bundel 1, de gecontroleerde productiecutover en de automatische v0.9.57-uitrol zijn
  afgerond; Bundel 3 (volledige menselijke productieacceptatie en beheerinrichting) blijft open

Telling fasestatussen:
- [x] **15 fasen volledig bewezen of volledig verplaatst voor hun VS-Code-scope: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 en 15.**
- [x] 1 fase is de laatste, verzamelende fase: 16 (alle buiten-VS-Code-taken + post-live beheer).

## Directe volgende stap

**Fase 1 t/m 15 zijn functioneel ingericht; v0.9.73 borgt daarnaast dat meldingen direct vanaf de
eerste render servergestuurd zijn en zichtbaar synchroon van `3 → 2 → 1 → 0` lopen.** De
aparte TEST-host, database, private opslag, publieke login-smoke en mailsandbox zijn bewezen in
run `31803329714`.

- [x] De acceptatieconsole toont iedere verwachte factuur- en klanturenstaat-PDF afzonderlijk in de
  lijst én bevestiging en opent exact de serverbijlage die na bevestiging wordt verzonden.

1. Commit en push de lokaal volledig groen gevalideerde v0.9.73 en laat dezelfde release exact door de volledige pipeline, TEST-uitrol en
   automatische PROD-uitrol bewaken. Lokaal bewijs: `npm run check` groen, GUI-smoke groen en
  217/217 Playwright-uitvoeringen groen; build, DB-H-001, dependency-audit en diffcontrole zijn ook groen.
2. Verstuur op TEST de vijf
   acceptatiemails één voor één en controleer ontvanger, onderwerp, tekst, linkgebruik en PDF-bijlagen.
3. Rond daarna de open productiepraktijktests, fysieke mobiele acceptatie, cron/monitoring,
   back-uprestore-oefening, 2FA-/sessiebeleid en eerste volledige maandflow af.

## Dagelijkse werkwijze (verplicht)

1. Gebruik deze masterchecklist elke werkdag als enige technische voortgangslijst.
2. Werk de checklist direct bij na elke commit en push.
3. Vink af wat aantoonbaar klaar is en testbewijs heeft.
4. Voeg nieuwe taken of nieuwe cases meteen toe onder de juiste fase.
5. Markeer nieuwe problemen direct als [!] en zet ze na oplossing terug naar [x] of [-].

## Rapportage na elke stap

A. Wat voor de stap al af was
B. Wat in deze stap is afgerond
C. Wat gedeeltelijk klaar is
D. Wat nog openstaat
E. De volledige bijgewerkte masterchecklist
F. Lokaal getest / gecommit / gepusht / pipeline-status

## Bronnen

- [x] PRODUCTIE-CHECKLIST.md
- [x] LIVING-DOC.md
- [x] TEST-BDD-MAPPING.md
- [x] tests/playwright/*.spec.ts

- [x] TEST-mailstatus in de GUI eerlijk tonen en de beveiligde TEST-sandbox gecontroleerd kunnen pauzeren/hervatten; LOCAL blijft dry-run en PROD heeft geen losse GUI-schakelaar.
