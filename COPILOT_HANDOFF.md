# Copilot ↔ Codex overdracht

Dit bestand is de gedeelde brug tussen GitHub Copilot en Codex. Chatvensters zijn niet onderling zichtbaar, maar beide assistenten kunnen dit bestand in de werkmap lezen.

## Samenwerking Copilot ↔ Codex

Copilot en Codex kunnen niet rechtstreeks communiceren. Werkwijze:
1. Als Copilot vastloopt of hulp nodig heeft, schrijft hij een **VRAAG AAN CODEX** onderaan dit bestand.
2. De gebruiker plakt die vraag in de Codex-chat.
3. Codex schrijft het antwoord terug als **ANTWOORD VAN CODEX** in dit bestand.
4. Copilot leest het antwoord bij de volgende taakstart.

Codex doet hetzelfde in omgekeerde richting.

## Instructie voor GitHub Copilot

Werk dit document na iedere betekenisvolle stap bij met:

- datum en tijd;
- huidige taak;
- diagnose en bewijs;
- gewijzigde bestanden;
- uitgevoerde tests en resultaten;
- voorgestelde volgende stap;
- eventuele vraag aan Codex.

Verwijder eerdere relevante bevindingen niet. Noteer geen wachtwoorden, tokens of andere geheimen.

## Actuele overdracht

### 2026-08-14 · Codex — actuele bron voor hervatten

- Doel: de uren-, document-, factuur-, account- en mailketens als één samenhangend product
  stabiliseren. Een wijziging is pas klaar wanneer productcode, Functioneel Ontwerp, Technisch
  Ontwerp, featurecase, uitvoerbare Playwright-assertions en releasebewijs met elkaar kloppen.
- Functionele bron: `path-urenregistratie/FUNCTIONEEL-ONTWERP.md`.
- Technische bron: `path-urenregistratie/TECHNISCH-ONTWERP.md`.
- Voortgang en externe acceptatie: `path-urenregistratie/MASTERCHECKLIST.md`.
- Uitvoerbare specificaties: `path-urenregistratie/tests/playwright/*.spec.ts`; de bestanden onder
  `tests/playwright/features` en `tests/playwright/steps` worden met `npm run docs:sync` daarvan
  afgeleid. Maak geen tweede feature-/stepboom aan.
- Kritieke invarianten:
  1. globale werkvoorraad verandert niet door maandnavigatie;
  2. `alle = Backoffice + medewerkers = som per maand`;
  3. iedere geslaagde medewerkeractie levert zonder F5 de juiste Backoffice-vervolgtaak op;
  4. ingediende, goedgekeurde en gefactureerde uren zijn vergrendeld; alleen `draft` en
     `correction` zijn bewerkbaar;
  5. rolwissel in LOCAL/TEST vult account en testcredentials direct opnieuw;
  6. herstel is alleen voor beheerders in LOCAL/TEST;
  7. TEST-mail wordt uitsluitend naar de geconfigureerde TEST-sink herschreven; PROD wordt nooit
     door TEST-acceptatiecode geopend;
  8. accounts met historie worden gedeactiveerd, niet hard verwijderd; een schoon inactief account
     mag wel definitief weg en de laatste actieve beheerder nooit.
- Reeds bewezen gerichte regressies in de huidige werkboom:
  - expliciete E2E-specificatie: `tests/playwright/features/end-to-end-workflows.feature`, met
    uitvoerbare bron `tests/playwright/business-workflows-e2e.spec.ts`;
  - `E2E-H-001..006`: herstel/maandinvariant, rolwissel zonder F5, correctieherindiening met
    taakoverdracht medewerker → Backoffice, goedkeuring → factuur, klanturenstaat → brokerroute en
    eenmalige wachtwoordreset met geblokkeerd tokenhergebruik, 6/6 groen;
  - `TS-REV-UI-H-008`: volledige browserketen indienen → correctie → herindienen → goedkeuren →
    heropenen → opnieuw indienen, 1/1 groen;
  - `TS-REV-UI-H-009`: ingediende uren zijn vergrendeld, 1/1 groen;
  - `DASH-H-012`: herstel levert de lokale basis 12 totaal / 7 Backoffice / 5 medewerker, groen.
- Belangrijke diagnose: een geslaagde timesheetwrite kon wel de interne status bijwerken maar de DOM
  niet renderen doordat een onvolledige serveraankondiging zonder `recipientIds` `renderAll()` liet
  afbreken. De frontend normaliseert dat veld nu. Tijdens submit worden autosave en verouderde GET-
  responses bovendien tegengehouden.
- De Living Doc-inventaris bevat na uitbreiding van de E2E-feature 203 Playwright-cases en 1 DB-case
  (204 unieke uitvoerbare cases). De gegenereerde feature- en navigatiebestanden worden niet handmatig
  als tweede testimplementatie onderhouden.
- Lokale eindgate v0.9.64: `npm run check`, de uitgebreide GUI-smoke met alle zes centrale
  E2E-ketens en de volledige desktop/mobile/API-regressie zijn groen. Volgende stap is de bewuste
  commit/push en het volgen van TEST- en PROD-pipelines.
- Veilige hervatcommando's vanuit `path-urenregistratie`:
  - `npm run check`
  - `npm run test:gui-smoke`
  - `npm run test:e2e`
  - `npm run docs:sync`
- Extern open: daadwerkelijke Google SMTP-bezorging op de aparte TEST-host en menselijke controle van
  mailinhoud/bijlagen. Noteer nooit wachtwoorden, tokens, private keys of databasecredentials hier.

### 2026-08-12 15:48 · Copilot

- Taak: laatste auth-regressie in de logout-flow oplossen en de lokale eindgate opnieuw bewijzen zonder commit/push/go-live.
- Diagnose: de Playwright-logouthelper was te gevoelig voor een UI-race: het klikpad op `#switch-role` kon worden verlaat voordat de app-shell echt in de logged-out toestand was gekomen. De vaste oplossing is om logout via de authenticated request-context te doen en daarna de pagina opnieuw te laden, zodat de werkelijke server-session en de UI-state samen teruggaan naar de login-shell.
- Bewijs: `npx playwright test tests/playwright/auth.spec.ts --reporter=line` gaf `6 passed (17.9s)`; `npm run check` gaf `Path v0.9.46 volledige smoke test: geslaagd`.
- Gewijzigde bestanden: `path-urenregistratie/tests/playwright/pages/LoginPage.ts`.
- Uitgevoerde tests: `npx playwright test tests/playwright/auth.spec.ts --reporter=line`, `npm run check`.
- Volgende stap: geen commit/push, geen echte mail, geen go-live; lokaal blijft de technische end gate groen, met de resterende Fase-16-externe punten apart als Bundel 2.

### 2026-08-12 14:28 · Copilot

- Taak: productieveiligheidscheck voor SMTP-voorbereiding corrigeren en opnieuw bewijzen dat de veilige mailconfig intact blijft zonder echte verzending.
- Diagnose: de oudere test verwachtte nog een `dry_run` transport, maar de actuele veilige configuratie is bewust `mail.enabled = false` met `transport = smtp_relay` en STARTTLS-gateway; hiermee blijft real mail uitgeschakeld terwijl de productie-setup wel voorbereid is.
- Bewijs: `npm run check && npx playwright test tests/playwright/production-safety.spec.ts --grep "SAFE-H-004"` gaf `Path v0.9.46 volledige smoke test: geslaagd` en `1 passed (450ms)`.
- Gewijzigde bestanden: `path-urenregistratie/tests/playwright/production-safety.spec.ts`, `COPILOT_HANDOFF.md`.
- Uitgevoerde tests: `npm run check`, `npx playwright test tests/playwright/production-safety.spec.ts --grep "SAFE-H-004"`.
- Volgende stap: de resterende Fase-16-externe items als één bundel vastleggen en alleen bij echte external blocker stoppen; geen echte mail of go-live.

### 2026-08-12 13:02 · Copilot

- Taak: Veiligheidscheck `config.example.php` repareren zodat de smoke-test opnieuw slaagt.
- Diagnose: de waarde in `server/config.example.php` staat technisch op `false`, maar niet in de exacte stringvorm die de smoke-test verwacht: ` 'enabled' => false` zonder extra spaties. De assert controleert exact tekst en faalt daardoor.
- Bewijs: `npm run check` faalde met `Error: config.example.php moet mail standaard uitgeschakeld hebben (mail.enabled = false)` bij `scripts/smoke-test.mjs:1496`.
- Gewijzigde bestanden: `path-urenregistratie/server/config.example.php`, `COPILOT_HANDOFF.md`.
- Uitgevoerde tests: `npm run check` nog niet opnieuw gelopen; uitgevoerd na patch.
- Volgende stap: de check opnieuw draaien en eventuele aanvullende regressies afhandelen.

### 2026-08-12 12:46 · Codex

- Taak: MOB-H-003-flakiness in Mobile Safari diagnosticeren en herstellen.
- Hoofdoorzaak: `LoginPage.open()` registreerde `waitForResponse()` pas na `page.goto()`. De auth-response was dan al voorbij, waardoor iedere run stil 20 seconden van de globale timeout verloor.
- Aanvullende race: `LoginPage.logout()` keerde terug vóór de asynchrone `logoutLocal()` het loginscherm zichtbaar maakte.
- Fix: post-`goto` responsewait verwijderd; logout wacht op loginpagina en submitknop; mobiele logoutmock wist de mocksession; onnodige `networkidle`-wacht voor approve verwijderd; AUTH-H-003 bevat nu een vertraagde logoutregressie.
- Verificatie: MOB-H-003 Mobile Safari 10/10; Mobile Chrome 3/3; auth 6/6; volledige mobiele suite 8/8; `npm run check` geslaagd.
- GitHub CLI is lokaal niet aangemeld, dus de remote Actions-check is niet opnieuw uitgelezen.

## VRAAG AAN CODEX

Voer Fase 16 vanaf nu uit als één grote production-readiness sprint.

GEEN microstappen en niet na ieder klein onderdeel stoppen.

Werk zelfstandig alle Fase-16-punten af die:
- in code,
- terminal,
- configuratievoorbereiding,
- scripts,
- Playwright,
- documentatie,
- deployment tooling
kunnen worden uitgevoerd.

Bundel afhankelijk werk logisch samen.

Stop ALLEEN wanneer:
1. ik een externe instelling zelf moet uitvoeren;
2. een geheim/wachtwoord/token nodig is;
3. een bedrijfskeuze ontbreekt;
4. een destructieve productieactie nodig is;
5. echte e-mailverzending of go-live toestemming vereist.

BELANGRIJK:
Vraag mij niet steeds één gegeven tegelijk.

Maak eerst één geconsolideerde lijst met ALLE ontbrekende informatie die je van mij nodig hebt voor de resterende Fase-16-productieconfiguratie.

Voer vóór die vraag alvast alles uit wat zonder mij kan.

Neem in dezelfde sprint minimaal mee:
- SMTP relay implementatie en preflight
- productieconfig voorbereiden
- CORS/CSP/HSTS voorbereiden
- logging + logrotatie
- mailqueue cron
- uploads/PDF buiten webroot
- backup + restore tooling
- demo-data/productieguards
- productieaccounts-flow
- release/go-live runbook
- rollbackrunbook
- productie-smoke/acceptatietests
- Stasjo juli 2026 / 144 uur acceptatiedataset
- broker + boekhouder + EasySalary routing
- volledige relevante regressie
- checklist/Living Docs synchronisatie

Testdata:
Stasjo van Bakel
joycesteenhoven@gmail.com
juli 2026
144 uur

Mail:
From: backoffice@pathconsultancy.nl
Broker: rana.ramjanam@pathconsultancy.nl
Boekhouder: giovanno.maatsen@pathconsultancy.nl
Salarisadmin: gambitizanagi@gmail.com

Routing:
Broker = factuur + klanturenstaat
Boekhouder = factuur
Salarisadmin = alleen naam/maand/144 uur, 0 bijlagen

Facturerende onderneming:
Path Consultancy B.V.

AANVULLENDE UITVOERINGSREGEL:

Werk Bundel 1 volledig zelfstandig af.

Stop NIET voor:
- kleine bugs
- ontbrekende tests
- documentatieverschillen
- configuratievelden die veilig met placeholders kunnen worden voorbereid
- refactors die noodzakelijk zijn om deze Fase-16-scope correct af te ronden

Los die zelfstandig op en ga verder.

Maak onderscheid tussen:
A. technisch voorbereid
B. lokaal aantoonbaar getest
C. extern/productie nog uit te voeren

Markeer een extern afhankelijk punt NIET als volledig uitgevoerd alleen omdat de code ervoor klaarstaat.

Voor onderdelen die TransIP nodig hebben:
- bouw/configureer de applicatiekant volledig;
- documenteer exact welke productie-instelling nodig is;
- verzamel AL die externe handelingen in één eindlijst voor Bundel 2.

Voor SMTP:
- smtp-relay.gmail.com
- poort 587
- STARTTLS verplicht
- IP-gebaseerde relay
- geen username/password
- From backoffice@pathconsultancy.nl
- mail.enabled blijft false
- nog geen netwerkverzending naar echte ontvangers

Voor HSTS:
alleen voorbereiden; niet activeren voordat HTTPS op productie aantoonbaar correct is.

Voor backup/restore:
tooling nu bouwen en non-destructief testen;
geen productie-database terugzetten of overschrijven.

Aan het einde van Bundel 1 wil ik één eindrapport:
1. alles technisch afgerond
2. alles lokaal getest
3. exacte regressieresultaten
4. commit(s) en push
5. pipeline-status
6. alle nog benodigde externe acties in ÉÉN geconsolideerde Bundel-2-lijst
7. alle gegevens/keuzes die je nog van mij nodig hebt in ÉÉN keer
8. voorstel voor de volledige Bundel-3 productieacceptatierun

Geen microvragen tussendoor tenzij je werkelijk geblokkeerd bent.

Nog GEEN echte mail verzenden.
Nog GEEN productie-go-live.
Geen secrets in Git/logs/docs.

### 2026-08-12 21:40 · Codex

- Taak: Fase-16 Bundel 1 volledig technisch voorbereiden en lokaal bewijzen; nog geen echte mail,
  productie-go-live of HSTS-activatie.
- Resultaat: Google Workspace SMTP Relay is fail-closed voorbereid op
  `smtp-relay.gmail.com:587` met verplichte STARTTLS, certificaatcontrole, IP-verificatie en zonder
  gebruikersnaam/wachtwoord. De brokerbundel vereist factuur + klanturenstaat, de boekhouder krijgt
  alleen de factuur en salarisadministratie alleen naam/periode/uren zonder bijlage.
- Operationeel: private storage, atomische mailclaim, offline mailpreflight, productiepreflight,
  database-back-up/herstel, logrotatie, accountprovisioning, eigen wachtwoordwijziging en het
  go-live/rollbackrunbook zijn toegevoegd. Alle gevaarlijke handelingen zijn standaard check/dry-run.
- Regressiefixes: `LoginPage.open()` verspilt geen 20 seconden meer aan een gemiste response;
  logout wacht op de zichtbare login-postconditie; de E2E-runner normaliseert `localhost` naar zijn
  beheerde IPv4-server en lokale/stage-env-bestanden overschrijven expliciete CI-variabelen niet.
  DASH-N-007 vergelijkt alle tellerwaarden atomisch met de concrete zichtbare taakregels.
- Lokaal bewijs: gerichte auth/mail/password/securityset 39/39 groen; DASH-N-007 groen;
  `npm run ci:local` groen (build, smoke, operationele preflights, DB-H-001 en 0 dependency-
  vulnerabilities); volledige `npm run test:e2e` 148/148 groen. Living Docs: 144 Playwright-cases
  + 1 DB-case = 145 unieke cases en 148 uitvoeringen.
- Veiligheidsstatus: `mail.enabled=false`; offline mailpreflight meldde 0 netwerkverbindingen en
  0 databasewrites; HSTS blijft voorbereid maar uit; geen productiegegevens, secrets of echte mails
  gebruikt.
- Volgende stap: scope-/secret-audit, commit en push naar `main`, daarna de Release Pipeline voor de
  exacte commit volgen. Externe Bundel 2 en productieacceptatie Bundel 3 blijven afzonderlijke gates.
